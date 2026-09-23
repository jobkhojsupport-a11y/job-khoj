const esc = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SITE_URL?: string;
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = (env.SITE_URL || requestOrigin).replace(/\/$/, '');
  const base = configuredOrigin;
  const urls: Array<{ loc: string; lastmod?: string }> = [
    { loc: `${base}/` },
    { loc: `${base}/jobs` },
    { loc: `${base}/exams` },
    { loc: `${base}/results` },
    { loc: `${base}/admit-cards` },
    { loc: `${base}/blog` },
    { loc: `${base}/about` },
    { loc: `${base}/contact` },
    { loc: `${base}/privacy-policy` },
    { loc: `${base}/terms` },
    { loc: `${base}/disclaimer` },
    { loc: `${base}/editorial-policy` }
  ];

  const supabaseUrl = env.SUPABASE_URL?.trim();
  const key = (env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (supabaseUrl && key) {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    for (const kind of ['jobs', 'blog', 'admit_cards']) {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/content_records?select=id,payload,updated_at&kind=eq.${kind}&published=eq.true`;
      const response = await fetch(endpoint, { headers });
      if (response.ok) {
        const rows = await response.json() as Array<{ id?: string; payload?: { slug?: string; examName?: string }; updated_at?: string }>;
        for (const row of rows) {
          const slug = row?.payload?.slug;
          const id = row.id;
          const key = slug || (kind === 'admit_cards' ? `${String(row?.payload?.examName || 'admit-card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(id || '').slice(0, 8)}` : '');
          if (!key) continue;
          urls.push({
            loc: `${base}/${kind === 'jobs' ? 'job' : kind === 'blog' ? 'article' : 'admit-card'}/${encodeURIComponent(key)}`,
            lastmod: row.updated_at || undefined
          });
        }
      }
    }
  }

  const unique = [...new Map(urls.map(item => [item.loc, item])).values()];
  const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    unique.map(item => `<url><loc>${esc(item.loc)}</loc>${item.lastmod ? `<lastmod>${esc(item.lastmod.slice(0, 10))}</lastmod>` : ''}</url>`).join('') +
    '</urlset>';

  return new Response(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
};
