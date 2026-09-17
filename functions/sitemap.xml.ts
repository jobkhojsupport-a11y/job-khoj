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
    { loc: `${base}/blog` }
  ];

  const supabaseUrl = env.SUPABASE_URL?.trim();
  const key = (env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (supabaseUrl && key) {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    for (const kind of ['jobs', 'blog']) {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/content_records?select=payload,updated_at&kind=eq.${kind}&published=eq.true`;
      const response = await fetch(endpoint, { headers });
      if (response.ok) {
        const rows = await response.json() as Array<{ payload?: { slug?: string }; updated_at?: string }>;
        for (const row of rows) {
          const slug = row?.payload?.slug;
          if (!slug) continue;
          urls.push({
            loc: `${base}/${kind === 'jobs' ? 'job' : 'article'}/${encodeURIComponent(slug)}`,
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
