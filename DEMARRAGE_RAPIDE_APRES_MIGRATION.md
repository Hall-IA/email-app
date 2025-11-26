# 🚀 Démarrage Rapide - Après Migration

## ⚠️ Problème actuel

Vous avez **37 utilisateurs migrés** depuis Supabase, mais **aucun n'a de mot de passe** dans le nouveau système PostgreSQL.

## ✅ Solution Rapide (2 minutes)

### Étape 1: Démarrer l'application

Si ce n'est pas déjà fait:
```bash
npm run dev
```

Attendez que le serveur soit prêt (vous verrez "Ready in...").

### Étape 2: Définir un mot de passe pour votre compte

**Option A - Script interactif (Recommandé):**

```bash
node set-user-password.js
```

Le script vous demandera:
1. Votre email
2. Votre nouveau mot de passe

**Option B - Commande directe avec PowerShell:**

```powershell
$body = @{
    email = "votre-email@example.com"
    newPassword = "VotreMotDePasse123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/reset-password" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Option C - Créer un nouveau compte:**

Allez sur http://localhost:3000 et inscrivez-vous avec un nouvel email.

### Étape 3: Connectez-vous!

1. Allez sur http://localhost:3000
2. Cliquez sur "Se connecter"
3. Entrez vos identifiants
4. ✅ Vous êtes connecté!

## 📊 Voir les utilisateurs sans mot de passe

```bash
node -e "
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});
pool.query('SELECT email, full_name FROM profiles WHERE password_hash IS NULL ORDER BY email')
  .then(res => {
    console.log('\n📋 Utilisateurs sans mot de passe (' + res.rows.length + '):');
    res.rows.forEach(r => console.log('   -', r.email, r.full_name ? '(' + r.full_name + ')' : ''));
    pool.end();
    console.log('');
  });
"
```

## 🔄 Définir des mots de passe en masse

Si vous voulez définir des mots de passe pour plusieurs utilisateurs:

```bash
node set-user-password.js
```

Répétez pour chaque utilisateur, ou modifiez le script pour traiter plusieurs utilisateurs.

## ❓ FAQ

**Q: Pourquoi les anciens mots de passe ne fonctionnent pas?**  
R: Les mots de passe Supabase ne peuvent pas être migrés car ils sont hashés avec un algorithme spécifique. Il faut définir de nouveaux mots de passe.

**Q: Peut-on récupérer les anciens mots de passe?**  
R: Non, c'est impossible et ce serait un problème de sécurité. Les mots de passe sont hashés de manière irréversible.

**Q: Que faire si j'ai beaucoup d'utilisateurs?**  
R: Vous pouvez:
1. Envoyer un email à chaque utilisateur avec un lien de réinitialisation
2. Créer une page de "première connexion" qui demande de définir un nouveau mot de passe
3. Utiliser le script fourni pour définir des mots de passe temporaires

**Q: L'inscription d'un nouveau compte fonctionne-t-elle?**  
R: Oui! Les nouveaux comptes créés après la migration fonctionnent normalement.

## 📝 Logs utiles

Pour voir les erreurs de connexion:
```bash
# Dans le terminal où vous avez lancé "npm run dev"
```

Pour tester la connexion PostgreSQL:
```bash
node test-db-connection.js
```

---

**Besoin d'aide?** Consultez `MIGRATION_UTILISATEURS_EXISTANTS.md` pour plus de détails.

