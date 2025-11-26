# Démarrage rapide - Migration PostgreSQL

## 🎯 Ce qui a été fait

Votre application a été migrée de Supabase vers PostgreSQL local. Toutes les fonctionnalités d'authentification et de base de données fonctionnent maintenant avec votre serveur PostgreSQL.

## 📋 Prérequis

- PostgreSQL installé et accessible sur `172.17.0.2:5432`
- Base de données importée depuis Supabase
- Node.js et npm installés

## 🚀 Configuration en 3 étapes

### Étape 1: Créer le fichier de configuration

1. À la racine du projet, créez un fichier `.env.local`
2. Copiez le contenu suivant:

```env
# Configuration PostgreSQL
POSTGRES_HOST=172.17.0.2
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# JWT Secret (CHANGEZ EN PRODUCTION!)
JWT_SECRET=votre-secret-jwt-tres-securise-changez-moi-en-production-12345

# Next.js
NODE_ENV=development
```

### Étape 2: Préparer la base de données

**Sur Windows (PowerShell):**
```powershell
.\setup-postgresql.ps1
```

**Sur Linux/Mac:**
```bash
chmod +x setup-postgresql.sh
./setup-postgresql.sh
```

Ce script va:
- Tester la connexion à PostgreSQL
- Vérifier que toutes les tables existent
- Ajouter les colonnes manquantes si nécessaire

### Étape 3: Lancer l'application

```bash
npm run dev
```

Ouvrez votre navigateur sur `http://localhost:3000`

## ✅ Tester l'installation

1. **Inscription**: Créez un nouveau compte utilisateur
2. **Connexion**: Connectez-vous avec les identifiants créés
3. **Dashboard**: Vérifiez que le dashboard s'affiche correctement
4. **Déconnexion**: Testez la déconnexion

## 🔧 En cas de problème

### Erreur "Connection refused"

```bash
# Vérifier que PostgreSQL est démarré
psql -h 172.17.0.2 -p 5432 -U postgres -d postgres
```

Si la connexion échoue:
- Vérifiez que PostgreSQL est bien démarré
- Vérifiez l'adresse IP et le port
- Vérifiez le username et password

### Erreur "Missing environment variables"

- Assurez-vous que le fichier `.env.local` existe à la racine du projet
- Vérifiez que toutes les variables sont définies

### Erreur "Cannot find module"

```bash
# Réinstaller les dépendances
npm install
```

### Problèmes d'authentification

1. Vérifiez que la table `profiles` contient la colonne `password_hash`
2. Consultez les logs du serveur dans le terminal où vous avez lancé `npm run dev`

## 📊 Architecture

```
┌─────────────────┐
│  Navigateur     │
│  (Client)       │
└────────┬────────┘
         │
         │ HTTP Requests
         │
         ↓
┌─────────────────┐
│  Next.js        │
│  API Routes     │
│  - /api/auth/*  │
│  - /api/db/*    │
└────────┬────────┘
         │
         │ SQL Queries
         │
         ↓
┌─────────────────┐
│  PostgreSQL     │
│  172.17.0.2     │
│  Port: 5432     │
└─────────────────┘
```

## 🔐 Sécurité

### Important pour la production:

1. **Changez le JWT_SECRET**: Utilisez une valeur aléatoire longue et complexe
2. **HTTPS uniquement**: En production, utilisez toujours HTTPS
3. **Sécurisez PostgreSQL**: 
   - Ne pas exposer PostgreSQL sur Internet
   - Utilisez des mots de passe forts
   - Activez SSL pour les connexions
4. **Variables d'environnement**: Ne commitez JAMAIS le fichier `.env.local`

## 📝 Différences avec Supabase

### ✅ Ce qui fonctionne de la même manière:
- Inscription et connexion
- Requêtes à la base de données (`supabase.from()`)
- Gestion des sessions
- Toutes les tables et données

### ⚠️ Ce qui est différent:
- **Confirmation d'email**: Les utilisateurs sont automatiquement confirmés (pas d'email de confirmation)
- **Real-time**: Les mises à jour en temps réel ne sont pas supportées
- **Storage**: Pas de système de stockage de fichiers intégré
- **RLS (Row Level Security)**: Doit être géré manuellement dans le code

## 📚 Documentation complète

Pour plus de détails, consultez:
- `MIGRATION_POSTGRESQL.md` - Documentation complète de la migration
- `src/lib/README.md` - Documentation du code

## 🆘 Support

En cas de problème:

1. **Vérifiez les logs**:
   ```bash
   # Terminal où vous avez lancé npm run dev
   ```

2. **Vérifiez PostgreSQL**:
   ```bash
   psql -h 172.17.0.2 -U postgres -d postgres
   ```

3. **Console du navigateur**: Appuyez sur F12 et regardez l'onglet "Console"

## ✨ Prochaines étapes recommandées

1. [ ] Tester toutes les fonctionnalités de l'application
2. [ ] Ajouter des sauvegardes régulières de PostgreSQL
3. [ ] Mettre en place un monitoring
4. [ ] Configurer un environnement de staging
5. [ ] Préparer le déploiement en production

---

**Bon développement! 🚀**

