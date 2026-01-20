import { createClient } from '@supabase/supabase-js';

// Access environment variables directly without casting.
// Vite replaces these statically at build time.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Environment Variables. Please check your .env file.');
}

// Create client with fallback values to prevent runtime crash if keys are missing
// Data fetching will fail gracefully in the store if keys are invalid.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);