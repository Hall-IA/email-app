import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Pendant le build (SSG), les variables peuvent ne pas être disponibles
// Mais ce n'est pas grave car le client Supabase n'est utilisé que côté client
if (!supabaseUrl || !supabaseAnonKey) {
    // En mode build/développement sans variables, créer un client dummy
    if (typeof window === 'undefined') {
        // Côté serveur pendant le build : créer un client avec des valeurs par défaut
        console.warn('⚠️ Supabase environment variables not found during build. Using placeholder values.');
    } else {
        // Côté client : les variables doivent être présentes
        throw new Error('Missing Supabase environment variables');
    }
}

// Utiliser les vraies valeurs si disponibles, sinon des placeholders pour le build
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

export const supabase = createClient(finalUrl, finalKey);

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
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    company_name?: string | null;
                    smtp_host?: string | null;
                    smtp_port?: number | null;
                    imap_host?: string | null;
                    imap_port?: number | null;
                    created_at?: string;
                    updated_at?: string;
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
                Insert: {
                    id?: string;
                    user_id: string;
                    category_id?: string | null;
                    sender_email: string;
                    sender_name?: string | null;
                    subject: string;
                    body: string;
                    received_at?: string;
                    is_read?: boolean;
                    ai_suggested_reply?: string | null;
                    reply_sent?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    category_id?: string | null;
                    sender_email?: string;
                    sender_name?: string | null;
                    subject?: string;
                    body?: string;
                    received_at?: string;
                    is_read?: boolean;
                    ai_suggested_reply?: string | null;
                    reply_sent?: boolean;
                    created_at?: string;
                };
            };
        };
    };
};
