# 🌿 Configurer Netlify pour déployer la branche "deploy"

## ✅ Étape 1 : Pousser la branche sur GitHub

```bash
# Ajouter et committer les fichiers de configuration
git add netlify.toml vercel.json DEPLOYMENT.md DEPLOY_NETLIFY.md QUICK_DEPLOY.md deploy-netlify.sh env.example.txt
git commit -m "Ajout configuration déploiement Netlify"

# Pousser la branche deploy sur GitHub
git push -u origin deploy
```

## 🔧 Étape 2 : Configurer Netlify pour déployer la branche "deploy"

### Option A : Via l'interface web (Recommandé)

1. **Allez sur** [app.netlify.com](https://app.netlify.com)
2. **Si le site n'existe pas encore** :
   - Cliquez sur "Add new site" > "Import an existing project"
   - Sélectionnez GitHub et le repository `email-app`
   - **IMPORTANT** : Dans "Branch to deploy", sélectionnez `deploy` au lieu de `main`
   - Configurez les variables d'environnement
   - Cliquez sur "Deploy site"

3. **Si le site existe déjà** :
   - Allez dans votre site
   - Cliquez sur **"Site settings"**
   - Allez dans **"Build & deploy"** > **"Continuous Deployment"**
   - Cliquez sur **"Edit settings"** à côté de votre repository
   - Dans **"Branch to deploy"**, changez `main` en `deploy`
   - Cliquez sur **"Save"**

### Option B : Via la ligne de commande

Si vous avez déjà initialisé le projet avec `netlify init`, vous pouvez configurer la branche :

```bash
# Lier le projet (si pas déjà fait)
netlify link

# Configurer la branche de déploiement
netlify env:set NETLIFY_DEPLOY_BRANCH deploy

# Ou modifier directement dans le fichier netlify.toml
```

## 📝 Étape 3 : Modifier netlify.toml (Optionnel mais recommandé)

Ajoutez cette section dans `netlify.toml` pour forcer le déploiement de la branche `deploy` :

```toml
[build]
  command = "npm run build"
  publish = ".next"

# Configuration de la branche de déploiement
[context.deploy]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"

[functions]
  node_bundler = "esbuild"
```

## 🎯 Avantages de cette configuration

✅ **Séparation claire** : La branche `main` reste pour le développement
✅ **Tests avant production** : Vous pouvez tester sur `deploy` avant de merger dans `main`
✅ **Déploiements contrôlés** : Seuls les commits sur `deploy` déclenchent un déploiement
✅ **Rollback facile** : Vous pouvez revenir à un commit précédent sur `deploy`

## 🔄 Workflow recommandé

1. **Développement** : Travaillez sur `main` ou une branche de feature
2. **Prêt pour déploiement** : Mergez dans `deploy`
3. **Déploiement automatique** : Netlify déploie automatiquement `deploy`
4. **Test** : Testez sur l'URL Netlify
5. **Si tout est OK** : Mergez `deploy` dans `main` (optionnel)

## 📌 Commandes utiles

```bash
# Voir la branche actuelle
git branch

# Basculer sur la branche deploy
git checkout deploy

# Merger main dans deploy
git checkout deploy
git merge main

# Pousser deploy sur GitHub
git push origin deploy

# Voir les déploiements Netlify
netlify deploy:list
```

## ⚠️ Important

- Les **variables d'environnement** doivent être configurées dans Netlify (elles sont partagées entre toutes les branches)
- Les **déploiements** se feront uniquement quand vous poussez sur la branche `deploy`
- La branche `main` ne déclenchera **pas** de déploiement automatique

