# Script PowerShell pour tester la connexion PostgreSQL et préparer la base de données
# Pour Windows

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Configuration PostgreSQL pour Email App" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Variables de connexion
$PGHOST = "172.17.0.2"
$PGPORT = "5432"
$PGDATABASE = "postgres"
$PGUSER = "postgres"
$PGPASSWORD = "postgres123"

# Définir la variable d'environnement pour le mot de passe
$env:PGPASSWORD = $PGPASSWORD

Write-Host "Test de connexion à PostgreSQL..."
Write-Host "Host: $PGHOST"
Write-Host "Port: $PGPORT"
Write-Host "Database: $PGDATABASE"
Write-Host "User: $PGUSER"
Write-Host ""

# Tester la connexion
try {
    $result = & psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Connexion réussie!" -ForegroundColor Green
        Write-Host ""
    } else {
        throw "Connexion échouée"
    }
} catch {
    Write-Host "✗ Erreur de connexion à PostgreSQL" -ForegroundColor Red
    Write-Host "Vérifiez que PostgreSQL est démarré et que les informations de connexion sont correctes."
    Write-Host "Assurez-vous que psql est installé et accessible dans le PATH."
    exit 1
}

# Vérifier les tables existantes
Write-Host "Tables existantes dans la base de données:"
& psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "\dt"
Write-Host ""

# Vérifier la structure de la table profiles
Write-Host "Vérification de la table 'profiles'..."
$profilesExists = & psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "\d profiles" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Table 'profiles' trouvée" -ForegroundColor Green
    
    # Vérifier si password_hash existe
    if ($profilesExists -match "password_hash") {
        Write-Host "✓ Colonne 'password_hash' existe" -ForegroundColor Green
    } else {
        Write-Host "✗ Colonne 'password_hash' manquante" -ForegroundColor Yellow
        Write-Host "Ajout de la colonne password_hash..."
        & psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);"
        Write-Host "✓ Colonne ajoutée" -ForegroundColor Green
    }
    
    # Vérifier si email_confirmed_at existe
    if ($profilesExists -match "email_confirmed_at") {
        Write-Host "✓ Colonne 'email_confirmed_at' existe" -ForegroundColor Green
    } else {
        Write-Host "✗ Colonne 'email_confirmed_at' manquante" -ForegroundColor Yellow
        Write-Host "Ajout de la colonne email_confirmed_at..."
        & psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"
        Write-Host "✓ Colonne ajoutée" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Table 'profiles' non trouvée" -ForegroundColor Red
    Write-Host "Assurez-vous d'avoir importé la base de données depuis Supabase"
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Configuration terminée avec succès!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines étapes:"
Write-Host "1. Créez un fichier .env.local à la racine du projet"
Write-Host "2. Copiez le contenu de .env.example dans .env.local"
Write-Host "3. Lancez l'application avec: npm run dev"
Write-Host ""

