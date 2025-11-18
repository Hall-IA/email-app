# Guide de déploiement sur Netlify - Pas à pas

Ce guide vous accompagne étape par étape pour déployer votre application sur Netlify.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :
- ✅ Un compte Netlify (gratuit) : [netlify.com](https://netlify.com)
- ✅ Votre code sur GitHub, GitLab ou Bitbucket
- ✅ Les identifiants de votre projet Supabase
- ✅ Les identifiants Stripe (si utilisé)

## 🚀 Méthode 1 : Déploiement via l'interface web (Recommandé)

### Étape 1 : Préparer votre repository

1. Assurez-vous que votre code est poussé sur GitHub/GitLab/Bitbucket
2. Vérifiez que le fichier `netlify.toml` est présent à la racine du projet

### Étape 2 : Créer un nouveau site sur Netlify

1. Connectez-vous à [app.netlify.com](https://app.netlify.com)
2. Cliquez sur **"Add new site"** > **"Import an existing project"**
3. Choisissez votre provider (GitHub, GitLab ou Bitbucket)
4. Autorisez Netlify à accéder à vos repositories si nécessaire
5. Sélectionnez le repository contenant votre application


### Étape 3 : Configurer le build

Netlify devrait détecter automatiquement Next.js grâce au fichier `netlify.toml`. Vérifiez que :

- **Build command** : `npm run build`
- **Publish directory** : `.next` (ou laissez vide, le plugin Next.js s'en charge)

Si les valeurs ne sont pas détectées automatiquement, entrez-les manuellement.

### Étape 4 : Configurer les variables d'environnement

**IMPORTANT** : Configurez ces variables AVANT de déployer :

1. Dans la section **"Environment variables"**, cliquez sur **"Add variable"**
2. Ajoutez chaque variable une par une :

```
NEXT_PUBLIC_SUPABASE_URL = https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = votre-clé-anon
NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID = price_xxxxx (si utilisé)
```

3. Cliquez sur **"Deploy site"**

### Étape 5 : Attendre le déploiement

- Le build peut prendre 2-5 minutes
- Vous verrez les logs en temps réel
- Une fois terminé, vous obtiendrez une URL (ex: `votre-app.netlify.app`)

### Étape 6 : Vérifier le déploiement

1. Visitez l'URL fournie par Netlify
2. Testez l'application :
   - ✅ La page d'accueil se charge
   - ✅ L'authentification fonctionne
   - ✅ La connexion à Supabase fonctionne

## 🖥️ Méthode 2 : Déploiement via CLI

### Étape 1 : Installer Netlify CLI

```bash
npm install -g netlify-cli
```

### Étape 2 : Se connecter à Netlify

```bash
netlify login
```

Cela ouvrira votre navigateur pour vous authentifier.

### Étape 3 : Initialiser le projet

```bash
cd /home/souad/hallia/bolt-application/email/tri-automatique-email
netlify init
```

Répondez aux questions :
- **Create & configure a new site** : Oui
- **Team** : Sélectionnez votre équipe
- **Site name** : Entrez un nom (ou laissez vide pour un nom aléatoire)
- **Build command** : `npm run build`
- **Directory to deploy** : `.next` (ou laissez vide)

### Étape 4 : Configurer les variables d'environnement

```bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://votre-projet.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "votre-clé-anon"
netlify env:set NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID "price_xxxxx"
```

### Étape 5 : Déployer

```bash
# Déploiement de test (preview)
netlify deploy

# Déploiement en production
netlify deploy --prod
```

## 🔧 Configuration post-déploiement

### Configurer un domaine personnalisé (optionnel)

1. Dans Netlify, allez dans **"Site settings"** > **"Domain management"**
2. Cliquez sur **"Add custom domain"**
3. Suivez les instructions pour configurer votre DNS

### Configurer les webhooks Stripe (si utilisé)

1. Dans votre dashboard Stripe, allez dans **"Developers"** > **"Webhooks"**
2. Ajoutez une nouvelle URL webhook : `https://votre-app.netlify.app/api/webhooks/stripe`
3. Ou utilisez l'URL de votre fonction Supabase si les webhooks passent par Supabase

## 🐛 Résolution de problèmes

### Erreur : "Build failed"

**Solution** :
1. Vérifiez les logs de build dans Netlify
2. Assurez-vous que toutes les dépendances sont dans `package.json`
3. Vérifiez que Node.js version 20 est utilisée (configuré dans `netlify.toml`)

### Erreur : "Environment variables not found"

**Solution** :
1. Vérifiez que toutes les variables sont configurées dans Netlify
2. Les variables doivent commencer par `NEXT_PUBLIC_` pour être accessibles côté client
3. Redéployez après avoir ajouté les variables

### Erreur : "Module not found"

**Solution** :
1. Vérifiez que `node_modules` n'est pas dans `.gitignore` (il ne devrait pas l'être)
2. Assurez-vous que toutes les dépendances sont listées dans `package.json`
3. Netlify installera automatiquement les dépendances lors du build

### L'application se charge mais Supabase ne fonctionne pas

**Solution** :
1. Vérifiez que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont correctement configurées
2. Vérifiez les CORS dans votre projet Supabase
3. Vérifiez les logs du navigateur (F12) pour voir les erreurs

## 📝 Checklist de déploiement

Avant de déployer, vérifiez :

- [ ] Le code est poussé sur GitHub/GitLab/Bitbucket
- [ ] Le fichier `netlify.toml` est présent
- [ ] Les variables d'environnement sont prêtes
- [ ] Les fonctions Supabase sont déployées (si nécessaire)
- [ ] Les webhooks Stripe sont configurés (si nécessaire)

## 🔄 Déploiements automatiques

Netlify déploie automatiquement à chaque push sur la branche principale. Pour configurer :

1. Allez dans **"Site settings"** > **"Build & deploy"**
2. Configurez les **"Build hooks"** si nécessaire
3. Les déploiements se feront automatiquement sur chaque commit

## 📞 Support

Si vous rencontrez des problèmes :
1. Consultez les logs de build dans Netlify
2. Vérifiez la documentation Netlify : [docs.netlify.com](https://docs.netlify.com)
3. Vérifiez la documentation Next.js : [nextjs.org/docs](https://nextjs.org/docs)

---

**Bon déploiement ! 🚀**

