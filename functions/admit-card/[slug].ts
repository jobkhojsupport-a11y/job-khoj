interface AdmitCard {
  id: string;
  kind: string;
  published: boolean;
  payload: {
    slug?: string;
    examName?: string;
    org?: string;
    releaseDate?: string;
    examDate?: string;
    description?: string;
    featuredImage?: string;
  };
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
}

interface Context {
  request: Request;
  params: { slug: string };
  env: Env;
}

const attr = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const slugFor = (card: AdmitCard): string => {
  const name = card.payload.slug || card.payload.examName || 'admit-card';
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'admit-card';
  return card.payload.slug ? base : `${base}-${card.id.slice(0, 8)}`;
};

const replaceMeta = (html: string, property: string, content: string): string => {
  const safe = attr(content);
  const pattern = new RegExp(`<meta\\s+property=["']${property}["'][^>]*>`, 'i');
  const replacement = `<meta property="${property}" content="${safe}" />`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `  ${replacement}\n</head>`);
};

const replaceNamedMeta = (html: string, name: string, content: string): string => {
  const safe = attr(content);
  const pattern = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
  const replacement = `<meta name="${name}" content="${safe}" />`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `  ${replacement}\n</head>`);
};

export const onRequestGet = async ({ request, params, env }: Context): Promise<Response> => {
  const fallback = () => env.ASSETS.fetch(request);
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey) return fallback();

  try {
    const endpoint = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/content_records`);
    endpoint.searchParams.set('select', 'id,kind,published,payload');
    endpoint.searchParams.set('kind', 'eq.admit_cards');
    endpoint.searchParams.set('published', 'eq.true');
    endpoint.searchParams.set('limit', '1000');
    const response = await fetch(endpoint, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` }
    });
    if (!response.ok) return fallback();

    const cards = await response.json() as AdmitCard[];
    const card = cards.find(item => item.published && (item.payload.slug === params.slug || item.id === params.slug || slugFor(item) === params.slug));
    if (!card) return fallback();

    const asset = await fallback();
    if (!asset.ok || !asset.headers.get('content-type')?.includes('text/html')) return asset;

    const title = `${card.payload.examName || 'Admit Card'} | JOB KHOJ`;
    const description = `${card.payload.examName || 'Admit Card'} from ${card.payload.org || ''}. Release date: ${card.payload.releaseDate || 'To be announced'}. Exam date: ${card.payload.examDate || 'To be announced'}.`;
    const url = new URL(`/admit-card/${encodeURIComponent(slugFor(card))}`, request.url).href;
    let html = await asset.text();
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${attr(title)}</title>`);
    html = replaceMeta(html, 'og:title', title);
    html = replaceMeta(html, 'og:description', description);
    html = replaceMeta(html, 'og:url', url);
    html = replaceMeta(html, 'og:type', 'article');
    html = replaceMeta(html, 'og:image', new URL('/icon-512.png', request.url).href);
    html = replaceNamedMeta(html, 'twitter:card', 'summary_large_image');
    html = replaceNamedMeta(html, 'twitter:title', title);
    html = replaceNamedMeta(html, 'twitter:description', description);
    html = replaceNamedMeta(html, 'twitter:image', new URL('/icon-512.png', request.url).href);
    const headers = new Headers(asset.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'public, max-age=60, stale-while-revalidate=300');
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('etag');
    return new Response(html, { status: asset.status, statusText: asset.statusText, headers });
  } catch {
    return fallback();
  }
};
