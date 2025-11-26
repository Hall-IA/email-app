import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST || '172.17.0.2',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  // Configuration pour la production
  max: 20, // Nombre maximum de clients dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Créer un pool de connexions PostgreSQL
const pool = new Pool(poolConfig);

// Gestion des erreurs du pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Export du pool pour les requêtes
export default pool;

// Fonction utilitaire pour exécuter des requêtes
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Fonction pour obtenir un client du pool (pour les transactions)
export async function getClient() {
  const client = await pool.connect();
  return client;
}

// Types pour les tables de la base de données
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          company_name: string | null;
          smtp_host: string | null;
          smtp_port: number | null;
          imap_host: string | null;
          imap_port: number | null;
          created_at: string;
          updated_at: string;
          password_hash: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          company_name?: string | null;
          smtp_host?: string | null;
          smtp_port?: number | null;
          imap_host?: string | null;
          imap_port?: number | null;
          created_at?: string;
          updated_at?: string;
          password_hash: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          company_name?: string | null;
          smtp_host?: string | null;
          smtp_port?: number | null;
          imap_host?: string | null;
          imap_port?: number | null;
          created_at?: string;
          updated_at?: string;
          password_hash?: string;
        };
      };
      emails: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          sender_email: string;
          sender_name: string | null;
          subject: string;
          body: string;
          received_at: string;
          is_read: boolean;
          ai_suggested_reply: string | null;
          reply_sent: boolean;
          created_at: string;
        };
      };
    };
  };
};

