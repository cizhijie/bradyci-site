export const VISITOR_LIMITS = {
  daily: 10,
  perMinute: 3
};

export async function checkVisitorLimit(request, env) {
  if (!env.brady_agent_memory) return { ok: false, reason: "storage" };

  const fingerprint = await makeFingerprint(request);
  const now = new Date();
  const dayPeriod = "day:" + now.toISOString().slice(0, 10);
  const minutePeriod = "minute:" + now.toISOString().slice(0, 16);

  try {
    await env.brady_agent_memory.prepare(
      "CREATE TABLE IF NOT EXISTS visitor_usage (fingerprint TEXT NOT NULL, period TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (fingerprint, period))"
    ).run();

    const dayRow = await env.brady_agent_memory.prepare(
      "SELECT count FROM visitor_usage WHERE fingerprint = ? AND period = ?"
    ).bind(fingerprint, dayPeriod).first();

    if ((dayRow?.count || 0) >= VISITOR_LIMITS.daily) {
      return { ok: false, reason: "daily" };
    }

    const minuteRow = await env.brady_agent_memory.prepare(
      "SELECT count FROM visitor_usage WHERE fingerprint = ? AND period = ?"
    ).bind(fingerprint, minutePeriod).first();

    if ((minuteRow?.count || 0) >= VISITOR_LIMITS.perMinute) {
      return { ok: false, reason: "minute" };
    }

    await increment(env, fingerprint, dayPeriod);
    await increment(env, fingerprint, minutePeriod);
    return { ok: true };
  } catch {
    return { ok: false, reason: "storage" };
  }
}

async function increment(env, fingerprint, period) {
  await env.brady_agent_memory.prepare(
    "INSERT INTO visitor_usage (fingerprint, period, count, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP) ON CONFLICT(fingerprint, period) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP"
  ).bind(fingerprint, period).run();
}

async function makeFingerprint(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ua = request.headers.get("User-Agent") || "";
  const bytes = new TextEncoder().encode(ip + "|" + ua);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}
