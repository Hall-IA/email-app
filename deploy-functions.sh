#!/bin/bash

# Script pour déployer toutes les fonctions Supabase Edge Functions

echo "🚀 Déploiement des fonctions Supabase Edge Functions..."
echo ""

# Vérifier si on est connecté à Supabase
if ! npx supabase functions list &>/dev/null; then
    echo "❌ Pas connecté à Supabase. Connexion..."
    npx supabase login
fi

# Vérifier si le projet est lié
if ! npx supabase status &>/dev/null; then
    echo "❌ Projet non lié. Liaison du projet..."
    echo "⚠️  Tu dois fournir le project-ref (ex: bgvknwdjlrhzcitdfvwq)"
    read -p "Project ref: " PROJECT_REF
    npx supabase link --project-ref "$PROJECT_REF"
fi

echo ""
echo "📦 Déploiement des fonctions..."
echo ""

# Liste des fonctions à déployer
FUNCTIONS=(
    "stripe-checkout"
    "stripe-add-account-checkout"
    "stripe-webhook"
    "stripe-cancel-subscription"
    "stripe-force-sync"
    "stripe-download-invoice"
    "gmail-oauth-init"
    "gmail-oauth-callback"
    "outlook-oauth-init"
    "outlook-oauth-callback"
    "verify-email-connection"
)

# Déployer chaque fonction
for func in "${FUNCTIONS[@]}"; do
    echo "🔄 Déploiement de $func..."
    npx supabase functions deploy "$func" || {
        echo "❌ Erreur lors du déploiement de $func"
        exit 1
    }
    echo "✅ $func déployée avec succès"
    echo ""
done

echo "🎉 Toutes les fonctions ont été déployées avec succès !"
echo ""
echo "⚠️  N'oublie pas de configurer les secrets Supabase si ce n'est pas déjà fait :"
echo "   ./configure-supabase-secrets.sh"






