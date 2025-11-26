#!/bin/bash

# Script pour tester la connexion PostgreSQL et préparer la base de données

echo "======================================"
echo "Configuration PostgreSQL pour Email App"
echo "======================================"
echo ""

# Variables de connexion
PGHOST="172.17.0.2"
PGPORT="5432"
PGDATABASE="postgres"
PGUSER="postgres"
PGPASSWORD="postgres123"

export PGPASSWORD

echo "Test de connexion à PostgreSQL..."
echo "Host: $PGHOST"
echo "Port: $PGPORT"
echo "Database: $PGDATABASE"
echo "User: $PGUSER"
echo ""

# Tester la connexion
if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✓ Connexion réussie!"
    echo ""
else
    echo "✗ Erreur de connexion à PostgreSQL"
    echo "Vérifiez que PostgreSQL est démarré et que les informations de connexion sont correctes."
    exit 1
fi

# Vérifier les tables existantes
echo "Tables existantes dans la base de données:"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "\dt" 2>/dev/null
echo ""

# Vérifier la structure de la table profiles
echo "Vérification de la table 'profiles'..."
if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "\d profiles" > /dev/null 2>&1; then
    echo "✓ Table 'profiles' trouvée"
    
    # Vérifier si password_hash existe
    if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "\d profiles" 2>/dev/null | grep -q "password_hash"; then
        echo "✓ Colonne 'password_hash' existe"
    else
        echo "✗ Colonne 'password_hash' manquante"
        echo "Ajout de la colonne password_hash..."
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);" 2>/dev/null
        echo "✓ Colonne ajoutée"
    fi
    
    # Vérifier si email_confirmed_at existe
    if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "\d profiles" 2>/dev/null | grep -q "email_confirmed_at"; then
        echo "✓ Colonne 'email_confirmed_at' existe"
    else
        echo "✗ Colonne 'email_confirmed_at' manquante"
        echo "Ajout de la colonne email_confirmed_at..."
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();" 2>/dev/null
        echo "✓ Colonne ajoutée"
    fi
else
    echo "✗ Table 'profiles' non trouvée"
    echo "Assurez-vous d'avoir importé la base de données depuis Supabase"
    exit 1
fi

echo ""
echo "======================================"
echo "Configuration terminée avec succès!"
echo "======================================"
echo ""
echo "Prochaines étapes:"
echo "1. Créez un fichier .env.local à la racine du projet"
echo "2. Copiez le contenu de .env.example dans .env.local"
echo "3. Lancez l'application avec: npm run dev"
echo ""

