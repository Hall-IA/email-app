# Configuration de Resend pour l'envoi d'emails

## 🔑 Obtenir votre clé API Resend

### 1. Créer un compte Resend

1. Allez sur **https://resend.com**
2. Cliquez sur **"Sign Up"**
3. Créez votre compte (gratuit jusqu'à 3000 emails/mois)

### 2. Obtenir votre API Key

1. Connectez-vous à votre compte Resend
2. Allez dans **"API Keys"** dans le menu de gauche
3. Cliquez sur **"Create API Key"**
4. Donnez-lui un nom (ex: "Hall Mail Production")
5. Copiez la clé qui commence par `re_...`

### 3. Configurer le domaine d'envoi

Par défaut, Resend vous permet d'envoyer depuis `onboarding@resend.dev`, mais pour la production, vous devriez configurer votre propre domaine.

**Dans le code actuel, les emails sont envoyés depuis :**
- `Hall Mail <support@help.hallia.ai>`

Si vous n'avez pas configuré ce domaine dans Resend, vous devez :

#### Option A : Utiliser le domaine de test (temporaire)
Modifiez les fichiers API pour utiliser le domaine de test de Resend :
- Dans `src/app/api/send-ticket-to-support/route.ts` ligne 304
- Dans `src/app/api/support-auto-reply/route.ts` ligne 195

Changez :
```javascript
from: 'Hall Mail <support@help.hallia.ai>',
```

En :
```javascript
from: 'Hall Mail <onboarding@resend.dev>',
```

#### Option B : Configurer votre domaine (recommandé pour production)

1. Dans Resend, allez dans **"Domains"**
2. Cliquez sur **"Add Domain"**
3. Entrez votre domaine (ex: `help.hallia.ai`)
4. Ajoutez les enregistrements DNS fournis par Resend :
   - Enregistrement MX
   - Enregistrement TXT pour SPF
   - Enregistrement TXT pour DKIM
5. Attendez la vérification (quelques minutes à quelques heures)

### 4. Ajouter la clé à `.env.local`

Ouvrez votre fichier `.env.local` et ajoutez :

```env
RESEND_API_KEY=re_votre_clé_ici
```

### 5. Redémarrer le serveur

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis redémarrez
npm run dev
```

## 🧪 Tester l'envoi d'emails

### Test rapide

1. Allez sur http://localhost:3000/support
2. Remplissez le formulaire avec votre email
3. Envoyez le ticket
4. Vérifiez vos emails (et le dossier spam)

### Vérifier dans Resend

1. Connectez-vous à Resend
2. Allez dans **"Logs"**
3. Vous verrez tous les emails envoyés avec leur statut

## 🐛 Dépannage

### Erreur : "RESEND_API_KEY non configuré"

**Solution :** Ajoutez la clé dans `.env.local` et redémarrez le serveur.

### Erreur : "Domain not verified"

**Solution :** 
- Utilisez `onboarding@resend.dev` (temporaire)
- Ou configurez votre domaine dans Resend

### Les emails n'arrivent pas

**Vérifiez :**
1. ✅ Les logs de Resend (https://resend.com/logs)
2. ✅ Le dossier spam de votre boîte email
3. ✅ Que l'email destinataire est valide
4. ✅ Les logs du terminal Node.js

### Erreur : "Invalid API key"

**Solution :** Vérifiez que vous avez copié la clé complète depuis Resend.

## 💡 Plan gratuit vs payant

### Plan Gratuit (0$/mois)
- ✅ 3 000 emails/mois
- ✅ 100 emails/jour
- ✅ 1 domaine personnalisé
- ✅ Support communautaire

### Plan Pro (20$/mois)
- ✅ 50 000 emails/mois
- ✅ Emails illimités/jour
- ✅ Domaines illimités
- ✅ Support prioritaire

**Pour débuter, le plan gratuit est largement suffisant !**

## 📧 Exemple de configuration complète

Votre `.env.local` devrait contenir au minimum :

```env
# PostgreSQL
POSTGRES_HOST=172.17.0.2
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# JWT
JWT_SECRET=votre-secret-jwt

# Resend (pour les emails de support)
RESEND_API_KEY=re_votre_clé_resend_ici

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID=price_...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

**Une fois configuré, votre système de support sera 100% fonctionnel ! 🎉**

