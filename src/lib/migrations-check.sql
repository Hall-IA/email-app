-- Script SQL pour vérifier que les tables nécessaires existent dans PostgreSQL
-- Exécutez ce script pour vous assurer que votre base de données est correctement configurée

-- Vérifier que la table profiles existe et a les bonnes colonnes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Si la colonne password_hash n'existe pas, l'ajouter
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'password_hash') THEN
        ALTER TABLE profiles ADD COLUMN password_hash VARCHAR(255);
    END IF;
END $$;

-- Si la colonne email_confirmed_at n'existe pas, l'ajouter
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email_confirmed_at') THEN
        ALTER TABLE profiles ADD COLUMN email_confirmed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Afficher toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

