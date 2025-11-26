# Configuration Gmail OAuth

## ⚠️ Important: Configuration Google OAuth requise

Pour que la connexion Gmail fonctionne, vous devez configurer Google OAuth.

## 📝 Étapes de configuration:

### 1. Créer un projet Google Cloud

1. Allez sur https://console.cloud.google.com/
2. Créez un nouveau projet (ou sélectionnez-en un existant)
3. Activez l'API Gmail

### 2. Créer des identifiants OAuth 2.0

1. Dans la console Google Cloud, allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth client ID**
3. Choisissez **Web application**
4. Configurez les URI de redirection autorisées:
   - `http://localhost:3000/gmail-callback` (développement)
   - `https://votre-domaine.com/gmail-callback` (production)

### 3. Ajouter les variables d'environnement

Ajoutez ces lignes dans votre fichier `.env.local`:

```env
# Gmail OAuth
GOOGLE_CLIENT_ID=votre_client_id_google.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre_client_secret_google
```

### 4. Redémarrer l'application

```bash
# Arrêtez le serveur (Ctrl+C)
npm run dev
```

## 🔧 Exemple de configuration complète `.env.local`:

```env
# Configuration PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# JWT Secret
JWT_SECRET=votre-secret-jwt-tres-securise-changez-moi-en-production-12345

# Gmail OAuth (à configurer)
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

# Next.js
NODE_ENV=development
```

## ✅ Vérifier la configuration

Une fois configuré, testez:

1. Allez dans **Settings** de votre application
2. Cliquez sur **Ajouter un compte Gmail**
3. Vous devriez être redirigé vers la page d'authentification Google

## ⚠️ Si vous n'avez pas encore configuré Google OAuth

Si vous voyez l'erreur:
```
Configuration Google OAuth manquante
```

C'est normal ! Suivez les étapes ci-dessus pour configurer Google OAuth.

## 📚 Documentation Google

- Guide OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- API Gmail: https://developers.google.com/gmail/api
- Scopes requis:
  - `https://mail.google.com/` - Accès complet IMAP/SMTP
  - `https://www.googleapis.com/auth/gmail.readonly` - Lecture des emails
  - `https://www.googleapis.com/auth/gmail.labels` - Gestion des labels
  - `https://www.googleapis.com/auth/userinfo.email` - Accès à l'email de l'utilisateur

## 🔐 Sécurité

- **Ne commitez jamais** vos identifiants Google dans Git
- En production, utilisez les secrets de votre plateforme de déploiement
- Limitez les scopes aux seuls besoins nécessaires
- Configurez les URI de redirection autorisées correctement

