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

const SITE_URL = 'https://job-khoj.jobkhojsupport.workers.dev';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data, error } = await supabase
  .from('content_records')
  .select('id,payload,published')
  .eq('kind', 'jobs')
  .eq('published', true);

if (error) throw error;

const urls = [
  '/',
  '/jobs',
  '/exams',
  '/results',
  '/admit-cards',
  '/blog'
];

for (const row of data || []) {
  const job = row.payload || {};
  const id = String(row.id || job.id || '').trim();
  const slug = String(job.slug || '').trim();

  if (!id) continue;

  const key = slug || id;
  urls.push(`/job/${encodeURIComponent(key)}`);
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
console.log(`   Published jobs: ${(data || []).length}`);
