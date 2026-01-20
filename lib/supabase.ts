
import { createClient } from '@supabase/supabase-js';

/**
 * Safely retrieves environment variables across different runtimes (Vite, Node, etc.)
 * to prevent runtime crashes when specific metadata structures are missing.
 */
const getEnvVar = (key: string): string | undefined => {
  // Try Vite/ESM style environment variables
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}

  // Try process.env style (injected by some bundlers/environments)
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {}

  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase configuration warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined. ' +
    'Please ensure your environment variables are correctly configured for database connectivity.'
  );
}

// Create client with fallback values to prevent initialization crash.
// The URL must be a valid string to avoid "Invalid URL" errors during instantiation.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
);
