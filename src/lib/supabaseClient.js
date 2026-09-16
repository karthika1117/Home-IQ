import { createClient } from '@supabase/supabase-js';

const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta && import.meta.env ? import.meta.env : {});
const supabaseUrl = env.VITE_SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta?.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'HomeIQ: Supabase environment variables are not set. ' +
    'Copy .env.example to .env.local and fill in your credentials.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);

