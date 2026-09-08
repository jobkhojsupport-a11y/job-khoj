import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const cors = { 'Access-Control-Allow-Origin': Deno.env.get('PUBLIC_SITE_ORIGIN') || '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cors });
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors });
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: cors });
    const { data: owner } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('role', 'owner').maybeSingle();
    if (!owner) return new Response('Owner permission required', { status: 403, headers: cors });

    const input = await req.json();
    const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 120) : '';
    const body = typeof input?.body === 'string' ? input.body.trim().slice(0, 500) : '';
    const rawUrl = typeof input?.url === 'string' ? input.url.trim() : '/jobs';
    if (!title || !body) return new Response(JSON.stringify({error:'Title and body are required.'}), {status:400,headers:{...cors,'content-type':'application/json'}});
    let url = '/jobs';
    try { const u = new URL(rawUrl, Deno.env.get('PUBLIC_SITE_ORIGIN') || 'https://jobkhoj.example'); if (u.origin === (Deno.env.get('PUBLIC_SITE_ORIGIN') || u.origin)) url = u.pathname + u.search + u.hash; } catch {}

    const vapidSubject=Deno.env.get('VAPID_SUBJECT'), vapidPublic=Deno.env.get('VAPID_PUBLIC_KEY'), vapidPrivate=Deno.env.get('VAPID_PRIVATE_KEY'), supabaseUrl=Deno.env.get('SUPABASE_URL'), serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!vapidSubject||!vapidPublic||!vapidPrivate||!supabaseUrl||!serviceKey) return new Response(JSON.stringify({error:'Push service is not fully configured.'}),{status:500,headers:{...cors,'content-type':'application/json'}});
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: subs, error } = await admin.from('push_subscriptions').select('endpoint,p256dh,auth');
    if (error) throw error;
    let sent = 0, removed = 0;
    for (const sub of subs || []) {
      try { await webpush.sendNotification(sub, JSON.stringify({ title, body, url })); sent++; }
      catch (e:any) { if (e?.statusCode === 404 || e?.statusCode === 410) { await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); removed++; } }
    }
    return new Response(JSON.stringify({sent,removed}), {status:200,headers:{...cors,'content-type':'application/json'}});
  } catch (e) { return new Response(JSON.stringify({error:String(e)}), {status:500,headers:{...cors,'content-type':'application/json'}}); }
});
