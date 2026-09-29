// Owner-only D1 project state for refrigeration intake.
// Keeps one explicit cold-room project separate from ordinary chat history.

export async function ensureColdRoomProjectTable(env) {
  if (!env.brady_agent_memory) return false;
  // Schema is deployed ahead of runtime. A read path must never perform DDL:
  // CREATE TABLE counts as a D1 write and can block otherwise read-only queries.
  try {
    await env.brady_agent_memory.prepare(
      "SELECT 1 FROM cold_room_project_state LIMIT 1"
    ).first();
    return true;
  } catch (error) {
    console.warn("cold-room state table unavailable:", error?.message || error);
    return false;
  }
}

function stateKey(projectId) { return "owner:" + String(projectId || "legacy"); }

export async function loadColdRoomProjectState(env, projectId) {
  if (!(await ensureColdRoomProjectTable(env))) return null;
  const row = await env.brady_agent_memory.prepare(
    "SELECT state_json FROM cold_room_project_state WHERE owner_key = ?"
  ).bind(stateKey(projectId)).first();
  if (!row?.state_json) return null;
  try { return JSON.parse(row.state_json); } catch { return null; }
}

export async function saveColdRoomProjectState(env, state, projectId) {
  if (!(await ensureColdRoomProjectTable(env))) return false;
  await env.brady_agent_memory.prepare(`
    INSERT INTO cold_room_project_state (owner_key, state_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(owner_key) DO UPDATE SET state_json = excluded.state_json, updated_at = CURRENT_TIMESTAMP
  `).bind(stateKey(projectId), JSON.stringify(state || {})).run();
  return true;
}

export async function clearColdRoomProjectState(env, projectId) {
  if (!(await ensureColdRoomProjectTable(env))) return false;
  await env.brady_agent_memory.prepare(
    "DELETE FROM cold_room_project_state WHERE owner_key = ?"
  ).bind(stateKey(projectId)).run();
  return true;
}

export function mergeColdRoomProjectState(base = {}, patch = {}) {
  const merged = { ...base, ...patch };
  if (base.dimensions || patch.dimensions) merged.dimensions = { ...(base.dimensions || {}), ...(patch.dimensions || {}) };
  if (base.insulation || patch.insulation) merged.insulation = { ...(base.insulation || {}), ...(patch.insulation || {}) };
  if (base.floor || patch.floor) merged.floor = { ...(base.floor || {}), ...(patch.floor || {}) };
  if (base.doorUsage || patch.doorUsage) merged.doorUsage = { ...(base.doorUsage || {}), ...(patch.doorUsage || {}) };
  if (base.internalLoads || patch.internalLoads) merged.internalLoads = { ...(base.internalLoads || {}), ...(patch.internalLoads || {}) };

  // Explicit L×W×H is authoritative geometry. Do not retain stale area/height/volume
  // from an older project or an earlier rough estimate.
  if (patch.dimensions?.lengthM && patch.dimensions?.widthM && patch.dimensions?.heightM) {
    const { lengthM, widthM, heightM } = patch.dimensions;
    merged.floorAreaM2 = lengthM * widthM;
    merged.heightM = heightM;
    merged.volumeM3 = lengthM * widthM * heightM;
  } else if (Number.isFinite(patch.floorAreaM2) || Number.isFinite(patch.heightM)) {
    const area = Number.isFinite(patch.floorAreaM2) ? patch.floorAreaM2 : merged.floorAreaM2;
    const height = Number.isFinite(patch.heightM) ? patch.heightM : merged.heightM;
    if (Number.isFinite(area) && Number.isFinite(height)) merged.volumeM3 = area * height;
  }
  return merged;
}
