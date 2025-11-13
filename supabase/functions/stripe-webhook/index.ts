import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  console.info(`Received webhook event: ${event.type}`);

  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
    return;
  }

  // Handle invoice payment succeeded - save invoice data
  if (event.type === 'invoice.payment_succeeded') {
    console.info(`Processing invoice payment for customer: ${customerId}`);
    await saveInvoice(event.data.object as Stripe.Invoice);
    await syncCustomerFromStripe(customerId);
    return;
  }

  // Handle subscription events
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted' ||
    event.type === 'invoice.payment_failed'
  ) {
    console.info(`Processing subscription event for customer: ${customerId}`);
    await syncCustomerFromStripe(customerId);
    return;
  }

  // Handle checkout session completed
  if (event.type === 'checkout.session.completed') {
    const { mode } = stripeData as Stripe.Checkout.Session;
    const isSubscription = mode === 'subscription';

    console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else {
      const { payment_status } = stripeData as Stripe.Checkout.Session;

      if (payment_status === 'paid') {
        try {
          const {
            id: checkout_session_id,
            payment_intent,
            amount_subtotal,
            amount_total,
            currency,
          } = stripeData as Stripe.Checkout.Session;

          const { error: orderError } = await supabase.from('stripe_orders').insert({
            checkout_session_id,
            payment_intent_id: payment_intent,
            customer_id: customerId,
            amount_subtotal,
            amount_total,
            currency,
            payment_status,
            status: 'completed',
          });

          if (orderError) {
            console.error('Error inserting order:', orderError);
            return;
          }
          console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
        } catch (error) {
          console.error('Error processing one-time payment:', error);
        }
      }
    }
  }
}

