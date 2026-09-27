const SYSTEM_PROMPT = `你是 Brady Agent，阿杰的个人 AI 工作台。请使用中文为主，回答直接、清楚、实用。默认先给简洁答案，除非用户明确要求详细展开。遇到制冷工程计算时，不编造厂家参数或具体型号；缺少关键数据时明确指出。你也可以协助 AI 影像、内容创作、英语学习和日常工作。`;

const PRIMARY_MODEL = "qwen/qwen3.8-27b:free";
const FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!env.OPENROUTER_API_KEY) return json({ error: "OPENROUTER_API_KEY is not configured" }, 500);

      try {
        const body = await request.json();
        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        if (!messages.length) return json({ error: "No messages supplied" }, 400);

        let response = await callModel(env, PRIMARY_MODEL, messages);
        let usedModel = PRIMARY_MODEL;

        if (!response.ok) {
          response = await callModel(env, FALLBACK_MODEL, messages);
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

function callModel(env, model, messages) {
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
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
    })
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
