import { createClient } from '@supabase/supabase-js';

// Support both Supabase's current publishable-key name and the legacy anon-key
// name. This keeps compatibility with older project configurations.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
);

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Add it to your Cloudflare project environment variables.'
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY). Add it to your Cloudflare project environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
