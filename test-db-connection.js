/**
 * Script de test pour vérifier la connexion PostgreSQL
 * Exécutez: node test-db-connection.js
 */

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Configuration de connexion
const pool = new Pool({
  host: process.env.POSTGRES_HOST || '172.17.0.2',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
});

async function testConnection() {
  console.log('========================================');
  console.log('Test de connexion PostgreSQL');
  console.log('========================================\n');

  console.log('Configuration:');
  console.log(`  Host: ${pool.options.host}`);
  console.log(`  Port: ${pool.options.port}`);
  console.log(`  Database: ${pool.options.database}`);
  console.log(`  User: ${pool.options.user}`);
  console.log('');

  try {
    // Test de connexion
    console.log('1. Test de connexion...');
    const client = await pool.connect();
    console.log('   ✓ Connexion réussie!\n');

    // Vérifier la version de PostgreSQL
    console.log('2. Version PostgreSQL:');
    const versionResult = await client.query('SELECT version()');
    console.log(`   ${versionResult.rows[0].version.split('\n')[0]}\n`);

    // Vérifier que la table profiles existe
    console.log('3. Vérification de la table profiles...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('   ✓ Table profiles trouvée\n');

      // Vérifier les colonnes
      console.log('4. Colonnes de la table profiles:');
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        ORDER BY ordinal_position;
      `);

      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
        console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`);
      });
      console.log('');

      // Vérifier si password_hash existe
      const hasPasswordHash = columnsResult.rows.some(col => col.column_name === 'password_hash');
      const hasEmailConfirmed = columnsResult.rows.some(col => col.column_name === 'email_confirmed_at');

      if (!hasPasswordHash) {
        console.log('   ⚠ ATTENTION: La colonne password_hash est manquante!');
        console.log('   Exécutez cette commande pour l\'ajouter:');
        console.log('   ALTER TABLE profiles ADD COLUMN password_hash VARCHAR(255);');
        console.log('');
      }

      if (!hasEmailConfirmed) {
        console.log('   ⚠ ATTENTION: La colonne email_confirmed_at est manquante!');
        console.log('   Exécutez cette commande pour l\'ajouter:');
        console.log('   ALTER TABLE profiles ADD COLUMN email_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
        console.log('');
      }

      if (hasPasswordHash && hasEmailConfirmed) {
        console.log('   ✓ Toutes les colonnes nécessaires sont présentes\n');
      }

      // Compter les utilisateurs
      const countResult = await client.query('SELECT COUNT(*) FROM profiles');
      console.log(`5. Nombre d'utilisateurs: ${countResult.rows[0].count}\n`);

    } else {
      console.log('   ✗ Table profiles NON TROUVÉE!');
      console.log('   Assurez-vous d\'avoir importé votre base de données depuis Supabase\n');
    }

    client.release();

    console.log('========================================');
    console.log('✓ Test terminé avec succès!');
    console.log('========================================');

  } catch (error) {
    console.error('\n✗ Erreur de connexion:');
    console.error(`   ${error.message}`);
    console.error('\nVérifiez que:');
    console.error('  1. PostgreSQL est démarré');
    console.error('  2. L\'adresse IP et le port sont corrects');
    console.error('  3. Le username et password sont corrects');
    console.error('  4. Vous avez créé le fichier .env.local avec les bonnes informations');
    console.error('\n========================================');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

