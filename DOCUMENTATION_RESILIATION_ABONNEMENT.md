# Documentation : Résiliation d'Abonnement

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Types d'abonnements](#types-dabonnements)
3. [Flux de résiliation](#flux-de-résiliation)
4. [Cas d'usage détaillés](#cas-dusage-détaillés)
5. [Architecture technique](#architecture-technique)
6. [Gestion des erreurs](#gestion-des-erreurs)
7. [Webhooks et synchronisation](#webhooks-et-synchronisation)

---

## Vue d'ensemble

La fonctionnalité de résiliation d'abonnement permet aux utilisateurs d'annuler leur abonnement Stripe. La résiliation est **toujours programmée à la fin de la période de facturation en cours** (`cancel_at_period_end: true`), ce qui signifie que l'utilisateur continue de bénéficier du service jusqu'à la fin de la période payée.

### Caractéristiques principales

- ✅ Résiliation programmée (pas de résiliation immédiate)
- ✅ Gestion différenciée des comptes principaux et additionnels
- ✅ Réduction de quantité pour les comptes additionnels multiples
- ✅ Synchronisation automatique via webhooks Stripe
- ✅ Interface utilisateur avec confirmation et feedback

---

## Types d'abonnements

### 1. Abonnement Premier (Principal)

- **Type** : `premier`
- **Prix** : 29€ HT/mois
- **Description** : Abonnement de base incluant le premier compte email
- **Résiliation** : Annule l'abonnement complet à la fin de la période

### 2. Abonnement Compte Additionnel

- **Type** : `additional_account`
- **Prix** : 19€ HT/mois par compte
- **Description** : Abonnement pour chaque compte email supplémentaire
- **Résiliation** : 
  - Si quantité > 1 : Réduction de la quantité
  - Si quantité = 1 : Résiliation complète

---

## Flux de résiliation

### Schéma général

```
┌─────────────────┐
│  Interface UI   │
│  (Subscription) │
└────────┬────────┘
         │
         │ 1. Clic sur "Résilier"
         │
         ▼
┌─────────────────┐
│  Confirmation   │
│     Modal       │
└────────┬────────┘
         │
         │ 2. Confirmation utilisateur
         │
         ▼
┌─────────────────────────────────┐
│  Edge Function                  │
│  stripe-cancel-subscription     │
└────────┬────────────────────────┘
         │
         │ 3. Vérifications
         │    - Authentification
         │    - Statut abonnement
         │    - Type d'abonnement
         │
         ▼
┌─────────────────────────────────┐
│  Logique de résiliation          │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Compte additionnel ?      │   │
│  │ Quantité > 1 ?            │   │
│  └──────────┬───────────────┘   │
│             │                    │
│     ┌───────┴────────┐           │
│     │                │           │
│  OUI │            NON │          │
│     │                │           │
│     ▼                ▼           │
│  Réduire      Résilier           │
│  quantité     complètement       │
└────────┬─────────────────────────┘
         │
         │ 4. Mise à jour Stripe
         │
         ▼
┌─────────────────────────────────┐
│  Stripe API                      │
│  - update subscription           │
│  - cancel_at_period_end: true    │
└────────┬────────────────────────┘
         │
         │ 5. Mise à jour base de données
         │
         ▼
┌─────────────────────────────────┐
│  Supabase                        │
│  - cancel_at_period_end: true    │
│  - deleted_at (si applicable)   │
└────────┬────────────────────────┘
         │
         │ 6. Webhook Stripe
         │
         ▼
┌─────────────────────────────────┐
│  Synchronisation automatique      │
│  (lors de la fin de période)     │
└─────────────────────────────────┘
```

---

## Cas d'usage détaillés

### Cas 1 : Résiliation du compte principal (Premier)

**Scénario** : L'utilisateur souhaite résilier son abonnement principal.

**Processus** :

1. **Interface utilisateur** (`src/components/Subscription.tsx`)
   ```typescript
   const handleCancelSubscription = async () => {
       // Confirmation utilisateur
       if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
           return;
       }
       
       // Appel Edge Function
       const response = await fetch(
           `${SUPABASE_URL}/functions/v1/stripe-cancel-subscription`,
           {
               method: 'POST',
               body: JSON.stringify({
                   subscription_id: premierSub.subscription_id,
                   subscription_type: 'premier'
               })
           }
       );
   }
   ```

2. **Edge Function** (`supabase/functions/stripe-cancel-subscription/index.ts`)
   - Vérifie que l'abonnement existe et est actif
   - Met à jour Stripe avec `cancel_at_period_end: true`
   - Met à jour la base de données

3. **Résultat** :
   - L'abonnement reste actif jusqu'à la fin de la période
   - L'utilisateur reçoit une confirmation
   - Le statut `cancel_at_period_end` est mis à `true`

### Cas 2 : Résiliation d'un compte additionnel (quantité = 1)

**Scénario** : L'utilisateur a un seul compte additionnel et souhaite le résilier.

**Processus** :

1. **Interface utilisateur**
   - L'utilisateur supprime un compte email depuis l'interface
   - Le système détecte l'abonnement lié

2. **Edge Function**
   ```typescript
   // Vérifie si c'est un compte additionnel
   if (subscription_type === 'additional_account') {
       const stripeSubscription = await stripe.subscriptions.retrieve(subscription_id);
       const additionalAccountItem = stripeSubscription.items.data.find(...);
       
       if (additionalAccountItem.quantity === 1) {
           // Résiliation complète
           await stripe.subscriptions.update(subscription_id, {
               cancel_at_period_end: true
           });
       }
   }
   ```

3. **Résultat** :
   - L'abonnement est programmé pour être résilié
   - Le compte email est marqué comme supprimé
   - L'utilisateur peut continuer à utiliser le compte jusqu'à la fin de la période

### Cas 3 : Réduction de quantité (comptes additionnels multiples)

**Scénario** : L'utilisateur a plusieurs comptes additionnels (quantité > 1) et souhaite en supprimer un.

**Processus** :

1. **Edge Function détecte la quantité**
   ```typescript
   if (additionalAccountItem.quantity > 1) {
       // Réduire la quantité au lieu de résilier
       await stripe.subscriptionItems.update(additionalAccountItem.id, {
           quantity: additionalAccountItem.quantity - 1,
           proration_behavior: 'always_invoice'
       });
       
       // Marquer l'entrée spécifique comme supprimée
       await supabaseAdmin
           .from('stripe_user_subscriptions')
           .update({ deleted_at: new Date().toISOString() })
           .eq('email_configuration_id', email_configuration_id);
   }
   ```

2. **Résultat** :
   - La quantité est réduite immédiatement
   - Un crédit/prorata est appliqué
   - L'abonnement principal reste actif
   - Seul le compte spécifique est marqué comme supprimé

---

## Architecture technique

### Composants frontend

#### 1. `Subscription.tsx`

**Localisation** : `src/components/Subscription.tsx`

**Fonctions principales** :

- `handleCancelSubscription()` : Résiliation du compte principal
- `handleDeleteEmailAccount()` : Suppression d'un compte email (déclenche résiliation si nécessaire)
- `handleCancelSlot()` : Résiliation d'un slot non configuré

**États gérés** :
- `isCanceling` : Indicateur de chargement
- `showCanceledMessage` : Message de confirmation
- `cancel_at_period_end` : Statut de résiliation programmée

### Edge Function

#### `stripe-cancel-subscription`

**Localisation** : `supabase/functions/stripe-cancel-subscription/index.ts`

**Paramètres d'entrée** :
```typescript
{
    subscription_id?: string,           // ID de l'abonnement Stripe
    subscription_type?: string,         // 'premier' ou 'additional_account'
    email_configuration_id?: string     // ID du compte email (pour comptes additionnels)
}
```

**Logique de traitement** :

1. **Authentification**
   ```typescript
   const { data: { user } } = await supabaseClient.auth.getUser();
   if (!user) return corsResponse({ error: 'User not found' }, 404);
   ```

2. **Vérification de l'abonnement**
   ```typescript
   const { data: subRecord } = await supabaseAdmin
       .from('stripe_user_subscriptions')
       .select('subscription_id, status, subscription_type')
       .eq('user_id', user.id)
       .eq('subscription_id', subscription_id)
       .is('deleted_at', null)
       .maybeSingle();
   ```

3. **Validation du statut**
   ```typescript
   if (!['active', 'trialing', 'past_due'].includes(subRecord.status)) {
       return corsResponse({ error: 'Cannot cancel subscription' }, 400);
   }
   ```

4. **Traitement selon le type**
   - **Compte additionnel avec quantité > 1** : Réduction de quantité
   - **Autres cas** : Résiliation programmée

**Réponse** :
```typescript
{
    success: true,
    cancel_at_period_end: boolean,
    current_period_end: number,
    quantity_reduced?: boolean  // Si applicable
}
```

### Base de données

#### Table : `stripe_user_subscriptions`

**Colonnes importantes** :
- `subscription_id` : ID Stripe de l'abonnement
- `subscription_type` : Type ('premier' ou 'additional_account')
- `status` : Statut actuel ('active', 'trialing', 'canceled', etc.)
- `cancel_at_period_end` : Boolean indiquant si la résiliation est programmée
- `deleted_at` : Timestamp de suppression (soft delete)
- `email_configuration_id` : Lien vers le compte email (pour comptes additionnels)

**Mises à jour lors de la résiliation** :
```sql
UPDATE stripe_user_subscriptions
SET cancel_at_period_end = true
WHERE subscription_id = :subscription_id;
```

---

## Gestion des erreurs

### Erreurs possibles

1. **Abonnement introuvable**
   - Code : `404`
   - Message : `"Subscription not found"`
   - Cause : L'abonnement n'existe pas ou n'appartient pas à l'utilisateur

2. **Statut invalide**
   - Code : `400`
   - Message : `"Cannot cancel subscription with status: {status}"`
   - Cause : L'abonnement n'est pas dans un état résiliable

3. **Échec de mise à jour Stripe**
   - Code : `500`
   - Message : `"Failed to update subscription"`
   - Cause : Erreur lors de l'appel à l'API Stripe

4. **Erreur de base de données**
   - Code : `500`
   - Message : `"Failed to update subscription in database"`
   - Cause : Échec de la mise à jour dans Supabase

### Gestion côté frontend

```typescript
const response = await fetch(...);
const data = await response.json();

if (data.error) {
    showToast(`Erreur: ${data.error}`, 'error');
    return;
}

// Succès
showToast('Abonnement résilié avec succès', 'success');
await fetchSubscription(); // Rafraîchir les données
```

---

## Webhooks et synchronisation

### Événements Stripe pertinents

1. **`customer.subscription.updated`**
   - Déclenché lorsque `cancel_at_period_end` est modifié
   - Met à jour le statut dans la base de données

2. **`customer.subscription.deleted`**
   - Déclenché à la fin de la période (quand la résiliation prend effet)
   - Met à jour le statut à `canceled`
   - Désactive les comptes email associés

### Synchronisation automatique

Le système utilise des webhooks Stripe pour maintenir la synchronisation entre Stripe et la base de données. Lorsqu'un événement est reçu :

1. Le webhook vérifie l'événement
2. Met à jour la table `stripe_user_subscriptions`
3. Met à jour les comptes email associés si nécessaire

---

## Exemples de code

### Exemple 1 : Résiliation depuis l'interface

```typescript
// Dans Subscription.tsx
const handleCancelSubscription = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
        return;
    }

    setIsCanceling(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription_id: premierSub.subscription_id,
                    subscription_type: 'premier'
                }),
            }
        );

        const data = await response.json();

        if (data.error) {
            showToast(`Erreur: ${data.error}`, 'error');
            return;
        }

        showToast('Abonnement résilié avec succès', 'success');
        await fetchSubscription();
    } catch (error) {
        showToast('Erreur lors de la résiliation', 'error');
    } finally {
        setIsCanceling(false);
    }
};
```

### Exemple 2 : Résiliation d'un compte additionnel

```typescript
// Dans Subscription.tsx
const handleDeleteEmailAccount = async () => {
    // ... récupération de l'abonnement lié ...
    
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subscription_id: finalSubscriptionId,
                subscription_type: 'additional_account',
                email_configuration_id: accountToDelete.id
            })
        }
    );
    
    // ... gestion de la réponse ...
};
```

---

## Points importants

### ⚠️ Résiliation programmée uniquement

**Important** : Le système ne permet **jamais** de résilier immédiatement un abonnement. Toutes les résiliations sont programmées pour la fin de la période de facturation en cours.

**Raison** : 
- Respect des conditions d'utilisation
- Évite les remboursements complexes
- Permet à l'utilisateur de continuer à utiliser le service jusqu'à la fin

### 🔄 Réduction de quantité vs Résiliation

Pour les comptes additionnels avec quantité > 1 :
- **Réduction de quantité** : Appliquée immédiatement avec prorata
- **Résiliation complète** : Programmée à la fin de la période

### 📊 Synchronisation

La synchronisation entre Stripe et la base de données se fait via :
1. **Mise à jour immédiate** : Lors de l'appel à l'Edge Function
2. **Webhooks Stripe** : Pour les événements asynchrones
3. **Polling** : Le frontend peut interroger périodiquement pour vérifier les mises à jour

---

## Tests recommandés

### Scénarios de test

1. ✅ Résiliation d'un compte principal actif
2. ✅ Résiliation d'un compte additionnel unique
3. ✅ Réduction de quantité pour comptes additionnels multiples
4. ✅ Tentative de résiliation d'un abonnement déjà résilié
5. ✅ Tentative de résiliation d'un abonnement inexistant
6. ✅ Vérification de la synchronisation via webhooks

### Checklist de validation

- [ ] L'abonnement est bien programmé pour la résiliation
- [ ] Le statut `cancel_at_period_end` est mis à `true`
- [ ] L'utilisateur reçoit une confirmation
- [ ] Les données sont synchronisées entre Stripe et Supabase
- [ ] Les erreurs sont correctement gérées et affichées

---

## Support et maintenance

### Logs à surveiller

- Erreurs d'authentification dans l'Edge Function
- Échecs de mise à jour Stripe
- Erreurs de base de données
- Événements webhook non traités

### Métriques importantes

- Taux de résiliation
- Temps de traitement moyen
- Taux d'erreur
- Synchronisation webhook

---

**Dernière mise à jour** : 2024
**Version** : 1.0.0