async function saveInvoice(invoice: Stripe.Invoice) {
  try {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

    if (!customerId) {
      console.error('No customer ID found in invoice');
      return;
    }

    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerError || !customer) {
      console.error('Failed to fetch customer from database:', customerError);
      return;
    }

    const userId = customer.user_id;

    const { error: invoiceError } = await supabase.from('stripe_invoices').upsert(
      {
        customer_id: customerId,
        invoice_id: invoice.id,
        subscription_id: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        invoice_pdf: invoice.invoice_pdf,
        invoice_number: invoice.number,
        status: invoice.status,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        paid_at: invoice.status_transitions?.paid_at,
        user_id: userId,
      },
      {
        onConflict: 'invoice_id',
      }
    );

    if (invoiceError) {
      console.error('Error saving invoice:', invoiceError);
      return;
    }

    console.info(`Successfully saved invoice ${invoice.id} for customer: ${customerId}`);
  } catch (error) {
    console.error('Error in saveInvoice:', error);
  }
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerError || !customer) {
      console.error('Failed to fetch customer from database:', customerError);
      throw new Error('Customer not found in database');
    }

    const userId = customer.user_id;

    console.info(`Fetching subscriptions for customer: ${customerId}`);

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    console.info(`Found ${subscriptions.data.length} subscriptions for customer: ${customerId}`);

    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          user_id: userId,
          status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
      return;
    }

    // Get price IDs from environment
    const premierPriceId = Deno.env.get('STRIPE_PRICE_ID');
    const additionalAccountPriceId = Deno.env.get('STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID');

    // Process all subscriptions
    for (const subscription of subscriptions.data) {
      const firstPriceId = subscription.items.data[0]?.price.id;

      // Determine subscription type based on metadata or price ID
      let subscriptionType = 'premier';
      if (subscription.metadata?.type === 'additional_account' || firstPriceId === additionalAccountPriceId) {
        subscriptionType = 'additional_account';
      }

      console.info(`Syncing subscription ${subscription.id} of type ${subscriptionType} for customer: ${customerId}`);

      // First, check if this subscription already exists and has an email_configuration_id
      const { data: existingSub } = await supabase
        .from('stripe_user_subscriptions')
        .select('email_configuration_id')
        .eq('subscription_id', subscription.id)
        .maybeSingle();

      let emailConfigId = existingSub?.email_configuration_id || null;

      // Only try to assign if there's no existing link
      if (!emailConfigId) {
        // Try to find email_configuration_id from metadata
        emailConfigId = subscription.metadata?.email_configuration_id || null;

        // If not in metadata, auto-assign based on type
        if (!emailConfigId) {
          if (subscriptionType === 'premier') {
            // Link to primary email account
            const { data: primaryConfig } = await supabase
              .from('email_configurations')
              .select('id')
              .eq('user_id', userId)
              .eq('is_primary', true)
              .maybeSingle();

            emailConfigId = primaryConfig?.id || null;
            console.info(`Auto-linked premier subscription to primary email config: ${emailConfigId}`);
          } else {
            // Link to first unlinked email account (not primary)
            const { data: allSecondaryConfigs } = await supabase
              .from('email_configurations')
              .select('id')
              .eq('user_id', userId)
              .eq('is_primary', false)
              .order('created_at', { ascending: true });

            if (allSecondaryConfigs && allSecondaryConfigs.length > 0) {
              // Get all linked config IDs (excluding current subscription to avoid conflict)
              const { data: linkedSubs } = await supabase
                .from('stripe_user_subscriptions')
                .select('email_configuration_id')
                .eq('user_id', userId)
                .not('email_configuration_id', 'is', null)
                .neq('subscription_id', subscription.id)
                .in('status', ['active', 'trialing']);

              const linkedConfigIds = new Set(linkedSubs?.map(s => s.email_configuration_id) || []);

              // Find first unlinked config
              const unlinkedConfig = allSecondaryConfigs.find(c => !linkedConfigIds.has(c.id));
              emailConfigId = unlinkedConfig?.id || null;
            }

            console.info(`Auto-linked additional subscription to email config: ${emailConfigId}`);
          }
        }
      } else {
        console.info(`Preserving existing email_configuration_id: ${emailConfigId} for subscription ${subscription.id}`);
      }

      // Save to new multi-subscription table
      const { error: multiSubError } = await supabase.from('stripe_user_subscriptions').upsert(
        {
          user_id: userId,
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
        console.info(`Successfully synced subscription ${subscription.id} of type ${subscriptionType}`);
      }
    }

    // Also update the old table for backward compatibility (use the first premier subscription)
    const premierSubscription = subscriptions.data.find(sub => {
      const firstPriceId = sub.items.data[0]?.price.id;
      return sub.metadata?.type !== 'additional_account' && firstPriceId !== additionalAccountPriceId;
    }) || subscriptions.data[0];

    // Calculate the number of additional accounts from ALL subscriptions
    let additionalAccounts = 0;
    if (additionalAccountPriceId) {
      // 1. Compter les line items additionnels dans la subscription premier
      if (premierSubscription) {
        const additionalAccountItem = premierSubscription.items.data.find(
          item => item.price.id === additionalAccountPriceId
        );
        if (additionalAccountItem) {
          additionalAccounts += additionalAccountItem.quantity || 0;
          console.info(`Found ${additionalAccountItem.quantity} additional accounts in premier subscription`);
        }
      }
      
      // 2. Compter TOUTES les subscriptions de type "additional_account"
      const additionalSubscriptions = subscriptions.data.filter(sub => {
        const firstPriceId = sub.items.data[0]?.price.id;
        return (sub.metadata?.type === 'additional_account' || firstPriceId === additionalAccountPriceId) 
               && ['active', 'trialing'].includes(sub.status);
      });
      
      console.info(`Found ${additionalSubscriptions.length} additional account subscriptions`);
      
      // Sommer les quantités de toutes les subscriptions additionnelles
      for (const sub of additionalSubscriptions) {
        const item = sub.items.data.find(item => item.price.id === additionalAccountPriceId);
        if (item) {
          additionalAccounts += item.quantity || 0;
          console.info(`Added ${item.quantity} accounts from subscription ${sub.id}`);
        }
      }
      
      console.info(`Total additional accounts calculated: ${additionalAccounts}`);
    }

    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        user_id: userId,
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

    // Update email accounts based on subscription status
    const isActive = premierSubscription.status === 'active' || premierSubscription.status === 'trialing';

    if (isActive) {
      console.info(`Reactivating all email accounts for user: ${userId}`);
      const { error: reactivateError } = await supabase
        .from('email_configurations')
        .update({ is_active: true })
        .eq('user_id', userId)
        .eq('is_active', false);

      if (reactivateError) {
        console.error('Error reactivating email accounts:', reactivateError);
      } else {
        console.info('Successfully reactivated all email accounts');
      }
    } else {
      console.info(`Deactivating additional email accounts for user: ${userId} (status: ${premierSubscription.status})`);
      const { error: deactivateError } = await supabase
        .from('email_configurations')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_primary', false)
        .eq('is_active', true);

      if (deactivateError) {
        console.error('Error deactivating additional email accounts:', deactivateError);
      } else {
        console.info('Successfully deactivated additional email accounts');
      }
    }

    console.info(`Successfully synced all subscriptions for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
