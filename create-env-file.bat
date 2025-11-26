@echo off
echo Creation du fichier .env.local...
echo.

(
echo # Configuration PostgreSQL
echo POSTGRES_HOST=localhost
echo POSTGRES_PORT=5433
echo POSTGRES_DB=postgres
echo POSTGRES_USER=postgres
echo POSTGRES_PASSWORD=postgres123
echo.
echo # JWT Secret ^(CHANGEZ EN PRODUCTION!^)
echo JWT_SECRET=votre-secret-jwt-tres-securise-changez-moi-en-production-12345
echo.
echo # Next.js
echo NODE_ENV=development
) > .env.local

echo.
echo ✓ Fichier .env.local cree avec succes!
echo.
echo Configuration PostgreSQL:
echo   Host: localhost
echo   Port: 5433
echo   Database: postgres
echo   User: postgres
echo.
echo Prochaines etapes:
echo   1. Testez la connexion: node test-db-connection.js
echo   2. Lancez l'application: npm run dev
echo.
pause

