const SYSTEM_PROMPT = `你是 Brady Agent，阿杰的个人 AI 工作台。请使用中文为主，回答直接、清楚、实用。默认先给简洁答案，除非用户明确要求详细展开。遇到制冷工程计算时，不编造厂家参数或具体型号；缺少关键数据时明确指出。你也可以协助 AI 影像、内容创作、英语学习和日常工作。

你可能会收到“长期记忆”作为额外上下文。只把它当作用户此前明确保存的信息使用；若与用户当前说法冲突，以当前说法为准。不要声称记得未提供的信息。`;

const PRIMARY_MODEL = "qwen/qwen3.8-27b:free";
const FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/memory") {
      if (!env.brady_agent_memory) return json({ error: "Memory database is not configured" }, 500);

      if (request.method === "GET") {
        const result = await env.brady_agent_memory
          .prepare("SELECT id, category, content, created_at, updated_at FROM memories ORDER BY updated_at DESC, id DESC LIMIT 100")
          .all();
        return json({ memories: result.results || [] });
      }

      if (request.method === "POST") {
        try {
          const body = await request.json();
          const content = typeof body.content === "string" ? body.content.trim() : "";
          const category = typeof body.category === "string" && body.category.trim()
            ? body.category.trim().slice(0, 50)
            : "general";

          if (!content) return json({ error: "Memory content is required" }, 400);
          if (content.length > 2000) return json({ error: "Memory is too long" }, 400);

          const result = await env.brady_agent_memory
            .prepare("INSERT INTO memories (category, content) VALUES (?, ?)")
            .bind(category, content)
            .run();

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

        const memories = await loadMemories(env);
        const systemPrompt = memories.length
          ? `${SYSTEM_PROMPT}\n\n【长期记忆】\n${memories.map((m) => `- [${m.category}] ${m.content}`).join("\n")}`
          : SYSTEM_PROMPT;

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
            "X-Brady-Model": usedModel
          }
        });
      } catch (error) {
        return json({ error: error?.message || "Request failed" }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

async function loadMemories(env) {
  if (!env.brady_agent_memory) return [];
  try {
    const result = await env.brady_agent_memory
      .prepare("SELECT category, content FROM memories ORDER BY updated_at DESC, id DESC LIMIT 30")
      .all();
    return result.results || [];
  } catch {
    return [];
  }
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
      model,
      stream: true,
      max_tokens: 900,
      temperature: 0.6,
      messages: [{ role: "system", content: systemPrompt }, ...messages]
    })
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
