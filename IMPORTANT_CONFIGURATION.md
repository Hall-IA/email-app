# ⚠️ CONFIGURATION IMPORTANTE

## Créer le fichier .env.local

**IMPORTANT**: Vous devez créer un fichier `.env.local` à la racine du projet avec cette configuration:

```env
# Configuration PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# JWT Secret (CHANGEZ EN PRODUCTION!)
JWT_SECRET=votre-secret-jwt-tres-securise-changez-moi-en-production-12345

# Next.js
NODE_ENV=development
```

## ⚠️ Points importants:

1. **Host**: Utilisez `localhost` (pas `172.17.0.2`)
   - `172.17.0.2` est l'IP interne Docker, pas accessible depuis Windows

2. **Port**: Utilisez `5433` (pas `5432`)
   - Votre Docker mappe le port 5432 interne vers le port 5433 externe
   - Visible dans: `0.0.0.0:5433->5432/tcp`

3. **Le fichier `.env.local` ne doit PAS être commité** (il est dans .gitignore)

## Étapes pour démarrer:

1. **Créez le fichier `.env.local`** avec le contenu ci-dessus

2. **Testez la connexion**:
   ```bash
   node test-db-connection.js
   ```

3. **Ajoutez les colonnes manquantes** (si nécessaire):
   ```bash
   docker exec -i postgres_db psql -U postgres -d postgres <<EOF
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
   EOF
   ```

4. **Lancez l'application**:
   ```bash
   npm run dev
   ```

## Vérification rapide

Pour vérifier que PostgreSQL est accessible:
```bash
# Depuis Windows (PowerShell)
Test-NetConnection -ComputerName localhost -Port 5433

# Ou avec Docker
docker exec -it postgres_db psql -U postgres -d postgres -c "\d profiles"
```

