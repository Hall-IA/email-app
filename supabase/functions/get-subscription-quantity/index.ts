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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: getUserError } = await supabaseClient.auth.getUser();

    if (getUserError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subscription_id } = await req.json();

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ error: 'Missing subscription_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que la subscription appartient à l'utilisateur
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userSub } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('user_id, subscription_type')
      .eq('subscription_id', subscription_id)
      .maybeSingle();

    if (!userSub || userSub.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si c'est un slot artificiel (créé par le webhook), retourner 1 directement
    // Les slots ont un subscription_id avec "_slot_" dedans
    if (subscription_id.includes('_slot_')) {
      console.log(`[GET-SUBSCRIPTION-QUANTITY] Slot artificiel détecté: ${subscription_id}, retour de 1`);
      return new Response(
        JSON.stringify({ 
          subscription_id,
          quantity: 1, // Chaque slot = 1 email payé
          subscription_type: userSub.subscription_type
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pour les vraies subscriptions Stripe, récupérer depuis Stripe
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(subscription_id, {
      expand: ['items'],
    });
    } catch (error: any) {
      console.error(`[GET-SUBSCRIPTION-QUANTITY] Erreur lors de la récupération depuis Stripe:`, error);
      // Si la subscription n'existe pas dans Stripe, retourner 1 par défaut
      return new Response(
        JSON.stringify({ 
          subscription_id,
          quantity: 1,
          subscription_type: userSub.subscription_type
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const additionalAccountPriceId = Deno.env.get('STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID');
    
    let quantity = 0;

    // Si c'est une subscription additionnelle, récupérer la quantité du line item correspondant
    if (userSub.subscription_type === 'additional_account' && additionalAccountPriceId) {
      const additionalItem = subscription.items.data.find(
        item => item.price.id === additionalAccountPriceId
      );
      quantity = additionalItem?.quantity || 0;
    } else {
      // Pour les autres types, retourner la quantité du premier item
      quantity = subscription.items.data[0]?.quantity || 1;
    }

    return new Response(
      JSON.stringify({ 
        subscription_id,
        quantity,
        subscription_type: userSub.subscription_type
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Get subscription quantity error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

