/**
 * Ce fichier a été modifié pour utiliser PostgreSQL au lieu de Supabase
 * VERSION CLIENT UNIQUEMENT - utilise les API routes
 * 
 * Pour le code côté serveur (API routes), utilisez src/lib/supabase-server.ts
 */

import { supabase as clientSupabase, from as clientFrom } from './supabase-compat-client';

export const supabase = clientSupabase;
export const from = clientFrom;

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
