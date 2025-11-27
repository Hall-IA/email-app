#!/bin/bash
set -e  

PROJECT_DIR="/var/www/email-app"
BRANCH="main"
PM2_APP_NAME="email-app"
PORT=3001

echo ":rocket: Début du déploiement de email-app..."
cd "$PROJECT_DIR"

echo ":package: Récupération des dernières modifications depuis Git..."
git fetch origin
git reset --hard "origin/$BRANCH"

echo ":inbox_tray: Installation des dépendances npm"
npm install --legacy-peer-deps

echo ":construction_site: Construction du projet (npm run build)"
npm run build

echo ":repeat: Redémarrage de l'application avec PM2"
pm2 delete "$PM2_APP_NAME" || true

# Démarre ton app Next via npm start (qui doit lancer "next start")
pm2 start npm --name "$PM2_APP_NAME" -- start -- -p $PORT

echo ":floppy_disk: Sauvegarde de la configuration PM2"
pm2 save

echo ":white_check_mark: Déploiement terminé avec succès ! " 