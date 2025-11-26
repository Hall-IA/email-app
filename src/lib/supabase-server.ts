/**
 * VERSION SERVEUR - Pour utilisation dans les API routes et Server Components uniquement
 * Ce fichier NE DOIT PAS être importé dans les composants client
 */

import { supabase as serverSupabase, from as serverFrom } from './supabase-compat';

export const supabase = serverSupabase;
export const from = serverFrom;

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
        };
      };
    };
  };
};

