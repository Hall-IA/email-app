import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerId = customer.customer_id;

    console.info(`Force syncing subscriptions for customer: ${customerId}`);

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    console.info(`Found ${subscriptions.data.length} subscriptions`);

    if (subscriptions.data.length === 0) {
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          user_id: user.id,
          status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status');
      }

      return new Response(JSON.stringify({ message: 'No subscriptions found', synced: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const premierPriceId = Deno.env.get('STRIPE_PRICE_ID');
    const additionalAccountPriceId = Deno.env.get('STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID');

    for (const subscription of subscriptions.data) {
      const firstPriceId = subscription.items.data[0]?.price.id;

      let subscriptionType = 'premier';
      if (subscription.metadata?.type === 'additional_account' || firstPriceId === additionalAccountPriceId) {
        subscriptionType = 'additional_account';
      }

      console.info(`Syncing subscription ${subscription.id} of type ${subscriptionType}`);

      let emailConfigId = subscription.metadata?.email_configuration_id || null;

      if (!emailConfigId) {
        if (subscriptionType === 'premier') {
          const { data: primaryConfig } = await supabase
            .from('email_configurations')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_primary', true)
            .maybeSingle();

          emailConfigId = primaryConfig?.id || null;
          console.info(`Auto-linked premier subscription to primary email config: ${emailConfigId}`);
        } else {
          const { data: unlinkedConfig } = await supabase
            .from('email_configurations')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_primary', false)
            .not('id', 'in', `(SELECT email_configuration_id FROM stripe_user_subscriptions WHERE user_id = '${user.id}' AND email_configuration_id IS NOT NULL)`)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          emailConfigId = unlinkedConfig?.id || null;
          console.info(`Auto-linked additional subscription to email config: ${emailConfigId}`);
        }
      }

      const { error: multiSubError } = await supabase.from('stripe_user_subscriptions').upsert(
        {
          user_id: user.id,
          customer_id: customerId,
          subscription_id: subscription.id,
          subscription_type: subscriptionType,
          status: subscription.status,
          price_id: firstPriceId,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          email_configuration_id: emailConfigId,
          ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
            ? {
                payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
                payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
              }
            : {}),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'subscription_id',
        },
      );

      if (multiSubError) {
        console.error(`Error syncing subscription ${subscription.id}:`, multiSubError);
      } else {
        console.info(`Successfully synced subscription ${subscription.id} with email_config: ${emailConfigId}`);
      }
    }

    const premierSubscription = subscriptions.data.find(sub => {
      const firstPriceId = sub.items.data[0]?.price.id;
      return sub.metadata?.type !== 'additional_account' && firstPriceId !== additionalAccountPriceId;
    }) || subscriptions.data[0];

    let additionalAccounts = 0;
    if (additionalAccountPriceId && premierSubscription) {
      const additionalAccountItem = premierSubscription.items.data.find(
        item => item.price.id === additionalAccountPriceId
      );
      if (additionalAccountItem) {
        additionalAccounts = additionalAccountItem.quantity || 0;
      }
    }

    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        user_id: user.id,
        subscription_id: premierSubscription.id,
        price_id: premierSubscription.items.data[0]?.price.id,
        current_period_start: premierSubscription.current_period_start,
        current_period_end: premierSubscription.current_period_end,
        cancel_at_period_end: premierSubscription.cancel_at_period_end,
        additional_accounts: additionalAccounts,
        ...(premierSubscription.default_payment_method && typeof premierSubscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: premierSubscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: premierSubscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: premierSubscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing legacy subscription table:', subError);
    }

    const isActive = premierSubscription.status === 'active' || premierSubscription.status === 'trialing';

    if (isActive) {
      await supabase
        .from('email_configurations')
        .update({ is_active: true })
        .eq('user_id', user.id)
        .eq('is_active', false);
    } else {
      await supabase
        .from('email_configurations')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);
    }

    // Créer les slots pour les comptes additionnels (même logique que dans le webhook)
    let slotsCreated = 0;
    if (additionalAccountPriceId && premierSubscription && isActive && additionalAccounts > 0) {
      console.info(`[STRIPE-FORCE-SYNC] Premier subscription has ${additionalAccounts} additional account(s) - Creating slots`);
      
      // Vérifier combien de slots existent déjà pour cet utilisateur (non liés)
      const { data: existingSlots } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_id')
        .eq('user_id', user.id)
        .eq('subscription_type', 'additional_account')
        .is('email_configuration_id', null)
        .in('status', ['active', 'trialing']);
      
      const existingSlotsCount = existingSlots?.length || 0;
      const slotsToCreate = additionalAccounts - existingSlotsCount;
      
      if (slotsToCreate > 0) {
        console.info(`[STRIPE-FORCE-SYNC] Creating ${slotsToCreate} additional account slot(s) for user ${user.id}`);
        
        // Créer des slots pour chaque compte additionnel non configuré
        for (let i = 0; i < slotsToCreate; i++) {
          const slotSubscriptionId = `${premierSubscription.id}_slot_${Date.now()}_${i}`;
          
          const slotData = {
            user_id: user.id,
            customer_id: customerId,
            subscription_id: slotSubscriptionId,
            subscription_type: 'additional_account',
            status: premierSubscription.status,
            price_id: additionalAccountPriceId,
            current_period_start: premierSubscription.current_period_start,
            current_period_end: premierSubscription.current_period_end,
            cancel_at_period_end: premierSubscription.cancel_at_period_end,
            email_configuration_id: null, // Slot non configuré
            ...(premierSubscription.default_payment_method && typeof premierSubscription.default_payment_method !== 'string'
              ? {
                  payment_method_brand: premierSubscription.default_payment_method.card?.brand ?? null,
                  payment_method_last4: premierSubscription.default_payment_method.card?.last4 ?? null,
                }
              : {}),
            updated_at: new Date().toISOString(),
          };
          
          const { error: slotError } = await supabase
            .from('stripe_user_subscriptions')
            .insert(slotData);
          
          if (slotError) {
            console.error(`[STRIPE-FORCE-SYNC] Error creating slot ${i + 1}:`, slotError);
          } else {
            console.info(`[STRIPE-FORCE-SYNC] Successfully created slot ${i + 1} with ID: ${slotSubscriptionId}`);
            slotsCreated++;
          }
        }
      } else {
        console.info(`[STRIPE-FORCE-SYNC] All ${additionalAccounts} slots already exist for user ${user.id}`);
      }
    }

    return new Response(JSON.stringify({
      message: 'Subscription synced successfully',
      synced: true,
      subscription: {
        id: premierSubscription.id,
        status: premierSubscription.status,
        cancel_at_period_end: premierSubscription.cancel_at_period_end,
      },
      additionalAccounts,
      slotsCreated,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error forcing sync:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});