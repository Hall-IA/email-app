# Configuration des secrets Supabase Edge Functions

## ⚠️ Important

Les **Supabase Edge Functions** n'utilisent **PAS** les variables d'environnement de ton fichier `.env` local. Elles utilisent des **secrets Supabase** qui doivent être configurés séparément.

## 🔑 Secrets nécessaires

Voici tous les secrets que les fonctions Supabase utilisent :

1. **STRIPE_SECRET_KEY** - Clé secrète Stripe (sk_...)
2. **STRIPE_WEBHOOK_SECRET** - Secret du webhook Stripe (whsec_...)
3. **STRIPE_PRICE_ID** - ID du prix du plan de base
4. **STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID** - ID du prix des comptes additionnels
5. **SUPABASE_URL** - URL de ton projet Supabase
6. **SUPABASE_SERVICE_ROLE_KEY** - Clé service role de Supabase
7. **SUPABASE_ANON_KEY** - Clé anonyme de Supabase
8. **MICROSOFT_CLIENT_ID** - Client ID Microsoft (pour Outlook OAuth)
9. **MICROSOFT_CLIENT_SECRET** - Client Secret Microsoft (pour Outlook OAuth)
10. **MICROSOFT_TENANT_ID** - Tenant ID Microsoft (optionnel, défaut: "common")

## 🚀 Méthode 1 : Script automatique

1. Assure-toi que ton fichier `.env` contient toutes les variables nécessaires
2. Exécute le script :

```bash
./configure-supabase-secrets.sh
```

## 🚀 Méthode 2 : Configuration manuelle

### Étape 1 : Se connecter à Supabase

```bash
npx supabase login
```

### Étape 2 : Lier le projet

```bash
npx supabase link --project-ref bgvknwdjlrhzcitdfvwq
```

### Étape 3 : Configurer chaque secret

```bash
# Stripe
npx supabase secrets set STRIPE_SECRET_KEY=sk_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set STRIPE_PRICE_ID=price_...
npx supabase secrets set STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID=price_...

# Supabase
npx supabase secrets set SUPABASE_URL=https://bgvknwdjlrhzcitdfvwq.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
npx supabase secrets set SUPABASE_ANON_KEY=eyJ...

# Microsoft (si utilisé)
npx supabase secrets set MICROSOFT_CLIENT_ID=...
npx supabase secrets set MICROSOFT_CLIENT_SECRET=...
npx supabase secrets set MICROSOFT_TENANT_ID=common
```

### Étape 4 : Vérifier les secrets

```bash
npx supabase secrets list
```

## 📦 Déployer les fonctions

Après avoir configuré les secrets, déploie toutes les fonctions :

```bash
# Fonctions principales
npx supabase functions deploy stripe-checkout
npx supabase functions deploy stripe-webhook
npx supabase functions deploy stripe-cancel-subscription
npx supabase functions deploy stripe-force-sync
npx supabase functions deploy stripe-reactivate-subscription
npx supabase functions deploy stripe-download-invoice

# Fonctions OAuth
npx supabase functions deploy gmail-oauth-init
npx supabase functions deploy gmail-oauth-callback
npx supabase functions deploy outlook-oauth-init
npx supabase functions deploy outlook-oauth-callback

# Autres fonctions
npx supabase functions deploy delete-email-account
npx supabase functions deploy delete-user-account
npx supabase functions deploy verify-email-connection
npx supabase functions deploy get-stripe-prices
npx supabase functions deploy stripe-sync-invoices
```

## 🔍 Vérification

Pour vérifier qu'une fonction est bien déployée et fonctionne :

1. Va sur le dashboard Supabase : https://supabase.com/dashboard/project/bgvknwdjlrhzcitdfvwq/functions
2. Vérifie que toutes les fonctions sont listées
3. Teste une fonction depuis l'interface ou depuis ton application

## ⚠️ Erreurs courantes

### "Access token not provided"
- Solution : Exécute `npx supabase login`

### "Function not found" ou erreur CORS
- Solution : La fonction n'est pas déployée. Déploie-la avec `npx supabase functions deploy <nom-fonction>`

### "Secret not found"
- Solution : Le secret n'est pas configuré. Configure-le avec `npx supabase secrets set <NOM>=<valeur>`

## 📝 Notes

- Les secrets sont **spécifiques à chaque projet Supabase**
- Si tu changes de projet, tu dois reconfigurer tous les secrets
- Les secrets sont **sécurisés** et ne sont accessibles que par les Edge Functions
- Tu peux voir la liste des secrets configurés avec `npx supabase secrets list`

