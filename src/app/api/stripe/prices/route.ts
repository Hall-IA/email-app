import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { parse } from 'cookie';

/**
 * API pour récupérer les prix Stripe
 * Compatible avec l'ancienne API Supabase get-stripe-prices
 */
export async function GET(request: NextRequest) {
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

    // Si Stripe n'est pas configuré, retourner des prix par défaut
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('[Stripe] Non configuré - retour de prix par défaut');
      return NextResponse.json({
        basePlan: {
          amount: 99,
          currency: 'EUR',
          interval: 'month'
        },
        additionalAccount: {
          amount: 39,
          currency: 'EUR',
          interval: 'month'
        }
      }, { status: 200 });
    }

    // TODO: Implémenter la vraie logique Stripe ici quand nécessaire
    // Pour l'instant, retourner des prix par défaut
    return NextResponse.json({
      basePlan: {
        amount: 99,
        currency: 'EUR',
        interval: 'month'
      },
      additionalAccount: {
        amount: 39,
        currency: 'EUR',
        interval: 'month'
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Stripe prices API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

