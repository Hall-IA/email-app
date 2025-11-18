# 🚀 Déploiement rapide sur Netlify

## ✅ État actuel

- ✅ Netlify CLI est installé
- ✅ Vous êtes connecté à Netlify (souad@hallia.ai)
- ⏳ Le projet doit être initialisé

## 📝 Instructions rapides

### Option A : Via l'interface web (Plus simple)

1. **Allez sur** [app.netlify.com](https://app.netlify.com)
2. **Cliquez sur** "Add new site" > "Import an existing project"
3. **Sélectionnez** GitHub et choisissez le repository `email-app`
4. **Configurez** :
   - Build command: `npm run build`
   - Publish directory: `.next` (ou laissez vide)
5. **Ajoutez les variables d'environnement** :
   ```
   NEXT_PUBLIC_SUPABASE_URL = votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY = votre_clé_anon
   NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID = votre_price_id (si utilisé)
   ```
6. **Cliquez sur** "Deploy site"

### Option B : Via la ligne de commande

Exécutez ces commandes dans le terminal :

```bash
cd /home/souad/hallia/bolt-application/email/tri-automatique-email

# Initialiser le projet (répondez aux questions)
netlify init

# Lors des questions :
# - "Create & configure a new project" : Oui
# - "Team" : hallia
# - "Site name" : (laissez vide ou donnez un nom)
# - "Build command" : npm run build
# - "Publish directory" : .next (ou laissez vide)

# Configurer les variables d'environnement
netlify env:set NEXT_PUBLIC_SUPABASE_URL "votre_url_supabase"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "votre_clé_anon"
netlify env:set NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID "votre_price_id"

# Déployer en production
netlify deploy --prod
```

## 🔑 Où trouver vos variables d'environnement ?

### Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans "Settings" > "API"
4. Copiez :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Stripe (si utilisé)
1. Allez sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Allez dans "Products" > "Pricing"
3. Copiez le **Price ID** → `NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID`

## 🎯 Après le déploiement

Une fois déployé, vous obtiendrez une URL comme : `votre-app.netlify.app`

Testez :
- ✅ La page d'accueil se charge
- ✅ L'authentification fonctionne
- ✅ La connexion à Supabase fonctionne

## 📞 Besoin d'aide ?

Consultez le guide complet : `DEPLOY_NETLIFY.md`

