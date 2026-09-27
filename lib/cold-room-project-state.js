// Owner-only D1 project state for refrigeration intake.
// Keeps one explicit cold-room project separate from ordinary chat history.

export async function ensureColdRoomProjectTable(env) {
  if (!env.brady_agent_memory) return false;
  await env.brady_agent_memory.prepare(`
    CREATE TABLE IF NOT EXISTS cold_room_project_state (
      owner_key TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  return true;
}

export async function loadColdRoomProjectState(env) {
  if (!(await ensureColdRoomProjectTable(env))) return null;
  const row = await env.brady_agent_memory.prepare(
    "SELECT state_json FROM cold_room_project_state WHERE owner_key = ?"
  ).bind("owner").first();
  if (!row?.state_json) return null;
  try { return JSON.parse(row.state_json); } catch { return null; }
}

export async function saveColdRoomProjectState(env, state) {
  if (!(await ensureColdRoomProjectTable(env))) return false;
  await env.brady_agent_memory.prepare(`
    INSERT INTO cold_room_project_state (owner_key, state_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(owner_key) DO UPDATE SET state_json = excluded.state_json, updated_at = CURRENT_TIMESTAMP
  `).bind("owner", JSON.stringify(state || {})).run();
  return true;
}

export async function clearColdRoomProjectState(env) {
  if (!(await ensureColdRoomProjectTable(env))) return false;
  await env.brady_agent_memory.prepare(
    "DELETE FROM cold_room_project_state WHERE owner_key = ?"
  ).bind("owner").run();
  return true;
}

export function mergeColdRoomProjectState(base = {}, patch = {}) {
  const merged = { ...base, ...patch };
  if (base.dimensions || patch.dimensions) merged.dimensions = { ...(base.dimensions || {}), ...(patch.dimensions || {}) };
  if (base.insulation || patch.insulation) merged.insulation = { ...(base.insulation || {}), ...(patch.insulation || {}) };
  if (base.floor || patch.floor) merged.floor = { ...(base.floor || {}), ...(patch.floor || {}) };
  if (base.doorUsage || patch.doorUsage) merged.doorUsage = { ...(base.doorUsage || {}), ...(patch.doorUsage || {}) };
  return merged;
}
