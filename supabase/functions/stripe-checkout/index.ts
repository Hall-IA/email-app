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

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('🚀 [STRIPE-CHECKOUT] Début de la fonction - Method:', req.method);
  
  try {
    if (req.method === 'OPTIONS') {
      console.log('✅ [STRIPE-CHECKOUT] OPTIONS request - CORS preflight');
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      console.error('❌ [STRIPE-CHECKOUT] Method not allowed:', req.method);
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    console.log('📥 [STRIPE-CHECKOUT] Parsing request body...');
    const { price_id, success_url, cancel_url, mode, additional_account_price_id, additional_accounts } = await req.json();

    console.log('📥 [STRIPE-CHECKOUT] Données reçues:', {
      price_id,
      additional_account_price_id,
      additional_accounts: additional_accounts ?? 'undefined',
      mode,
      success_url,
      cancel_url
    });

    console.log('🔍 [STRIPE-CHECKOUT] Validation des paramètres...');
    const error = validateParameters(
      { price_id, success_url, cancel_url, mode },
      {
        cancel_url: 'string',
        price_id: 'string',
        success_url: 'string',
        mode: { values: ['payment', 'subscription'] },
      },
    );

    if (error) {
      console.error('❌ [STRIPE-CHECKOUT] Erreur de validation:', error);
      return corsResponse({ error }, 400);
    }
    console.log('✅ [STRIPE-CHECKOUT] Paramètres validés');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [STRIPE-CHECKOUT] Missing authorization header');
      return corsResponse({ error: 'Missing authorization header' }, 401);
    }
    console.log('🔐 [STRIPE-CHECKOUT] Authorization header présent');

    console.log('👤 [STRIPE-CHECKOUT] Création du client Supabase...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('🔐 [STRIPE-CHECKOUT] Authentification de l\'utilisateur...');
    const {
      data: { user },
      error: getUserError,
    } = await supabaseClient.auth.getUser();

    if (getUserError) {
      console.error('❌ [STRIPE-CHECKOUT] Failed to authenticate user:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      console.error('❌ [STRIPE-CHECKOUT] User not found');
      return corsResponse({ error: 'User not found' }, 404);
    }
    
    console.log('✅ [STRIPE-CHECKOUT] Utilisateur authentifié:', {
      user_id: user.id,
      email: user.email
    });

    console.log('🔧 [STRIPE-CHECKOUT] Création du client Supabase Admin...');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📧 [STRIPE-CHECKOUT] Récupération de l\'email principal...');
    const { data: primaryEmail, error: primaryEmailError } = await supabaseAdmin
      .from('email_configurations')
      .select('email')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (primaryEmailError) {
      console.error('⚠️ [STRIPE-CHECKOUT] Erreur lors de la récupération de l\'email principal:', primaryEmailError);
    } else {
      console.log('📧 [STRIPE-CHECKOUT] Email principal:', primaryEmail?.email || 'Non trouvé');
    }

    console.log('💳 [STRIPE-CHECKOUT] Récupération du client Stripe...');
    const { data: customer, error: getCustomerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('❌ [STRIPE-CHECKOUT] Failed to fetch customer information from the database', getCustomerError);

      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    console.log('💳 [STRIPE-CHECKOUT] Customer existant:', customer ? `Oui (${customer.customer_id})` : 'Non');

    let customerId;

    if (!customer || !customer.customer_id) {
      console.log('🆕 [STRIPE-CHECKOUT] Création d\'un nouveau client Stripe...');
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      console.log(`✅ [STRIPE-CHECKOUT] Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      console.log('💾 [STRIPE-CHECKOUT] Sauvegarde du client en base de données...');
      const { error: createCustomerError, data: insertedCustomer } = await supabaseAdmin.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      }).select();

      if (createCustomerError) {
        console.error('❌ [STRIPE-CHECKOUT] Failed to save customer information in the database', createCustomerError);

        try {
          console.log('🧹 [STRIPE-CHECKOUT] Nettoyage du client Stripe créé...');
          await stripe.customers.del(newCustomer.id);
          await supabaseAdmin.from('stripe_subscriptions').delete().eq('customer_id', newCustomer.id);
        } catch (deleteError) {
          console.error('❌ [STRIPE-CHECKOUT] Failed to clean up after customer mapping error:', deleteError);
        }

        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }
      console.log('✅ [STRIPE-CHECKOUT] Client sauvegardé en base:', insertedCustomer);

      if (mode === 'subscription') {
        console.log('📝 [STRIPE-CHECKOUT] Mode subscription - Création d\'un enregistrement de subscription...');
        const { error: createSubscriptionError, data: insertedSubscription } = await supabaseAdmin.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          user_id: user.id,
          status: 'not_started',
        }).select();

        if (createSubscriptionError) {
          console.error('❌ [STRIPE-CHECKOUT] Failed to save subscription in the database', createSubscriptionError);

          try {
            console.log('🧹 [STRIPE-CHECKOUT] Nettoyage du client Stripe après erreur...');
            await stripe.customers.del(newCustomer.id);
          } catch (deleteError) {
            console.error('❌ [STRIPE-CHECKOUT] Failed to delete Stripe customer after subscription creation error:', deleteError);
          }

          return corsResponse({ error: 'Unable to save the subscription in the database' }, 500);
        }
        console.log('✅ [STRIPE-CHECKOUT] Subscription sauvegardée en base:', insertedSubscription);
      }

      customerId = newCustomer.id;

      console.log(`✅ [STRIPE-CHECKOUT] Successfully set up new customer ${customerId} with subscription record`);
    } else {
      customerId = customer.customer_id;
      console.log(`✅ [STRIPE-CHECKOUT] Utilisation du client existant: ${customerId}`);

      if (mode === 'subscription') {
        console.log('📝 [STRIPE-CHECKOUT] Mode subscription - Vérification de la subscription existante...');
        const { data: subscription, error: getSubscriptionError } = await supabaseAdmin
          .from('stripe_subscriptions')
          .select('id, status, subscription_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('❌ [STRIPE-CHECKOUT] Failed to fetch subscription information from the database', getSubscriptionError);

          return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
        }

        if (!subscription) {
          console.log('📝 [STRIPE-CHECKOUT] Aucune subscription trouvée - Création d\'un nouvel enregistrement...');
          const { error: createSubscriptionError, data: insertedSubscription } = await supabaseAdmin.from('stripe_subscriptions').insert({
            customer_id: customerId,
            user_id: user.id,
            status: 'not_started',
          }).select();

          if (createSubscriptionError) {
            console.error('❌ [STRIPE-CHECKOUT] Failed to create subscription record for existing customer', createSubscriptionError);

            return corsResponse({ error: 'Failed to create subscription record for existing customer' }, 500);
          }
          console.log('✅ [STRIPE-CHECKOUT] Subscription créée:', insertedSubscription);
        } else {
          console.log('✅ [STRIPE-CHECKOUT] Subscription existante trouvée:', {
            id: subscription.id,
            status: subscription.status,
            subscription_id: subscription.subscription_id
          });
        }
      }
    }

    console.log('📧 [STRIPE-CHECKOUT] Récupération des comptes email configurés...');
    const { data: emailAccounts, error: emailAccountsError } = await supabaseAdmin
      .from('email_configurations')
      .select('email, is_primary')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (emailAccountsError) {
      console.error('⚠️ [STRIPE-CHECKOUT] Erreur lors de la récupération des emails:', emailAccountsError);
    } else {
      console.log('📧 [STRIPE-CHECKOUT] Comptes email trouvés:', emailAccounts?.length || 0, emailAccounts);
    }

    const primaryEmailAddress = emailAccounts?.find(e => e.is_primary)?.email || user.email || '';
    const additionalEmails = emailAccounts?.filter(e => !e.is_primary).map(e => e.email) || [];

    console.log('📧 [STRIPE-CHECKOUT] Emails configurés:', {
      primary: primaryEmailAddress,
      additional: additionalEmails,
      total: emailAccounts?.length || 0
    });

    console.log('🛒 [STRIPE-CHECKOUT] Construction des line items...');
    const lineItems = [
      {
        price: price_id,
        quantity: 1,
      },
    ];

    if (additional_account_price_id && additional_accounts && additional_accounts > 0) {
      console.log(`➕ [STRIPE-CHECKOUT] Ajout de ${additional_accounts} email(s) additionnel(s) au prix ${additional_account_price_id}`);
      lineItems.push({
        price: additional_account_price_id,
        quantity: additional_accounts,
      });
    } else {
      console.log('⚠️ [STRIPE-CHECKOUT] Pas d\'emails additionnels:', {
        has_price_id: !!additional_account_price_id,
        count: additional_accounts,
        additional_accounts_type: typeof additional_accounts
      });
    }

    console.log('🛒 [STRIPE-CHECKOUT] Line items finaux:', JSON.stringify(lineItems, null, 2));

    console.log('💳 [STRIPE-CHECKOUT] Création de la session Stripe Checkout...');
    const sessionConfig = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode,
      success_url,
      cancel_url,
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      tax_id_collection: {
        enabled: true,
      },
      billing_address_collection: 'required',
      automatic_tax: {
        enabled: true,
      },
      subscription_data: mode === 'subscription' ? {
        metadata: {
          user_id: user.id,
          primary_email: primaryEmailAddress,
          additional_emails: additionalEmails.join(', '),
          total_accounts: emailAccounts?.length || 0,
        },
        description: primaryEmailAddress ? `Plan Premier - ${primaryEmailAddress}${additionalEmails.length > 0 ? ` + ${additionalEmails.length} compte(s) supplémentaire(s): ${additionalEmails.join(', ')}` : ''}` : undefined,
      } : undefined,
    };
    
    console.log('🔧 [STRIPE-CHECKOUT] Configuration de la session:', JSON.stringify({
      ...sessionConfig,
      subscription_data: sessionConfig.subscription_data ? 'present' : undefined
    }, null, 2));

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`✅ [STRIPE-CHECKOUT] Session créée avec succès:`, {
      session_id: session.id,
      customer_id: customerId,
      mode: mode,
      url: session.url,
      amount_total: session.amount_total,
      currency: session.currency
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ [STRIPE-CHECKOUT] Fonction terminée en ${duration}ms`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [STRIPE-CHECKOUT] Checkout error après ${duration}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return corsResponse({ error: error.message }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}
