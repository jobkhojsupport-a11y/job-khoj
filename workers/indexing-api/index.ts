interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  INDEXING_NOTIFY_SECRET: string;
  SITE_URL?: string;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_INDEXING_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const SITE = 'https://jobkhoj.in';

function base64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function accessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  if (!response.ok) throw new Error(`Google OAuth token request failed: ${await response.text()}`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error('Google OAuth response did not contain access_token');
  return data.access_token;
}

async function publish(url: string, type: 'URL_UPDATED' | 'URL_DELETED', env: Env) {
  if (!url.startsWith(`${env.SITE_URL || SITE}/job/`)) throw new Error('Only Job Khoj job URLs may be submitted by this endpoint.');
  const token = await accessToken(env);
  const response = await fetch(GOOGLE_INDEXING_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ url, type })
  });
  if (!response.ok) throw new Error(`Google Indexing API failed: ${await response.text()}`);
  return await response.json();
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
    if (request.headers.get('authorization') !== `Bearer ${env.INDEXING_NOTIFY_SECRET}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const body = await request.json() as { url?: string; type?: 'URL_UPDATED' | 'URL_DELETED' };
      if (!body.url || !body.type) return Response.json({ error: 'url and type are required' }, { status: 400 });
      const result = await publish(body.url, body.type, env);
      return Response.json({ ok: true, result });
    } catch (error) {
      return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
  }
};
