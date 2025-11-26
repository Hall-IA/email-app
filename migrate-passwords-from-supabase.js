/**
 * Script pour migrer les mots de passe depuis auth.users vers profiles.password_hash
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function migratePasswords() {
  const client = await pool.connect();
  
  try {
    console.log('\n========================================');
    console.log('Migration des mots de passe Supabase');
    console.log('========================================\n');

    // Compter les utilisateurs dans auth.users
    const authUsersCount = await client.query('SELECT COUNT(*) FROM auth.users');
    console.log(`📊 Utilisateurs dans auth.users: ${authUsersCount.rows[0].count}`);

    // Compter les utilisateurs dans profiles sans password_hash
    const profilesWithoutPassword = await client.query(
      'SELECT COUNT(*) FROM profiles WHERE password_hash IS NULL'
    );
    console.log(`📊 Utilisateurs dans profiles sans password_hash: ${profilesWithoutPassword.rows[0].count}\n`);

    // Migrer les mots de passe
    console.log('🔄 Migration en cours...\n');

    const result = await client.query(`
      UPDATE profiles p
      SET 
        password_hash = u.encrypted_password,
        email_confirmed_at = u.email_confirmed_at,
        updated_at = NOW()
      FROM auth.users u
      WHERE p.id = u.id
        AND p.password_hash IS NULL
        AND u.encrypted_password IS NOT NULL
      RETURNING p.email;
    `);

    console.log(`✅ ${result.rowCount} mots de passe migrés avec succès!\n`);

    if (result.rowCount > 0) {
      console.log('📧 Emails migrés:');
      result.rows.slice(0, 10).forEach(row => {
        console.log(`   - ${row.email}`);
      });
      if (result.rowCount > 10) {
        console.log(`   ... et ${result.rowCount - 10} autres`);
      }
      console.log('');
    }

    // Vérifier le résultat
    const finalCount = await client.query(
      'SELECT COUNT(*) FROM profiles WHERE password_hash IS NOT NULL'
    );
    console.log(`📊 Total d'utilisateurs avec password_hash maintenant: ${finalCount.rows[0].count}`);

    console.log('\n========================================');
    console.log('✅ Migration terminée avec succès!');
    console.log('========================================\n');
    console.log('Vous pouvez maintenant vous connecter avec vos anciens identifiants Supabase!\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    console.error('\nDétails:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migratePasswords().catch(console.error);

