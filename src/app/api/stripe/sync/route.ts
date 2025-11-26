import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { parse } from 'cookie';
import Stripe from 'stripe';

/**
 * API pour synchroniser manuellement les subscriptions Stripe
 * Utile quand les webhooks ne sont pas configurés
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

    // Vérifier que Stripe est configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe n\'est pas configuré' },
        { status: 503 }
      );
    }

    // Initialiser Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });

    console.log('[Stripe Sync] Synchronisation manuelle pour l\'utilisateur:', user.id);

    // Récupérer le customer_id de l'utilisateur
    const customerResult = await query(
      'SELECT customer_id FROM stripe_customers WHERE user_id = $1 AND deleted_at IS NULL',
      [user.id]
    );

    console.log('[Stripe Sync] Résultat recherche customer:', {
      found: customerResult.rows.length,
      rows: customerResult.rows
    });

    let customerId: string;

    if (customerResult.rows.length === 0) {
      console.log('[Stripe Sync] Aucun customer_id trouvé, recherche dans Stripe...');
      
      // Chercher dans Stripe si un customer existe avec l'email de l'utilisateur
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        console.error('[Stripe Sync] Aucun customer trouvé dans Stripe pour:', user.email);
        return NextResponse.json(
          { 
            error: 'Aucun compte client Stripe trouvé',
            details: 'Aucun paiement n\'a encore été effectué. Veuillez d\'abord souscrire à un plan sur Stripe.'
          },
          { status: 404 }
        );
      }

      // Customer trouvé dans Stripe, créons-le dans notre DB
      customerId = customers.data[0].id;
      console.log('[Stripe Sync] Customer trouvé dans Stripe, création en DB:', customerId);

      await query(
        'INSERT INTO stripe_customers (user_id, customer_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        [user.id, customerId]
      );

      console.log('[Stripe Sync] ✅ Customer créé en DB');
    } else {
      customerId = customerResult.rows[0].customer_id;
    }
    console.log('[Stripe Sync] Customer ID:', customerId);

    // Récupérer toutes les subscriptions actives depuis Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      expand: ['data.default_payment_method'],
    });

    console.log('[Stripe Sync] Subscriptions trouvées:', subscriptions.data.length);

    let syncedCount = 0;
    const basePlanPriceId = process.env.STRIPE_BASE_PLAN_PRICE_ID;
    const additionalAccountPriceId = process.env.STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID;

    // Pour chaque subscription
    for (const subscription of subscriptions.data) {
      try {
        const firstPriceId = subscription.items.data[0]?.price.id;

        // Déterminer le type de subscription basé sur metadata ou price_id
        let subscriptionType = 'premier';
        if (subscription.metadata?.type === 'additional_account' || firstPriceId === additionalAccountPriceId) {
          subscriptionType = 'additional_account';
        }

        console.log('[Stripe Sync] Traitement subscription:', {
          id: subscription.id,
          type: subscriptionType,
          status: subscription.status,
          price_id: firstPriceId,
        });

        // Récupérer les informations de paiement depuis l'expansion
        let paymentMethodBrand = null;
        let paymentMethodLast4 = null;
        
        if (subscription.default_payment_method && typeof subscription.default_payment_method !== 'string') {
          paymentMethodBrand = subscription.default_payment_method.card?.brand || null;
          paymentMethodLast4 = subscription.default_payment_method.card?.last4 || null;
        }

        // Upsert dans la base de données
        await query(
          `INSERT INTO stripe_user_subscriptions 
           (user_id, customer_id, subscription_id, subscription_type, status, price_id, 
            current_period_start, current_period_end, cancel_at_period_end, 
            payment_method_brand, payment_method_last4, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           ON CONFLICT (subscription_id)
           DO UPDATE SET
             status = EXCLUDED.status,
             subscription_type = EXCLUDED.subscription_type,
             current_period_start = EXCLUDED.current_period_start,
             current_period_end = EXCLUDED.current_period_end,
             cancel_at_period_end = EXCLUDED.cancel_at_period_end,
             payment_method_brand = EXCLUDED.payment_method_brand,
             payment_method_last4 = EXCLUDED.payment_method_last4,
             updated_at = NOW()`,
          [
            user.id,
            customerId,
            subscription.id,
            subscriptionType,
            subscription.status,
            firstPriceId,
            subscription.current_period_start,
            subscription.current_period_end,
            subscription.cancel_at_period_end,
            paymentMethodBrand,
            paymentMethodLast4,
          ]
        );

        syncedCount++;
        console.log('[Stripe Sync] ✅ Subscription synchronisée:', {
          id: subscription.id,
          type: subscriptionType,
          status: subscription.status,
        });
      } catch (error) {
        console.error('[Stripe Sync] ❌ Erreur sync subscription:', subscription.id, error);
        // Continue avec les autres subscriptions même si une échoue
      }
    }

    // Récupérer les invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    console.log('[Stripe Sync] Factures trouvées:', invoices.data.length);

    let invoicesSyncedCount = 0;

    for (const invoice of invoices.data) {
      try {
        await query(
          `INSERT INTO stripe_invoices 
           (customer_id, invoice_id, subscription_id, amount_paid, currency, invoice_pdf, 
            invoice_number, status, period_start, period_end, paid_at, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
           ON CONFLICT (invoice_id)
           DO UPDATE SET
             status = EXCLUDED.status,
             amount_paid = EXCLUDED.amount_paid,
             invoice_pdf = EXCLUDED.invoice_pdf,
             paid_at = EXCLUDED.paid_at,
             updated_at = NOW()`,
          [
            customerId,
            invoice.id,
            typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id,
            invoice.amount_paid,
            invoice.currency,
            invoice.invoice_pdf,
            invoice.number,
            invoice.status,
            invoice.period_start,
            invoice.period_end,
            invoice.status_transitions?.paid_at,
            user.id,
          ]
        );

        invoicesSyncedCount++;
        console.log('[Stripe Sync] Facture synchronisée:', invoice.id);
      } catch (error) {
        console.error('[Stripe Sync] Erreur sync facture:', invoice.id, error);
        // Continue avec les autres factures même si une échoue
      }
    }

    console.log('[Stripe Sync] ✅ Synchronisation terminée:', {
      subscriptions: syncedCount,
      invoices: invoicesSyncedCount,
    });

    return NextResponse.json({
      success: true,
      message: 'Synchronisation réussie',
      data: {
        subscriptions: syncedCount,
        invoices: invoicesSyncedCount,
      },
    });

  } catch (error: any) {
    console.error('[Stripe Sync] Erreur:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

