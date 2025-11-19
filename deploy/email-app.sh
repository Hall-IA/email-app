
set -e  

PROJECT_DIR="/var/www/email-app"
BRANCH="main"
PM2_APP_NAME="email-app"
PORT=3001

echo "Début du déploiement de email-app..."
cd "$PROJECT_DIR"

echo "Récupération des dernières modifications depuis Git..."
git pull origin main
git reset --hard "origin/$BRANCH"

echo "📥 Installation des dépendances npm"
npm install --legacy-peer-deps

echo "Construction du projet"
npm run build

echo "Redémarrage de l'application avec PM2"
pm2 delete "$PM2_APP_NAME" || true
pm2 start serve --name "$PM2_APP_NAME" -- -s dist -l $PORT

echo "Sauvegarde de la configuration PM2"
pm2 save

echo "Déploiement terminé avec succès ! "
