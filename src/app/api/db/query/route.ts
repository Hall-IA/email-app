import { NextRequest, NextResponse } from 'next/server';
import { from } from '@/lib/supabase-server';
import { parse } from 'cookie';
import { getUserFromToken } from '@/lib/auth';

/**
 * Route API générique pour les requêtes de base de données
 * Cette route permet aux composants client de faire des requêtes à la base de données
 * en passant par le serveur pour des raisons de sécurité
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

    const { user, error: authError } = await getUserFromToken(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer les paramètres de la requête
    const body = await request.json();
    const { table, operation, data, filters, options } = body;

    if (!table || !operation) {
      return NextResponse.json(
        { error: 'Paramètres manquants: table et operation sont requis' },
        { status: 400 }
      );
    }

    // Construire la requête
    let query = from(table);

    // Appliquer l'opération
    switch (operation) {
      case 'select':
        query = query.select(options?.columns || '*', options);
        break;
      case 'insert':
        query = query.insert(data);
        break;
      case 'update':
        query = query.update(data);
        break;
      case 'delete':
        query = query.delete();
        break;
      default:
        return NextResponse.json({ error: 'Opération non supportée' }, { status: 400 });
    }

    // Appliquer les filtres
    if (filters && Array.isArray(filters)) {
      for (const filter of filters) {
        const { type, column, value } = filter;
        switch (type) {
          case 'eq':
            query = query.eq(column, value);
            break;
          case 'neq':
            query = query.neq(column, value);
            break;
          case 'gt':
            query = query.gt(column, value);
            break;
          case 'gte':
            query = query.gte(column, value);
            break;
          case 'lt':
            query = query.lt(column, value);
            break;
          case 'lte':
            query = query.lte(column, value);
            break;
          case 'is':
            query = query.is(column, value);
            break;
          case 'not':
            query = query.not(column, value.operator, value.value);
            break;
          case 'in':
            query = query.in(column, value);
            break;
        }
      }
    }

    // Appliquer les options supplémentaires
    if (options?.order) {
      query = query.order(options.order.column, options.order.options);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    // Exécuter la requête
    let result;
    if (options?.single) {
      result = await query.single();
    } else if (options?.maybeSingle) {
      result = await query.maybeSingle();
    } else {
      result = await query.then((res) => res);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Database query API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la requête' },
      { status: 500 }
    );
  }
}

