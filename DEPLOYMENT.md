# Guide de déploiement

Ce guide explique comment déployer l'application sur Vercel ou Netlify.

## Prérequis

1. Un compte GitHub/GitLab/Bitbucket avec le code source
2. Un compte Vercel ou Netlify
3. Un projet Supabase configuré
4. Les variables d'environnement nécessaires

## Variables d'environnement requises

Avant de déployer, vous devez configurer ces variables d'environnement :

- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme de votre projet Supabase
- `NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID` : ID du prix du plan de base Stripe (si utilisé)

## Option 1 : Déploiement sur Vercel (Recommandé pour Next.js)

### Étapes :

1. **Installer Vercel CLI** (optionnel, pour déploiement depuis la ligne de commande) :
   ```bash
   npm i -g vercel
   ```

2. **Déployer via l'interface web** :
   - Allez sur [vercel.com](https://vercel.com)
   - Connectez votre compte GitHub/GitLab/Bitbucket
   - Cliquez sur "New Project"
   - Importez votre repository
   - Configurez les variables d'environnement dans "Environment Variables"
   - Cliquez sur "Deploy"

3. **Déployer via CLI** :
   ```bash
   vercel
   ```
   Suivez les instructions et configurez les variables d'environnement.

### Configuration automatique

Vercel détecte automatiquement Next.js et configure le projet. Le fichier `vercel.json` est optionnel mais peut être utilisé pour des configurations spécifiques.

## Option 2 : Déploiement sur Netlify

### Étapes :

1. **Installer Netlify CLI** (optionnel) :
   ```bash
   npm i -g netlify-cli
   ```

2. **Déployer via l'interface web** :
   - Allez sur [netlify.com](https://netlify.com)
   - Connectez votre compte GitHub/GitLab/Bitbucket
   - Cliquez sur "Add new site" > "Import an existing project"
   - Sélectionnez votre repository
   - Configurez :
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Ajoutez les variables d'environnement dans "Site settings" > "Environment variables"
   - Cliquez sur "Deploy site"

3. **Déployer via CLI** :
   ```bash
   netlify init
   netlify deploy --prod
   ```

### Configuration

Le fichier `netlify.toml` est déjà configuré avec le plugin Next.js de Netlify.

## Déploiement des fonctions Supabase

Les fonctions Supabase Edge Functions doivent être déployées séparément sur Supabase :

1. **Installer Supabase CLI** :
   ```bash
   npm install -g supabase
   ```

2. **Se connecter à Supabase** :
   ```bash
   supabase login
   ```

3. **Lier le projet** :
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Déployer les fonctions** :
   ```bash
   supabase functions deploy
   ```

   Ou déployer une fonction spécifique :
   ```bash
   supabase functions deploy function-name
   ```

## Vérification post-déploiement

Après le déploiement, vérifiez :

1. ✅ L'application se charge correctement
2. ✅ La connexion à Supabase fonctionne
3. ✅ L'authentification fonctionne
4. ✅ Les fonctions Supabase sont accessibles
5. ✅ Les webhooks Stripe (si utilisés) pointent vers la bonne URL

## Notes importantes

- Les variables d'environnement avec le préfixe `NEXT_PUBLIC_` sont exposées au client
- Ne commitez jamais les fichiers `.env` contenant des secrets
- Les fonctions Supabase doivent être déployées séparément
- Vercel est généralement plus simple pour Next.js, mais Netlify fonctionne aussi très bien

## Support

En cas de problème, vérifiez :
- Les logs de déploiement dans Vercel/Netlify
- Les logs des fonctions dans Supabase
- La configuration des variables d'environnement

