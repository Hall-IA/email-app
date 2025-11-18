#!/bin/bash

# Script de déploiement sur Netlify
# Usage: ./deploy-netlify.sh

echo "🚀 Déploiement sur Netlify"
echo "=========================="
echo ""

# Vérifier que Netlify CLI est installé
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI n'est pas installé."
    echo "Installez-le avec: npm install -g netlify-cli"
    exit 1
fi

echo "✅ Netlify CLI est installé"
echo ""

# Vérifier si l'utilisateur est connecté
if ! netlify status &> /dev/null; then
    echo "🔐 Vous devez vous connecter à Netlify"
    echo "Exécution de: netlify login"
    netlify login
fi

echo ""
echo "📋 Vérification de la configuration..."
echo ""

# Vérifier si le site est déjà initialisé
if [ ! -f ".netlify/state.json" ]; then
    echo "🔧 Initialisation du projet Netlify..."
    echo "Répondez aux questions suivantes :"
    echo "  - Créez un nouveau site : Oui"
    echo "  - Nom du site : (laissez vide pour un nom aléatoire)"
    echo "  - Build command : npm run build"
    echo "  - Publish directory : .next (ou laissez vide)"
    echo ""
    netlify init
else
    echo "✅ Le projet est déjà initialisé"
fi

echo ""
echo "📝 Configuration des variables d'environnement..."
echo ""
echo "⚠️  IMPORTANT: Vous devez configurer ces variables :"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID (si utilisé)"
echo ""
read -p "Voulez-vous configurer les variables maintenant ? (o/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo ""
    read -p "NEXT_PUBLIC_SUPABASE_URL: " SUPABASE_URL
    if [ ! -z "$SUPABASE_URL" ]; then
        netlify env:set NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL"
    fi
    
    echo ""
    read -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_KEY
    if [ ! -z "$SUPABASE_KEY" ]; then
        netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_KEY"
    fi
    
    echo ""
    read -p "NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID (optionnel, appuyez sur Entrée pour ignorer): " STRIPE_ID
    if [ ! -z "$STRIPE_ID" ]; then
        netlify env:set NEXT_PUBLIC_STRIPE_BASE_PLAN_PRICE_ID "$STRIPE_ID"
    fi
fi

echo ""
echo "🚀 Déploiement..."
echo ""
echo "Choisissez le type de déploiement :"
echo "1) Déploiement de test (preview)"
echo "2) Déploiement en production"
read -p "Votre choix (1 ou 2): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[1]$ ]]; then
    echo "📦 Déploiement de test..."
    netlify deploy
elif [[ $REPLY =~ ^[2]$ ]]; then
    echo "📦 Déploiement en production..."
    netlify deploy --prod
else
    echo "❌ Choix invalide"
    exit 1
fi

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "📝 Pour voir les logs et la configuration :"
echo "   netlify open"
echo ""

