# Migration de Supabase vers PostgreSQL

Ce document explique les changements effectués pour migrer de Supabase vers PostgreSQL local.

## Modifications effectuées

### 1. Nouvelles dépendances installées
- `pg` - Client PostgreSQL pour Node.js
- `jsonwebtoken` - Pour l'authentification JWT
- `bcryptjs` - Pour le hashage des mots de passe
- `cookie` - Pour la gestion des cookies
- `uuid` - Pour générer des identifiants uniques

### 2. Nouveaux fichiers créés

#### Configuration de la base de données
- `src/lib/db.ts` - Configuration de la connexion PostgreSQL
- `src/lib/auth.ts` - Système d'authentification avec JWT
- `src/lib/supabase-compat.ts` - Couche de compatibilité Supabase (côté serveur)
- `src/lib/supabase-compat-client.ts` - Couche de compatibilité Supabase (côté client)

#### API Routes
- `src/app/api/auth/signup/route.ts` - Inscription
- `src/app/api/auth/signin/route.ts` - Connexion
- `src/app/api/auth/signout/route.ts` - Déconnexion
- `src/app/api/auth/session/route.ts` - Récupération de la session
- `src/app/api/db/query/route.ts` - Route générique pour les requêtes DB

### 3. Fichiers modifiés
- `src/lib/supabase.ts` - Mise à jour pour utiliser la couche de compatibilité
- `context/AuthContext.tsx` - Mise à jour pour fonctionner avec le nouveau système d'auth

## Configuration requise

### Étape 1: Créer le fichier .env.local

Créez un fichier `.env.local` à la racine du projet avec le contenu suivant:

```env
# Configuration PostgreSQL
POSTGRES_HOST=172.17.0.2
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# JWT Secret (IMPORTANT: changez cette valeur en production!)
JWT_SECRET=votre-secret-jwt-tres-securise-changez-moi-en-production-12345

# Next.js
NODE_ENV=development
```

### Étape 2: Vérifier la base de données

1. Connectez-vous à votre base PostgreSQL:
```bash
psql -h 172.17.0.2 -U postgres -d postgres
```

2. Exécutez le script de vérification:
```bash
psql -h 172.17.0.2 -U postgres -d postgres -f src/lib/migrations-check.sql
```

Ce script vérifie que:
- La table `profiles` existe
- Les colonnes `password_hash` et `email_confirmed_at` sont présentes
- Toutes les autres tables sont bien migrées

### Étape 3: Tester l'application

```bash
npm run dev
```

Testez les fonctionnalités suivantes:
1. Inscription d'un nouvel utilisateur
2. Connexion
3. Accès au dashboard
4. Déconnexion

## Comment ça fonctionne

### Architecture

```
Client (Browser)
    ↓
API Routes (/api/auth/*, /api/db/query)
    ↓
PostgreSQL Database (172.17.0.2:5432)
```

### Authentification

- Les mots de passe sont hashés avec `bcryptjs`
- Les sessions sont gérées avec des JWT stockés dans des cookies HTTP-only
- Les tokens expirent après 7 jours

### Requêtes de base de données

Le code existant utilisant `supabase.from()` fonctionne toujours grâce à la couche de compatibilité:

**Côté client** (components avec 'use client'):
```typescript
// Ce code fait maintenant un appel à /api/db/query
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);
```

**Côté serveur** (API routes, Server Components):
```typescript
// Ce code se connecte directement à PostgreSQL
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);
```

## Différences avec Supabase

### Ce qui fonctionne différemment

1. **Confirmation d'email**: Avec PostgreSQL, les utilisateurs sont automatiquement confirmés lors de l'inscription (pas besoin de vérifier l'email)

2. **Row Level Security (RLS)**: PostgreSQL ne gère pas automatiquement le RLS comme Supabase. Vous devez vérifier les permissions manuellement dans vos API routes.

3. **Real-time subscriptions**: Non supportées. Si vous utilisez `supabase.channel()` ou `.on()`, vous devrez implémenter une solution alternative (WebSockets, polling, etc.)

4. **Storage**: Si vous utilisiez Supabase Storage, vous devrez utiliser une alternative (AWS S3, Cloudinary, etc.)

### Recommandations de sécurité

1. **Changez le JWT_SECRET**: En production, utilisez une valeur aléatoire et sécurisée
2. **Vérifiez les permissions**: Dans chaque API route, vérifiez que l'utilisateur a le droit d'accéder aux données
3. **Utilisez HTTPS**: En production, assurez-vous d'utiliser HTTPS pour protéger les cookies
4. **Limitez l'accès à PostgreSQL**: Le serveur PostgreSQL ne doit PAS être accessible depuis Internet

## Dépannage

### Erreur de connexion à la base de données

Si vous voyez des erreurs comme "ECONNREFUSED" ou "Connection timeout":

1. Vérifiez que PostgreSQL est démarré
2. Vérifiez l'adresse IP et le port dans `.env.local`
3. Vérifiez les credentials (username/password)

```bash
# Tester la connexion
psql -h 172.17.0.2 -p 5432 -U postgres -d postgres
```

### Erreurs d'authentification

Si la connexion/inscription ne fonctionne pas:

1. Vérifiez que la table `profiles` a la colonne `password_hash`
2. Vérifiez les logs du serveur Next.js
3. Vérifiez que le JWT_SECRET est bien défini

### Requêtes qui ne fonctionnent pas

Si certaines requêtes échouent:

1. Vérifiez que toutes les tables et colonnes existent dans PostgreSQL
2. Consultez les logs du serveur pour voir les erreurs SQL exactes
3. Utilisez la route `/api/db/query` pour déboguer les requêtes

## Prochaines étapes

1. **Implémenter Row Level Security**: Ajoutez des vérifications de permissions dans vos API routes
2. **Optimiser les requêtes**: Ajoutez des index sur les colonnes fréquemment utilisées
3. **Monitoring**: Mettez en place un système de monitoring pour PostgreSQL
4. **Backup**: Configurez des sauvegardes régulières de la base de données

## Support

Si vous rencontrez des problèmes, vérifiez:
1. Les logs du serveur Next.js (`npm run dev`)
2. Les logs PostgreSQL
3. Les erreurs dans la console du navigateur (F12)

