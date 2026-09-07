import { createClient } from '@supabase/supabase-js';

// Support both Supabase's current publishable-key name and the legacy anon-key
// name. This makes Netlify/older project configurations easier to migrate.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
);

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Add it to Netlify Site configuration > Environment variables.'
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY). Add it to Netlify Site configuration > Environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
