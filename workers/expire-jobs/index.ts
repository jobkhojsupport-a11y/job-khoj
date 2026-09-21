interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(expireJobs(env));
  },
  async fetch(_request: Request, env: Env) {
    const result = await expireJobs(env);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  }
};

async function expireJobs(env: Env) {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return { ok: false, error: 'Supabase scheduler is not configured.' };

  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/expire_due_jobs`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json'
    },
    body: '{}'
  });
  if (!response.ok) return { ok: false, error: await response.text() };
  const data = await response.json();
  return { ok: true, expiredOrUpdated: Number(data) || 0 };
}
