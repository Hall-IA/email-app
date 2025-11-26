import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { parse } from 'cookie';

/**
 * Route générique stub pour toutes les endpoints Stripe non implémentées
 * Retourne une réponse vide au lieu d'une erreur 404
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  try {
    const { endpoint } = params;
    
    // Vérifier l'authentification
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.auth_token;

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { user, error: authError } = await getUserFromToken(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    console.log(`[Stripe] Endpoint non implémenté: ${endpoint}`);

    // Si Stripe n'est pas configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Stripe non configuré. Cette fonctionnalité nécessite la configuration de Stripe.',
          message: 'Pour activer les paiements, ajoutez STRIPE_SECRET_KEY dans .env.local'
        },
        { status: 200 }
      );
    }

    // Retourner une réponse générique
    return NextResponse.json(
      { 
        success: false,
        error: `L'endpoint Stripe "${endpoint}" n'est pas encore implémenté.`,
        message: 'Cette fonctionnalité sera disponible prochainement.'
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Stripe API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  return POST(request, { params });
}

