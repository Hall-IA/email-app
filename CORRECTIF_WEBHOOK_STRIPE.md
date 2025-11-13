# Correctif : Calcul des comptes additionnels dans le webhook Stripe

## 🐛 Problème identifié

Lorsqu'un utilisateur effectue un **upgrade** (ajout de comptes additionnels après le premier abonnement), le webhook Stripe **ne met pas à jour correctement** le nombre de comptes additionnels dans la table `stripe_subscriptions`.

### Pourquoi ?

1. Les upgrades créent une **nouvelle subscription Stripe séparée** pour les comptes additionnels
2. Le webhook calcule `additional_accounts` en cherchant seulement dans la **première subscription** (le plan de base)
3. Les nouvelles subscriptions d'upgrade ne sont **pas prises en compte** dans le calcul

### Impact

- ✅ Les subscriptions sont bien enregistrées dans `stripe_user_subscriptions` (nouvelle table)
- ❌ Le champ `additional_accounts` dans `stripe_subscriptions` (ancienne table) n'est pas à jour
- ❌ Les slots d'emails payés ne s'affichent pas dans l'interface après un upgrade

---

## 🔧 Solution : Modifier le webhook

### Fichier à modifier

`supabase/functions/stripe-webhook/index.ts`

### Ligne 357-366 (AVANT)

```typescript
// Calculate the number of additional accounts from old format
let additionalAccounts = 0;
if (additionalAccountPriceId && premierSubscription) {
  const additionalAccountItem = premierSubscription.items.data.find(
    item => item.price.id === additionalAccountPriceId
  );
  if (additionalAccountItem) {
    additionalAccounts = additionalAccountItem.quantity || 0;
  }
}
```

### Ligne 357-383 (APRÈS)

```typescript
// Calculate the number of additional accounts from ALL subscriptions
let additionalAccounts = 0;
if (additionalAccountPriceId) {
  // 1. Compter les line items additionnels dans la subscription premier
  if (premierSubscription) {
    const additionalAccountItem = premierSubscription.items.data.find(
      item => item.price.id === additionalAccountPriceId
    );
    if (additionalAccountItem) {
      additionalAccounts += additionalAccountItem.quantity || 0;
    }
  }
  
  // 2. Compter TOUTES les subscriptions de type "additional_account"
  const additionalSubscriptions = subscriptions.data.filter(sub => {
    const firstPriceId = sub.items.data[0]?.price.id;
    return (sub.metadata?.type === 'additional_account' || firstPriceId === additionalAccountPriceId) 
           && ['active', 'trialing'].includes(sub.status);
  });
  
  // Sommer les quantités de toutes les subscriptions additionnelles
  for (const sub of additionalSubscriptions) {
    const item = sub.items.data.find(item => item.price.id === additionalAccountPriceId);
    if (item) {
      additionalAccounts += item.quantity || 0;
    }
  }
  
  console.info(`Total additional accounts calculated: ${additionalAccounts}`);
}
```

---

## 📝 Explication de la correction

### Avant
- Cherchait seulement les line items additionnels dans la **subscription premier**
- Ignorait les subscriptions séparées créées par les upgrades

### Après
1. **Compte les line items additionnels** dans la subscription premier (premier abonnement avec plusieurs emails)
2. **Trouve toutes les subscriptions de type `additional_account`** (upgrades ultérieurs)
3. **Somme les quantités** de toutes ces subscriptions
4. **Met à jour** `stripe_subscriptions.additional_accounts` avec le total

---

## 🚀 Déploiement

### Commandes à exécuter

```bash
# 1. Se connecter à Supabase (si pas déjà fait)
cd /home/souad/hallia/bolt-application/email/tri-automatique-email
npx supabase login

# 2. Déployer le webhook modifié
npx supabase functions deploy stripe-webhook
```

### Résultat attendu

```
Deploying function stripe-webhook...
Function stripe-webhook deployed successfully
```

---

## ✅ Vérification

### Après le déploiement

1. **Demander à un utilisateur de faire un upgrade** (ajouter un compte)
2. **Vérifier dans Supabase** → Table `stripe_subscriptions` → Colonne `additional_accounts`
3. **Le nombre doit correspondre** au total de comptes additionnels payés

### Exemple

Si un utilisateur :
- A payé **2 comptes additionnels** lors du premier abonnement
- Puis a ajouté **1 compte additionnel** via upgrade
- **Total attendu** : `additional_accounts = 3`

---

## 🔄 Alternative : Synchronisation manuelle

Si tu ne peux pas déployer immédiatement, les utilisateurs peuvent utiliser le **bouton de synchronisation forcée** dans leur page Abonnement et facture.

---

## ⚠️ Remarques importantes

1. **Cette modification est rétrocompatible** : elle ne casse rien pour les utilisateurs existants
2. **Les subscriptions dans `stripe_user_subscriptions` ne sont pas affectées** : elles restent correctes
3. **Le calcul se fait à chaque webhook** : les utilisateurs existants verront leurs données corrigées au prochain événement Stripe (paiement, renouvellement, etc.)

---

## 🆘 En cas de problème

### Erreur lors du déploiement

```bash
# Ajouter le flag --debug pour plus d'informations
npx supabase functions deploy stripe-webhook --debug
```

### Vérifier les logs du webhook

1. Aller sur le **dashboard Supabase**
2. **Edge Functions** → `stripe-webhook`
3. **Logs** → Vérifier les messages `Total additional accounts calculated: X`

---

## 📊 Changement technique détaillé

### Logique ajoutée

```typescript
// Filtrer les subscriptions additionnelles actives
const additionalSubscriptions = subscriptions.data.filter(sub => {
  const firstPriceId = sub.items.data[0]?.price.id;
  return (sub.metadata?.type === 'additional_account' || firstPriceId === additionalAccountPriceId) 
         && ['active', 'trialing'].includes(sub.status);
});

// Sommer les quantités
for (const sub of additionalSubscriptions) {
  const item = sub.items.data.find(item => item.price.id === additionalAccountPriceId);
  if (item) {
    additionalAccounts += item.quantity || 0;
  }
}
```

### Critères de sélection

Une subscription est considérée comme "additional_account" si :
- Son `metadata.type === 'additional_account'` **OU**
- Son premier line item a le `additionalAccountPriceId` **ET**
- Son statut est `active` ou `trialing`

---

**Date de création** : 13 novembre 2025  
**Développeur** : Souad  
**Priorité** : Haute (bloquant pour les upgrades)  
**Temps estimé** : 5 minutes

