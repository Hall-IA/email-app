# Configuration Stripe

Pour activer les fonctionnalités de paiement et d'abonnement, vous devez configurer Stripe.

## Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env.local` :

```env
# Clé secrète Stripe (trouvable sur https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...

# ID du prix pour un compte supplémentaire
# Créez un prix récurrent sur https://dashboard.stripe.com/products
# Exemple : 39€/mois pour un compte email supplémentaire
STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID=price_...

# Optionnel : ID du prix pour le plan de base
STRIPE_BASE_PLAN_PRICE_ID=price_...
```

## Étapes de configuration

### 1. Créer un compte Stripe

1. Allez sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Créez un compte (mode test pour commencer)

### 2. Récupérer la clé API secrète

1. Allez dans [Développeurs > Clés API](https://dashboard.stripe.com/apikeys)
2. Copiez la **Clé secrète** (commence par `sk_test_` en mode test)
3. Ajoutez-la dans `.env.local` comme `STRIPE_SECRET_KEY`

### 3. Créer les produits et prix

#### Produit : Compte Email Supplémentaire

1. Allez dans [Produits](https://dashboard.stripe.com/products)
2. Cliquez sur "Ajouter un produit"
3. Nom : "Compte Email Supplémentaire"
4. Description : "Ajoutez un compte email supplémentaire à votre abonnement"
5. Prix : 39 EUR (ou votre tarif)
6. Type : Récurrent - Mensuel
7. Cliquez sur "Enregistrer le produit"
8. Copiez l'ID du prix (commence par `price_`)
9. Ajoutez-le dans `.env.local` comme `STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID`

#### Produit : Plan de Base (optionnel)

1. Répétez le processus pour créer un "Plan de Base"
2. Prix suggéré : 99 EUR/mois
3. Ajoutez l'ID du prix comme `STRIPE_BASE_PLAN_PRICE_ID`

### 4. Configurer les webhooks (pour la production)

Pour que les paiements soient correctement traités, configurez un webhook :

1. Allez dans [Développeurs > Webhooks](https://dashboard.stripe.com/webhooks)
2. Ajoutez un endpoint : `https://votre-domaine.com/api/stripe/webhook`
3. Sélectionnez les événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 5. Redémarrer le serveur

Après avoir ajouté les variables d'environnement, redémarrez votre serveur de développement :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez-le
npm run dev
```

## Test en mode développement

Utilisez les [cartes de test Stripe](https://stripe.com/docs/testing) :

- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- Date d'expiration : n'importe quelle date future
- CVC : n'importe quel nombre à 3 chiffres

## Passage en production

1. Activez votre compte sur le dashboard Stripe
2. Remplacez `sk_test_...` par votre clé de production `sk_live_...`
3. Créez les mêmes produits en mode production
4. Mettez à jour les IDs de prix en production

## Aide

- Documentation Stripe : [https://stripe.com/docs](https://stripe.com/docs)
- Support Stripe : [https://support.stripe.com](https://support.stripe.com)

