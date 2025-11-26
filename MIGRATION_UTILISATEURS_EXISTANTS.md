# Migration des utilisateurs existants depuis Supabase

## ⚠️ Important pour les utilisateurs existants

Si vous aviez un compte **avant la migration vers PostgreSQL**, vous devez **définir un nouveau mot de passe**.

## Pourquoi ?

Les mots de passe Supabase ne peuvent pas être migrés car ils sont hashés avec un algorithme spécifique à Supabase. Pour des raisons de sécurité, nous ne pouvons pas récupérer les anciens mots de passe.

## 📊 Situation actuelle:

Votre base de données contient **37 utilisateurs** qui ont été migrés depuis Supabase, mais **aucun n'a de mot de passe défini** dans le nouveau système PostgreSQL.

## Solutions pour les utilisateurs existants:

### Option 1: Inscription avec un nouvel email (Recommandé)

Si vous avez accès à un autre email, créez simplement un nouveau compte.

### Option 2: Réinitialiser le mot de passe pour un email existant

Nous avons créé une API route spéciale pour définir un mot de passe pour les comptes migrés.

#### Avec une interface utilisateur (à créer):

Créez un composant `ResetPasswordModal.tsx` ou utilisez le script ci-dessous.

#### Avec curl (temporaire):

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "votre-email@example.com",
    "newPassword": "VotreNouveauMotDePasse123!"
  }'
```

#### Avec PowerShell:

```powershell
$body = @{
    email = "votre-email@example.com"
    newPassword = "VotreNouveauMotDePasse123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/reset-password" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Option 3: Script Node.js pour réinitialiser en masse

Créez un fichier `migrate-users-passwords.js`:

```javascript
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function migrateUserPassword(email, newPassword) {
  const client = await pool.connect();
  try {
    // Vérifier que l'utilisateur existe et n'a pas de mot de passe
    const result = await client.query(
      'SELECT id, password_hash FROM profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Utilisateur ${email} non trouvé`);
      return;
    }

    if (result.rows[0].password_hash) {
      console.log(`⚠️  Utilisateur ${email} a déjà un mot de passe`);
      return;
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour
    await client.query(
      'UPDATE profiles SET password_hash = $1, updated_at = $2 WHERE id = $3',
      [passwordHash, new Date().toISOString(), result.rows[0].id]
    );

    console.log(`✅ Mot de passe défini pour ${email}`);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('Migration des mots de passe utilisateurs...\n');

  // Exemple: Définir un mot de passe temporaire pour un utilisateur spécifique
  await migrateUserPassword('user@example.com', 'MotDePasseTemporaire123!');

  // Vous pouvez ajouter d'autres utilisateurs ici
  // await migrateUserPassword('autre@example.com', 'AutreMotDePasse123!');

  await pool.end();
  console.log('\n✅ Migration terminée');
}

main().catch(console.error);
```

Puis exécutez:
```bash
node migrate-users-passwords.js
```

## 🔒 Solution recommandée pour la production:

### Créer un système de "première connexion"

1. **Détection automatique**: Quand un utilisateur essaie de se connecter sans `password_hash`, afficher un formulaire spécial

2. **Vérification par email**: Envoyer un email de vérification avec un lien pour définir un nouveau mot de passe

3. **Interface utilisateur**: Créer un composant `SetPasswordModal.tsx` qui s'affiche automatiquement

### Exemple de composant React:

```typescript
'use client';

import { useState } from 'react';

export function SetPasswordModal({ email, isOpen, onClose }: { 
  email: string; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Rediriger vers la connexion
      }, 2000);
    } catch (err) {
      setError('Une erreur est survenue');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Définir un mot de passe</h2>
        
        {success ? (
          <div className="text-green-600">
            Mot de passe défini avec succès ! Vous pouvez maintenant vous connecter.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mb-4 text-gray-600">
              Votre compte a été migré depuis Supabase. 
              Veuillez définir un nouveau mot de passe pour continuer.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
                minLength={6}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'En cours...' : 'Définir le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

## 📝 Liste des utilisateurs à migrer:

Pour voir tous les utilisateurs sans mot de passe:

```sql
SELECT email, full_name, created_at 
FROM profiles 
WHERE password_hash IS NULL 
ORDER BY created_at;
```

Ou avec Node.js:
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
pool.query('SELECT email FROM profiles WHERE password_hash IS NULL')
  .then(res => {
    console.log('Utilisateurs sans mot de passe:');
    res.rows.forEach(r => console.log('  -', r.email));
    pool.end();
  });
"
```

## ⚡ Action rapide pour tester:

Si vous voulez tester immédiatement avec votre compte, exécutez:

```bash
node -e "
const fetch = require('node-fetch');
fetch('http://localhost:3000/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'votre-email@example.com',
    newPassword: 'Test123456!'
  })
}).then(r => r.json()).then(console.log);
"
```

Puis connectez-vous avec `votre-email@example.com` et le mot de passe `Test123456!`

---

**Note**: En production, vous devriez implémenter un système d'envoi d'email avec un lien de réinitialisation sécurisé au lieu de permettre la définition directe du mot de passe.

