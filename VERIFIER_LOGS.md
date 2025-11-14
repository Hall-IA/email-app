# 🔍 Guide pour voir les logs de stripe-checkout

## Problème : Aucun log visible

### 1. Vérifier que la fonction a été déployée

La fonction doit être déployée avec les nouveaux logs. Si vous avez modifié le code localement mais ne l'avez pas déployé, les logs ne seront pas visibles.

**Commande pour déployer :**
```bash
export PATH="$HOME/.local/bin:$PATH"
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase functions deploy stripe-checkout
```

### 2. Où voir les logs dans Supabase

1. **Dashboard Supabase** : https://supabase.com/dashboard
2. Allez dans votre projet
3. Menu gauche : **Edge Functions**
4. Cliquez sur **stripe-checkout**
5. Onglet **Logs** (ou **Invocations**)

### 3. Vérifier que la fonction est appelée

Les logs apparaissent uniquement si la fonction est appelée. Vérifiez :

- Ouvrez la console du navigateur (F12)
- Regardez les appels réseau vers `/functions/v1/stripe-checkout`
- Vérifiez qu'il n'y a pas d'erreur CORS ou 404

### 4. Tester la fonction directement

Pour forcer l'appel et voir les logs immédiatement :

```bash
# Dans la console du navigateur (F12)
fetch('https://VOTRE_PROJECT_REF.supabase.co/functions/v1/stripe-checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer VOTRE_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    price_id: 'price_test',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
    mode: 'subscription'
  })
})
```

### 5. Vérifier les logs en temps réel

Dans le dashboard Supabase :
- Les logs apparaissent en temps réel
- Utilisez le filtre pour chercher `[STRIPE-CHECKOUT]`
- Les logs récents sont en haut

### 6. Si toujours aucun log

**Vérifications supplémentaires :**

1. **La fonction est-elle bien déployée ?**
   - Dashboard > Edge Functions > stripe-checkout
   - Vérifiez la date de dernière mise à jour

2. **Y a-t-il des erreurs de déploiement ?**
   ```bash
   supabase functions deploy stripe-checkout --debug
   ```

3. **Les variables d'environnement sont-elles configurées ?**
   - Dashboard > Edge Functions > Secrets
   - Vérifiez que `STRIPE_SECRET_KEY` est présent

4. **La fonction est-elle bien appelée ?**
   - Console navigateur > Network
   - Cherchez les requêtes vers `stripe-checkout`
   - Vérifiez le statut (200, 404, 500, etc.)

### 7. Logs locaux (développement)

Si vous testez en local :
```bash
supabase functions serve stripe-checkout
```

Les logs apparaîtront dans le terminal.

