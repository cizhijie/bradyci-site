const SYSTEM_PROMPT = `你是 Brady Agent，阿杰的个人 AI 工作台。请使用中文为主，回答直接、清楚、实用。遇到制冷工程计算时，不编造厂家参数或具体型号；缺少关键数据时明确指出。你也可以协助 AI 影像、内容创作、英语学习和日常工作。`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      if (!env.OPENROUTER_API_KEY) {
        return json({ error: "OPENROUTER_API_KEY is not configured" }, 500);
      }

      try {
        const body = await request.json();
        const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
        if (!messages.length) return json({ error: "No messages supplied" }, 400);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://bradyci.com",
            "X-Title": "Brady Agent"
          },
          body: JSON.stringify({
            model: "openrouter/free",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
          })
        });

        const data = await response.json();
        if (!response.ok) {
          return json({ error: data?.error?.message || "Model request failed" }, response.status);
        }
        return json({ reply: data?.choices?.[0]?.message?.content || "模型没有返回内容。" });
      } catch (error) {
        return json({ error: error?.message || "Request failed" }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
