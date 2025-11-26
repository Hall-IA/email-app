# 🔄 Synchronisation Stripe - Guide Complet

## ✅ Synchronisation automatique

Votre application synchronise **automatiquement** vos paiements Stripe !

### Comment ça marche ?

1. **Après un paiement réussi**, Stripe vous redirige vers Settings
2. **L'application détecte** automatiquement le retour de paiement
3. **Synchronisation automatique** : Vos subscriptions et factures sont récupérées depuis Stripe
4. **La page se recharge** avec toutes vos données à jour

Vous verrez un indicateur "Synchronisation..." pendant quelques secondes, puis tout apparaîtra !

---

## 🎯 Pas besoin de bouton manuel

**Plus besoin de cliquer sur un bouton !** La synchronisation se fait toute seule après chaque paiement.

---

## 🔧 Configuration des webhooks (Optionnel - Pour production)

### Pourquoi configurer les webhooks ?

- ✅ Synchronisation en temps réel sans rechargement de page
- ✅ Meilleure fiabilité en production
- ✅ Gestion automatique des renouvellements d'abonnement

### Étapes de configuration

#### 1. Installer Stripe CLI

Téléchargez Stripe CLI depuis : https://stripe.com/docs/stripe-cli

Ou avec Chocolatey (Windows) :
```powershell
choco install stripe-cli
```

#### 2. Se connecter à Stripe

```powershell
stripe login
```

Suivez les instructions pour vous connecter à votre compte Stripe.

#### 3. Démarrer le tunnel de webhooks

Dans un **nouveau terminal**, exécutez :

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

⚠️ **Important** : Gardez ce terminal ouvert pendant que vous développez !

#### 4. Récupérer le webhook secret

Quand vous exécutez `stripe listen`, vous verrez quelque chose comme :

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Copiez ce secret !**

#### 5. Ajouter le secret dans `.env.local`

Ajoutez cette ligne dans votre fichier `.env.local` :

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Remplacez `whsec_xxxxxxxxxxxxx` par votre vrai secret.

#### 6. Redémarrer votre serveur

```powershell
# Arrêtez votre serveur (Ctrl+C)
npm run dev
```

#### 7. Tester

1. Effectuez un paiement test sur Stripe
2. Regardez votre terminal - vous devriez voir des événements arriver
3. Votre application sera automatiquement synchronisée !

---

## 🎯 Pour la production

### Configurer les webhooks en production

1. **Allez sur le dashboard Stripe** : https://dashboard.stripe.com/webhooks
2. **Cliquez sur "Add endpoint"**
3. **URL du endpoint** : `https://votre-domaine.com/api/stripe/webhook`
4. **Sélectionnez les événements** :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copiez le signing secret**
6. **Ajoutez-le dans votre `.env.local` de production** :
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_prod_xxxxxxxxxxxxx
   ```

---

## 🛠️ Dépannage

### Les données ne se synchronisent pas après le paiement

1. **Vérifiez votre console** (F12 dans le navigateur) - Regardez les logs
2. **Vérifiez que vous êtes connecté**
3. **Attendez quelques secondes** - La synchronisation prend 2-5 secondes
4. **Rechargez la page** manuellement si nécessaire (F5)

### Erreur "Stripe n'est pas configuré"

Ajoutez ces variables dans `.env.local` :

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID=price_...
```

Consultez `STRIPE_SETUP.md` pour plus de détails.

### Les factures n'apparaissent toujours pas

1. **Attendez 5-10 secondes** après le paiement
2. **Rechargez complètement la page** (Ctrl+F5 ou F5)
3. **Vérifiez les logs du terminal** pour voir les erreurs éventuelles

### Erreur 401 "Non authentifié"

1. **Reconnectez-vous** à votre compte
2. **Videz les cookies** du navigateur
3. **Réessayez le paiement**

---

## 📊 Ce qui est synchronisé

Quand vous cliquez sur "Sync Stripe" :

- ✅ Toutes vos subscriptions actives et leurs statuts
- ✅ Les informations de paiement (carte utilisée)
- ✅ Les dates de période (début, fin)
- ✅ Toutes vos factures (jusqu'à 100 dernières)
- ✅ Les PDFs de factures
- ✅ Les montants payés

---

## 💡 Astuces

- **La synchronisation est automatique** après chaque paiement - patientez 5 secondes
- **Regardez l'indicateur "Synchronisation..."** en haut de la page Settings
- **Gardez le terminal Stripe CLI ouvert** pendant le développement (pour les webhooks)
- **Pour la production**, configurez les webhooks directement sur Stripe
- **Surveillez les logs** de votre terminal pour déboguer

---

## 📞 Besoin d'aide ?

Si ça ne fonctionne toujours pas :

1. Regardez les logs de votre terminal Next.js
2. Regardez les logs dans la console du navigateur (F12)
3. Vérifiez que votre customer_id existe dans la table `stripe_customers`

---

**Fait avec ❤️ pour faciliter votre développement !**

