#!/bin/bash
# Script de configuration initiale du VPS pour le CI/CD
# À exécuter une seule fois sur le serveur VPS

echo "🔧 Configuration du VPS pour le CI/CD..."

# Vérifier si git est installé
if ! command -v git &> /dev/null; then
    echo "📦 Installation de git..."
    yum install -y git || apt-get install -y git
fi

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "📦 Installation de Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs || apt-get install -y nodejs
fi

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation de PM2..."
    npm install -g pm2
fi

# Créer le dossier de l'application si nécessaire
if [ ! -d "/root/email-app" ]; then
    echo "📁 Clonage du repository..."
    cd /root
    git clone https://github.com/Hall-IA/email-app.git
    cd email-app
    npm install
    npm run build
fi

# Configurer PM2 pour démarrer au boot
pm2 startup
pm2 save

echo "✅ Configuration terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Configurez les variables d'environnement dans /root/email-app/.env"
echo "2. Démarrez l'application avec: pm2 start npm --name 'email-app' -- start"
echo "3. Configurez les secrets GitHub (voir instructions)"

