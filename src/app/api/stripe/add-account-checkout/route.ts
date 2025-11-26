import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { parse } from 'cookie';
import Stripe from 'stripe';

/**
 * API pour créer une session de checkout Stripe pour ajouter des comptes supplémentaires
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.auth_token;

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const result = await getUserFromToken(token);
    if (result.error || !result.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = result.user;

    // Vérifier la configuration Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('[Stripe] STRIPE_SECRET_KEY non configuré');
      return NextResponse.json(
        { 
          error: 'Stripe n\'est pas configuré',
          details: 'Veuillez ajouter STRIPE_SECRET_KEY dans votre fichier .env.local. Consultez STRIPE_SETUP.md pour plus d\'informations.'
        },
        { status: 503 }
      );
    }

    const additionalAccountPriceId = process.env.STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID;

    if (!additionalAccountPriceId) {
      console.error('[Stripe] STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID non configuré');
      return NextResponse.json(
        { 
          error: 'Configuration Stripe incomplète',
          details: 'Veuillez ajouter STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID dans votre fichier .env.local. Consultez STRIPE_SETUP.md pour créer un prix sur Stripe.'
        },
        { status: 500 }
      );
    }

    // Initialiser Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });

    // Récupérer le customer_id depuis la base de données
    const customerResult = await query(
      'SELECT customer_id FROM stripe_customers WHERE user_id = $1 AND deleted_at IS NULL',
      [user.id]
    );

    if (customerResult.rows.length === 0) {
      console.error('[Stripe] Aucun client Stripe trouvé pour l\'utilisateur:', user.id);
      return NextResponse.json(
        { error: 'Aucun compte client Stripe trouvé. Veuillez d\'abord souscrire à un plan de base.' },
        { status: 404 }
      );
    }

    const customerId = customerResult.rows[0].customer_id;

    // Récupérer les données de la requête
    const body = await request.json();
    const { additional_accounts = 1, success_url, cancel_url } = body;

    console.log('[Stripe] Création de session de checkout pour', additional_accounts, 'compte(s) supplémentaire(s)');

    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: additionalAccountPriceId,
          quantity: additional_accounts,
        },
      ],
      success_url: success_url || `${request.headers.get('origin')}/settings?upgrade=success`,
      cancel_url: cancel_url || `${request.headers.get('origin')}/settings?upgrade=cancelled`,
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
      subscription_data: {
        metadata: {
          type: 'additional_account',
          user_id: user.id,
          additional_accounts: additional_accounts.toString(),
        },
      },
    });

    console.log('[Stripe] Session créée:', session.id);

    return NextResponse.json(
      {
        sessionId: session.id,
        url: session.url,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Stripe] Erreur création checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

