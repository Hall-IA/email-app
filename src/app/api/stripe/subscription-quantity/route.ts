import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { parse } from 'cookie';
import Stripe from 'stripe';

/**
 * API pour récupérer la quantité d'une subscription Stripe
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.auth_token;

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const result = await getUserFromToken(token);
    if (result.error || !result.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = result.user;

    // Récupérer le subscription_id du body
    const body = await request.json();
    const { subscription_id } = body;

    if (!subscription_id) {
      return NextResponse.json(
        { error: 'subscription_id manquant' },
        { status: 400 }
      );
    }

    // Vérifier que la subscription appartient à l'utilisateur
    const subResult = await query(
      `SELECT user_id, subscription_type 
       FROM stripe_user_subscriptions 
       WHERE subscription_id = $1 AND deleted_at IS NULL`,
      [subscription_id]
    );

    if (subResult.rows.length === 0 || subResult.rows[0].user_id !== user.id) {
      return NextResponse.json(
        { error: 'Subscription non trouvée ou accès refusé' },
        { status: 404 }
      );
    }

    const userSub = subResult.rows[0];

    // Si c'est un slot artificiel (créé par le webhook), retourner 1 directement
    if (subscription_id.includes('_slot_')) {
      console.log(`[Subscription Quantity] Slot artificiel: ${subscription_id}`);
      return NextResponse.json({
        subscription_id,
        quantity: 1,
        subscription_type: userSub.subscription_type
      });
    }

    // Si Stripe n'est pas configuré, retourner 1 par défaut
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('[Stripe] Non configuré - retour de quantité par défaut');
      return NextResponse.json({
        subscription_id,
        quantity: 1,
        subscription_type: userSub.subscription_type
      });
    }

    // Initialiser Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });

    // Récupérer la subscription depuis Stripe
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(subscription_id, {
        expand: ['items'],
      });
    } catch (error: any) {
      console.error('[Subscription Quantity] Erreur Stripe:', error.message);
      // Si la subscription n'existe pas dans Stripe, retourner 1 par défaut
      return NextResponse.json({
        subscription_id,
        quantity: 1,
        subscription_type: userSub.subscription_type
      });
    }

    const additionalAccountPriceId = process.env.STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID;
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

    return NextResponse.json({
      subscription_id,
      quantity,
      subscription_type: userSub.subscription_type
    });

  } catch (error: any) {
    console.error('[Subscription Quantity] Erreur:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

