/**
 * Script pour définir un mot de passe pour un utilisateur migré de Supabase
 * Usage: node set-user-password.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n========================================');
  console.log('Définir un mot de passe pour un compte migré');
  console.log('========================================\n');

  const email = await question('Email du compte: ');
  const password = await question('Nouveau mot de passe (min 6 caractères): ');

  if (!email || !password) {
    console.log('\n❌ Email et mot de passe sont requis');
    rl.close();
    return;
  }

  if (password.length < 6) {
    console.log('\n❌ Le mot de passe doit contenir au moins 6 caractères');
    rl.close();
    return;
  }

  console.log('\n⏳ Définition du mot de passe en cours...\n');

  try {
    const response = await fetch('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword: password }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`❌ Erreur: ${data.error}\n`);
      rl.close();
      return;
    }

    console.log('✅ Mot de passe défini avec succès!\n');
    console.log('Vous pouvez maintenant vous connecter avec:');
    console.log(`  Email: ${email}`);
    console.log(`  Mot de passe: ${password}`);
    console.log('\n========================================\n');

  } catch (error) {
    console.log(`\n❌ Erreur de connexion: ${error.message}`);
    console.log('Assurez-vous que le serveur est démarré (npm run dev)\n');
  }

  rl.close();
}

main().catch(console.error);

