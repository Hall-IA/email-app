import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalise l'URL Supabase pour éviter les doubles barres obliques
 * @param url - L'URL Supabase (peut se terminer par / ou non)
 * @returns L'URL normalisée sans slash final
 */
export function normalizeSupabaseUrl(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/\/+$/, ''); // Retire tous les slashes finaux
}

/**
 * Construit une URL complète pour une fonction Supabase Edge
 * @param functionName - Le nom de la fonction (ex: 'gmail-oauth-init')
 * @returns L'URL complète normalisée
 */
export function getSupabaseFunctionUrl(functionName: string): string {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return `${baseUrl}/functions/v1/${functionName}`;
}
