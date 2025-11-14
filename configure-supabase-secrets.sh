#!/bin/bash

# Script pour configurer les secrets Supabase Edge Functions
# Utilise les variables d'environnement du fichier .env

echo "🔐 Configuration des secrets Supabase Edge Functions..."
echo ""

# Vérifier que les variables d'environnement sont définies
if [ -f .env ]; then
    source .env
    echo "✅ Fichier .env trouvé"
else
    echo "❌ Fichier .env non trouvé"
    exit 1
fi

# Liste des secrets nécessaires
declare -A secrets=(
    ["STRIPE_SECRET_KEY"]="${STRIPE_SECRET_KEY}"
    ["STRIPE_WEBHOOK_SECRET"]="${STRIPE_WEBHOOK_SECRET}"
    ["STRIPE_PRICE_ID"]="${STRIPE_PRICE_ID}"
    ["STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID"]="${STRIPE_ADDITIONAL_ACCOUNT_PRICE_ID}"
    ["SUPABASE_URL"]="${NEXT_PUBLIC_SUPABASE_URL}"
    ["SUPABASE_SERVICE_ROLE_KEY"]="${SUPABASE_SERVICE_ROLE_KEY}"
    ["SUPABASE_ANON_KEY"]="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
    ["MICROSOFT_CLIENT_ID"]="${MICROSOFT_CLIENT_ID:-}"
    ["MICROSOFT_CLIENT_SECRET"]="${MICROSOFT_CLIENT_SECRET:-}"
    ["MICROSOFT_TENANT_ID"]="${MICROSOFT_TENANT_ID:-common}"
)

echo "📋 Secrets à configurer :"
for key in "${!secrets[@]}"; do
    if [ -z "${secrets[$key]}" ]; then
        echo "  ⚠️  $key : NON DÉFINI"
    else
        echo "  ✅ $key : Défini"
    fi
done

echo ""
echo "🚀 Configuration des secrets dans Supabase..."
echo ""

# Configurer chaque secret
for key in "${!secrets[@]}"; do
    value="${secrets[$key]}"
    if [ -z "$value" ]; then
        echo "⏭️  Ignoré: $key (non défini)"
    else
        echo "🔧 Configuration de $key..."
        npx supabase secrets set "$key=$value" || {
            echo "❌ Erreur lors de la configuration de $key"
        }
    fi
done

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📝 Pour vérifier les secrets configurés :"
echo "   npx supabase secrets list"
echo ""
echo "🚀 Pour déployer les fonctions :"
echo "   npx supabase functions deploy stripe-checkout"
echo "   npx supabase functions deploy stripe-webhook"
echo "   npx supabase functions deploy stripe-cancel-subscription"
echo "   # ... et toutes les autres fonctions"

