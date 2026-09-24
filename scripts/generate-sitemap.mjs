import fs from 'node:fs';
import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const env = loadEnv('production', process.cwd(), '');

const SUPABASE_URL =
  env.VITE_SUPABASE_URL?.trim() ||
  process.env.VITE_SUPABASE_URL?.trim();

const SUPABASE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  env.VITE_SUPABASE_ANON_KEY?.trim() ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim();

const SITE_URL = 'https://jobkhoj.in';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  if (!fs.existsSync('public/sitemap.xml')) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY, and no existing public/sitemap.xml is available.'
    );
  }
  console.warn(
    'Supabase build variables are missing; keeping the existing public/sitemap.xml. Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Cloudflare Pages to generate an up-to-date sitemap.'
  );
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let data;
try {
  const result = await supabase
    .from('content_records')
    .select('kind,id,payload,published')
    .eq('published', true);

  if (result.error) throw result.error;
  data = result.data;
} catch (error) {
  // Builds should not require the production database to be reachable. Keep
  // the last committed sitemap when the request itself cannot reach Supabase;
  // schema, authentication, and query errors still fail the build.
  const message = String(error?.message || error);
  const isNetworkError = error instanceof TypeError || /fetch failed|network|timeout|econn|enotfound|eai_again/i.test(message);
  if (!isNetworkError) throw error;

  if (!fs.existsSync('public/sitemap.xml')) throw error;
  console.warn(`Supabase is unreachable; keeping the existing public/sitemap.xml. ${message}`);
  process.exit(0);
}

const urls = [
  '/',
  '/jobs',
  '/exams',
  '/results',
  '/admit-cards',
  '/blog',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/disclaimer',
  '/editorial-policy'
];

for (const row of data || []) {
  const payload = row.payload || {};
  const id = String(row.id || payload.id || '').trim();
  const slug = String(payload.slug || '').trim();
  if (!id) continue;
  const key = slug || id;
  if (row.kind === 'jobs') urls.push(`/job/${encodeURIComponent(key)}`);
  if (row.kind === 'blog') urls.push(`/article/${encodeURIComponent(key)}`);
  if (row.kind === 'admit_cards') urls.push(`/admit-card/${encodeURIComponent(payload.slug || `${String(payload.examName || 'admit-card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(0, 8)}`)}`);
}

const uniqueUrls = [...new Set(urls)];

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;')
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;')
       .replace(/'/g, '&apos;');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls.map(path =>
  `  <url><loc>${escapeXml(SITE_URL + path)}</loc></url>`
).join('\n')}
</urlset>
`;

fs.writeFileSync('public/sitemap.xml', xml);

console.log(`✅ Sitemap generated with ${uniqueUrls.length} URLs.`);
console.log(`   Published content records: ${(data || []).length}`);
