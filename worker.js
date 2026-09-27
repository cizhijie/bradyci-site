const SYSTEM_PROMPT = `你是 Brady Agent，阿杰创建的个人 AI 工作台。请使用中文为主，回答直接、清楚、实用。默认先给简洁答案，除非用户明确要求详细展开。遇到制冷工程计算时，不编造厂家参数或具体型号；缺少关键数据时明确指出。你也可以协助 AI 影像、内容创作、英语学习和日常工作。

你可能会收到“Owner 私人长期记忆”作为额外上下文。只有已通过 Owner 身份验证时才会提供这些记忆。只把它们当作 Owner 此前明确保存的信息使用；若与 Owner 当前说法冲突，以当前说法为准。不要向未验证访客泄露 Owner 私人记忆，也不要声称记得未提供的信息。`;

const PRIMARY_MODEL = "qwen/qwen3.8-27b:free";
const FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const AGENT_VERSION = "v0.5";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/owner/login") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!env.OWNER_PIN) return json({ error: "OWNER_PIN is not configured" }, 500);
      const body = await request.json().catch(() => ({}));
      const ok = safeEqual(String(body.pin || ""), String(env.OWNER_PIN));
      return ok ? json({ ok: true, role: "owner" }) : json({ error: "Owner PIN 不正确" }, 401);
    }

    if (url.pathname === "/api/memory") {
      if (!isOwner(request, env)) return json({ error: "Owner authentication required" }, 401);
      if (!env.brady_agent_memory) return json({ error: "Memory database is not configured" }, 500);

      if (request.method === "GET") {
        const result = await env.brady_agent_memory
          .prepare("SELECT id, category, content, created_at, updated_at FROM memories ORDER BY updated_at DESC, id DESC LIMIT 100")
          .all();
        return json({ memories: result.results || [] });
      }

      if (request.method === "PUT") {
        try {
          const body = await request.json();
          const id = Number(body.id);
          const content = typeof body.content === "string" ? body.content.trim() : "";
          const category = typeof body.category === "string" && body.category.trim()
            ? body.category.trim().slice(0, 50) : "general";
          if (!Number.isInteger(id) || id <= 0) return json({ error: "Valid memory id is required" }, 400);
          if (!content) return json({ error: "Memory content is required" }, 400);
          if (content.length > 2000) return json({ error: "Memory is too long" }, 400);
          await env.brady_agent_memory
            .prepare("UPDATE memories SET category = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(category, content, id).run();
          return json({ ok: true });
        } catch (error) {
          return json({ error: error?.message || "Failed to update memory" }, 500);
        }
      }

      if (request.method === "POST") {
        try {
          const body = await request.json();
          const content = typeof body.content === "string" ? body.content.trim() : "";
          const category = typeof body.category === "string" && body.category.trim()
            ? body.category.trim().slice(0, 50) : "general";
          if (!content) return json({ error: "Memory content is required" }, 400);
          if (content.length > 2000) return json({ error: "Memory is too long" }, 400);
          const result = await env.brady_agent_memory
            .prepare("INSERT INTO memories (category, content) VALUES (?, ?)")
            .bind(category, content).run();
          return json({ ok: true, id: result.meta?.last_row_id });
        } catch (error) {
          return json({ error: error?.message || "Failed to save memory" }, 500);
        }
      }

      if (request.method === "DELETE") {
        const id = Number(url.searchParams.get("id"));
        if (!Number.isInteger(id) || id <= 0) return json({ error: "Valid memory id is required" }, 400);
        await env.brady_agent_memory.prepare("DELETE FROM memories WHERE id = ?").bind(id).run();
        return json({ ok: true });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!env.OPENROUTER_API_KEY) return json({ error: "OPENROUTER_API_KEY is not configured" }, 500);

      try {
        const body = await request.json();
        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        if (!messages.length) return json({ error: "No messages supplied" }, 400);

        const owner = isOwner(request, env);
        if (owner) {
          const latestUser = [...messages].reverse().find((m) => m?.role === "user" && typeof m.content === "string");
          if (latestUser) await processMemoryCandidate(env, latestUser.content);
        }
        const memories = owner ? await loadMemories(env) : [];
        const identityPrompt = owner
          ? "\n\n【当前身份】已验证 Owner。当前聊天者就是阿杰本人，可以使用下面的私人长期记忆来帮助他。"
          : "\n\n【当前身份】未验证访客。不要假定聊天者是阿杰，不得读取、透露或猜测阿杰的私人资料。";
        const memoryPrompt = memories.length
          ? `\n\n【Owner 私人长期记忆】\n${memories.map((m) => `- [${m.category}] ${m.content}`).join("\n")}`
          : "";
        const systemPrompt = SYSTEM_PROMPT + identityPrompt + memoryPrompt;

        let response = await callModel(env, PRIMARY_MODEL, messages, systemPrompt);
        let usedModel = PRIMARY_MODEL;
        if (!response.ok) {
          response = await callModel(env, FALLBACK_MODEL, messages, systemPrompt);
          usedModel = FALLBACK_MODEL;
        }
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return json({ error: data?.error?.message || "免费模型暂时不可用，请稍后再试。" }, response.status);
        }
        return new Response(response.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Brady-Model": usedModel,
            "X-Brady-Role": owner ? "owner" : "visitor"
          }
        });
      } catch (error) {
        return json({ error: error?.message || "Request failed" }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

function isOwner(request, env) {
  if (!env.OWNER_PIN) return false;
  return safeEqual(request.headers.get("X-Owner-Pin") || "", String(env.OWNER_PIN));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function processMemoryCandidate(env, text) {
  if (!env.brady_agent_memory || typeof text !== "string") return;
  const raw = text.trim();
  if (!raw || raw.length > 1200) return;

  const explicit = raw.match(/^(?:请)?(?:帮我)?记住[：:，,\s]*(.+)$/s);
  let content = explicit ? explicit[1].trim() : raw;
  if (!content) return;

  if (!explicit) {
    if (content.length < 8 || content.length > 800) return;
    if (/^(好|好的|可以|行|开始|继续|谢谢|收到|明白|知道了|没问题)[。！!？?]*$/.test(content)) return;
    if (/^(今天|刚才|现在|这次|临时|测试)/.test(content) && !/(以后|长期|一直|目标|计划|准备|考试)/.test(content)) return;
  }

  let category = null;
  const rules = [
    ["profile", /(?:我叫|我的名字|叫我|我是\d+岁|我今年\d+|我住在|我来自|我的职业|我从事|我有[一二两三四五六七八九\d]+个孩子)/],
    ["preference", /(?:我喜欢|我偏好|我不喜欢|我习惯|我希望你以后|以后回答我|以后请|我更喜欢|我倾向于)/],
    ["project", /(?:我正在(?:开发|做|搭建|运营)|我目前在(?:开发|做|搭建|运营)|我的项目|我准备长期做|我的网站|我的Agent|我的智能体)/i],
    ["work", /(?:我主要做|我的工作|我负责|我做制冷|我做冷库|我的客户|我的业务)/],
    ["learning", /(?:我正在学|我在学习|我的学习|学习目前|我的学习目标|我的考试|我要考|准备考|我想在\d+天|我计划学习|\d+月.*考试|已经完成第[一二三四五六七八九十\d]+章|完成第[一二三四五六七八九十\d]+章|学完第[一二三四五六七八九十\d]+章|学到第[一二三四五六七八九十\d]+章|开始学习第[一二三四五六七八九十\d]+章|开始第[一二三四五六七八九十\d]+章|开始刷题|正在刷题|错题|模拟考试|模拟卷)/]
  ];
  const found = rules.find(([, re]) => re.test(content));
  category = found?.[0] || (explicit ? "general" : null);
  if (!category) return;

  content = content.replace(/\s+/g, " ").slice(0, 800);

  const rows = await env.brady_agent_memory
    .prepare("SELECT id, category, content FROM memories ORDER BY updated_at DESC, id DESC LIMIT 100").all();
  const memories = rows.results || [];

  const normalized = normalizeMemory(content);
  if (memories.some((m) => normalizeMemory(m.content) === normalized)) return;

  const topic = memoryTopic(category, content);
  const related = topic
    ? memories.find((m) => m.category === category && memoryTopic(m.category, m.content) === topic)
    : null;

  // v0.5: same topic + same kind of fact is updated; goals and progress are kept separately.
  if (related) {
    const similarity = memorySimilarity(related.content, content);
    if (similarity >= 0.82) return;
    await env.brady_agent_memory
      .prepare("UPDATE memories SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(content, related.id).run();
    return;
  }

  await env.brady_agent_memory
    .prepare("INSERT INTO memories (category, content) VALUES (?, ?)")
    .bind(category, content).run();
}

function normalizeMemory(text) {
  return String(text).toLowerCase().replace(/[\s，。！？、,.!?;；:："'“”‘’（）()\-]/g, "");
}

function memoryTopic(category, text) {
  const rules = {
    profile: [
      ["name", /名字|我叫|叫我/], ["location", /住在|来自|常驻/],
      ["career", /职业|从事/], ["family", /孩子|家庭/]
    ],
    preference: [
      ["english-style", /英语|英式|发音|口音/],
      ["answer-style", /回答|简短|详细|直接/]
    ],
    project: [
      ["brady-agent", /Brady\s*Agent|Agent|智能体/i],
      ["website", /网站|bradyci/i]
    ],
    work: [["refrigeration", /制冷|冷库|冷风机|压缩机/]],
    learning: [
      ["economist-progress", /(?:经济师|工商管理).*(?:第[一二三四五六七八九十\d]+章|学完|学到|进度|刷题|错题|模拟)|(?:第[一二三四五六七八九十\d]+章|学完|学到|进度|刷题|错题|模拟).*(?:经济师|工商管理)/],
      ["economist-goal", /经济师|工商管理/],
      ["english-progress", /英语.*(?:学到|进度|练习了|完成)|(?:学到|进度|练习了|完成).*英语/],
      ["english-goal", /英语|口语|英式/]
    ]
  };
  const hit = (rules[category] || []).find(([, re]) => re.test(text));
  return hit?.[0] || null;
}

function memorySimilarity(a, b) {
  const x = memoryTokens(a), y = memoryTokens(b);
  if (!x.size || !y.size) return 0;
  let common = 0;
  for (const token of x) if (y.has(token)) common++;
  return common / Math.max(x.size, y.size);
}

function memoryTokens(text) {
  const s = normalizeMemory(text);
  const out = new Set();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

async function loadMemories(env) {
  if (!env.brady_agent_memory) return [];
  try {
    const result = await env.brady_agent_memory
      .prepare("SELECT category, content FROM memories ORDER BY updated_at DESC, id DESC LIMIT 30").all();
    return result.results || [];
  } catch { return []; }
}
function callModel(env, model, messages, systemPrompt) {
  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bradyci.com",
      "X-Title": "Brady Agent"
    },
    body: JSON.stringify({
      model, stream: true, max_tokens: 900, temperature: 0.6,
      messages: [{ role: "system", content: systemPrompt }, ...messages]
    })
  });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
