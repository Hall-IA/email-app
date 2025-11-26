# Migration des Edge Functions vers API Routes - TODO

## ⚠️ État actuel

Votre application utilise encore **33+ appels aux Supabase Edge Functions** qui n'existent plus.

## ✅ Ce qui est fait:

1. **API d'authentification** - Complète ✅
   - `/api/auth/signin`
   - `/api/auth/signup`
   - `/api/auth/signout`
   - `/api/auth/session`
   - `/api/auth/update-user`
   - `/api/auth/reset-password`

2. **Gmail OAuth** - Partiel ⚠️
   - `/api/gmail/oauth-init` ✅ (créée)
   - `/api/gmail/oauth-callback` ❌ (à créer)

3. **Helper API** ✅
   - `src/lib/api-helper.ts` créé pour faciliter la migration

## ❌ Ce qui reste à faire:

### Gmail/Outlook OAuth
- [ ] `/api/gmail/oauth-callback` - Gérer le callback OAuth Gmail
- [ ] `/api/outlook/oauth-init` - Initialiser OAuth Outlook
- [ ] `/api/outlook/oauth-callback` - Gérer le callback OAuth Outlook
- [ ] `/api/email/verify-connection` - Vérifier la connexion email

### Stripe (Paiements)
- [ ] `/api/stripe/prices` - Obtenir les prix Stripe
- [ ] `/api/stripe/checkout` - Créer une session de paiement
- [ ] `/api/stripe/add-account-checkout` - Checkout pour compte additionnel
- [ ] `/api/stripe/cancel-subscription` - Annuler un abonnement
- [ ] `/api/stripe/reactivate-subscription` - Réactiver un abonnement
- [ ] `/api/stripe/update-subscription` - Mettre à jour un abonnement
- [ ] `/api/stripe/sync-invoices` - Synchroniser les factures
- [ ] `/api/stripe/force-sync` - Forcer la synchronisation
- [ ] `/api/stripe/download-invoice` - Télécharger une facture
- [ ] `/api/stripe/subscription-quantity` - Quantité d'abonnement

### Gestion des comptes
- [ ] `/api/email/delete-account` - Supprimer un compte email
- [ ] `/api/user/delete-account` - Supprimer un compte utilisateur

### Support
- [ ] `/api/support/send-ticket` - Envoyer un ticket au support

## 🚀 Solution temporaire

En attendant la migration complète, plusieurs options:

### Option 1: Désactiver les fonctionnalités non migrées

Dans les composants, ajoutez des messages d'erreur explicites:

```typescript
if (!process.env.GOOGLE_CLIENT_ID) {
  alert('Cette fonctionnalité nécessite la configuration de Google OAuth. Consultez CONFIGURATION_GMAIL_OAUTH.md');
  return;
}
```

### Option 2: Garder Supabase pour certaines fonctions

Si vous avez toujours accès à votre projet Supabase, ajoutez dans `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
```

Les appels existants fonctionneront alors.

### Option 3: Migration progressive

Migrez les fonctions une par une, en commençant par les plus utilisées:

1. **Gmail OAuth** (priorité haute - pour ajouter des comptes)
2. **Stripe** (priorité haute - pour les paiements)
3. **Email management** (priorité moyenne)
4. **Support** (priorité basse)

## 📝 Template pour créer une API route

```typescript
// src/app/api/[endpoint]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { parse } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
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

    // 2. Récupérer les données de la requête
    const body = await request.json();

    // 3. Logique métier ici
    // ... votre code ...

    // 4. Retourner la réponse
    return NextResponse.json({ success: true, data: {} }, { status: 200 });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
```

## 🔍 Trouver le code source des Edge Functions

Les Edge Functions originales sont dans:
```
supabase/functions/[nom-de-la-fonction]/index.ts
```

Vous pouvez les convertir en API routes Next.js.

## ⚡ Priorités recommandées

1. **Immediate** (bloquer l'utilisation):
   - Gmail OAuth (pour ajouter des comptes)
   - Stripe checkout (pour les paiements)

2. **Court terme** (1-2 semaines):
   - Gestion des abonnements Stripe
   - Vérification des connexions email

3. **Moyen terme** (1 mois):
   - Support
   - Gestion des comptes

## 💡 Besoin d'aide?

Contactez-moi pour migrer une fonction spécifique. Fournissez:
1. Le nom de la fonction
2. Le code source dans `supabase/functions/`
3. Quand vous en avez besoin

---

**Note**: La migration complète prendra du temps. Priorisez les fonctionnalités critiques.

