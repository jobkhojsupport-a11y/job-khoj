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
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data, error } = await supabase
  .from('content_records')
  .select('kind,id,payload,published,updated_at')
  .in('kind', ['jobs', 'blog'])
  .eq('published', true);

if (error) throw error;

const urls = [
  { path: '/', lastmod: null },
  { path: '/jobs', lastmod: null },
  { path: '/exams', lastmod: null },
  { path: '/results', lastmod: null },
  { path: '/admit-cards', lastmod: null },
  { path: '/blog', lastmod: null }
];

for (const row of data || []) {
  const payload = row.payload || {};
  const slug = String(payload.slug || row.id || '').trim();
  if (!slug) continue;
  urls.push({
    path: `/${row.kind === 'jobs' ? 'job' : 'article'}/${encodeURIComponent(slug)}`,
    lastmod: row.updated_at ? String(row.updated_at).slice(0, 10) : null
  });
}

const uniqueUrls = [...new Map(urls.map(item => [item.path, item])).values()];

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;')
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;')
       .replace(/'/g, '&apos;');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls.map(({path,lastmod}) =>
  `  <url><loc>${escapeXml(SITE_URL + path)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`
).join('\n')}
</urlset>
`;

fs.writeFileSync('public/sitemap.xml', xml);

console.log(`✅ Sitemap generated with ${uniqueUrls.length} URLs.`);
console.log(`   Published content records: ${(data || []).length}`);
console.log(`   Published jobs: ${(data || []).filter(r => r.kind === 'jobs').length}`);
console.log(`   Published articles: ${(data || []).filter(r => r.kind === 'blog').length}`);
