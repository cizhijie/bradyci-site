import { routeSkill, splitMemories } from "./skills/index.js";
import { checkVisitorLimit } from "./lib/visitor-limit.js";
import { calculateColdStorageLoad, calculateColdStorageLoadRange } from "./tools/cold-storage-load.js";
import { quickEstimateColdRoom } from "./tools/quick-cold-room-estimate.js";
import { referenceCompressorBandFromReviewedPerformance } from "./tools/compressor-duty-reference.js";
import { deriveEngineeringDuty } from "./tools/refrigeration-duty.js";
import { queryProvisionalDutyCandidates } from "./tools/provisional-compressor-search.js";
import { calculateProductLoad } from "./tools/product-load.js";
import { runRefrigerationTool, REFRIGERATION_TOOL_PROTOCOL, detectDeterministicRefrigerationRequest, detectManufacturerSelectionRequest, formatManufacturerSelectionResult, formatBitzerDirectPerformanceResult, formatColdRoomIntake, extractColdRoomProject, formatColdRoomProjectState } from "./tools/refrigeration-agent.js";
import { formatCoreFreezingFailure } from "./tools/core-freezing-result-formatter.js";
import { loadColdRoomProjectState, saveColdRoomProjectState, clearColdRoomProjectState, mergeColdRoomProjectState } from "./lib/cold-room-project-state.js";
import { assessColdRoomProject, formatColdRoomReadiness, calculateReadyColdRoomParts, formatReadyColdRoomCalculations } from "./tools/cold-room-readiness.js";
import { queryManufacturerPerformance } from "./lib/manufacturer-performance-db.js";
import { finalizeCompressorCandidates } from "./tools/compressor-selection-chain.js";
import { assessCompressorArchitectureCandidates } from "./tools/compressor-architecture.js";
import { queryReviewedEnvelopePointsForCandidates } from "./lib/manufacturer-operating-envelope-db.js";
import { stageEnvelopePoint, reviewEnvelopePoint, promoteReviewedEnvelopePoint } from "./lib/manufacturer-operating-envelope-staging.js";
import { saveReviewedManufacturerDocument } from "./lib/manufacturer-performance-write.js";
import { stagePerformanceExtractionRow, listStagedPerformanceRows, reviewStagedPerformanceRow } from "./lib/manufacturer-performance-staging.js";
import { promoteReviewedStagingRow } from "./lib/manufacturer-staging-promotion.js";
import { normalizeBitzerPerformanceRow } from "./tools/bitzer-import.js";
import { BITZER_SOURCE_REGISTRY } from "./data/bitzer-source-registry.js";
import { BITZER_ECOLINE_CATALOGUE } from "./data/bitzer-ecoline-catalogue.js";
import { BITZER_ECOLINE_OFFICIAL_STAGING_BATCH, validateBitzerEcolineSeedRow } from "./data/bitzer-ecoline-performance-seed.js";
import { BITZER_R404A_LT_POINTS } from "./data/bitzer-r404a-lt-staging.js";
import { inspectBitzerPolynomialCsv } from "./tools/bitzer-polynomial-import.js";
import { importBitzerNativeRows, queryBitzerNativePerformance } from "./lib/bitzer-native-performance-db.js";
import { buildCondensingUnitCandidates } from "./tools/condensing-unit-selection.js";
import { queryReviewedManufacturerComponents } from "./lib/manufacturer-component-db.js";
import { stageManufacturerComponent, stageManufacturerComponentBatch, listStagedManufacturerComponents, reviewStagedManufacturerComponent, reviewStagedManufacturerComponentBatch, promoteReviewedManufacturerComponent, promoteReviewedManufacturerComponentBatch, supersedeManufacturerComponentVersion } from "./lib/manufacturer-component-staging.js";

const SYSTEM_PROMPT = `你是 Brady Agent，阿杰创建的个人 AI 工作台。请使用中文为主，回答直接、清楚、实用。默认先给简洁答案，除非用户明确要求详细展开。介绍能力、功能分类或回答“你能做什么”时，不要给各分类标题添加 1.、2. 等编号，直接使用简洁小标题。遇到制冷工程计算时，不编造厂家参数或具体型号；缺少关键数据时明确指出。你也可以协助 AI 影像、内容创作、英语学习和日常工作。

你可能会收到 Owner 的“长期记忆”和“项目记忆”。只有已通过 Owner 身份验证时才会提供。长期记忆只用于稳定身份、长期偏好和长期工作背景；项目记忆只用于当前阶段项目的目标、状态和进度。若记忆与 Owner 当前说法冲突，以当前说法为准。不要向未验证访客泄露 Owner 私人记忆，也不要声称记得未提供的信息。

【资料真实性规则】
当任务依赖教材、厂家样本、客户文件、图片或其他外部资料，而这些资料没有出现在当前对话或项目资料中时，不得凭模型常识补写、猜测或伪造资料中的章节、原句、参数、型号、题目或结论。应明确告诉 Owner 当前缺少哪份资料，并请他提供当前任务所需的页面/文件；可以讲通用知识，但必须明确标为“通用知识，不是来自你的资料”。`;

const PRIMARY_MODEL = "qwen/qwen3.8-27b:free";
const FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const AGENT_VERSION = "v3.16";
const REQUIRED_RUNTIME_BINDINGS = ["OWNER_PIN","OPENROUTER_API_KEY","brady_agent_memory","ASSETS"];
const OWNER_SESSION_SECONDS = 8 * 60 * 60;
const OWNER_SESSION_FUTURE_SKEW_SECONDS = 60;
const OWNER_COOKIE = "brady_owner_session";
const OWNER_LOGIN_MAX_FAILURES = 5;
const OWNER_LOGIN_WINDOW_SECONDS = 15 * 60;

function classifyRequest(text, activeSkill) {
  const raw = String(text || "").trim();
  if (/^(?:今天|现在)(?:是)?(?:几号|几月几日|星期几|周几|几点|什么时间)|^(?:北京时间|中国时间)(?:是)?(?:几点|多少)/i.test(raw)) return "system-time";
  if (/(?:今天|现在|最新|实时|刚刚|目前).{0,12}(?:天气|新闻|价格|报价|汇率|比赛|比分|政策|股价|金价|油价|航班|库存|网站状态)|(?:天气|新闻|价格|报价|汇率|比赛|比分|政策|股价|金价|油价|航班|库存).{0,12}(?:今天|现在|最新|实时|刚刚|目前)/i.test(raw)) return "realtime-external";
  if (activeSkill?.id === "refrigeration" || /(?:冷库|制冷|压缩机|冷风机|冷凝器|蒸发器|冷媒|制冷剂|BITZER|比泽尔|R404A|R507A?|R22|Te|Tc)/i.test(raw)) return "refrigeration";
  return "general";
}

async function searchExaOnce(env, query) {
  if (!env.EXA_API_KEY) {
    console.warn("Exa search diagnostic:", {error:"missing_api_key"});
    return { ok:false, error:"missing_api_key" };
  }
  try {
    const response = await fetch("https://api.exa.ai/search", {
      method:"POST",
      headers:{"x-api-key":env.EXA_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({query:String(query||"").slice(0,500),type:"auto",numResults:5,contents:{text:{maxCharacters:1800}}})
    });
    if (!response.ok) {
      const raw=await response.text().catch(()=>"");
      let detail="";
      try {
        const parsed=JSON.parse(raw);
        detail=String(parsed?.error?.message||parsed?.message||parsed?.error||"").slice(0,300);
      } catch {
        detail=String(raw||"").replace(/\s+/g," ").slice(0,300);
      }
      console.warn("Exa search diagnostic:", {error:"http_error",status:response.status,detail:detail||null});
      return {ok:false,error:"http_error",status:response.status,detail:detail||null};
    }
    const data=await response.json().catch(()=>null);
    const results=(data?.results||[]).slice(0,5).map(r=>({title:r.title||"",url:r.url||"",publishedDate:r.publishedDate||null,text:String(r.text||"").slice(0,1800)}));
    if(!results.length) console.warn("Exa search diagnostic:", {error:"no_results"});
    return results.length?{ok:true,results}:{ok:false,error:"no_results"};
  } catch (error) {
    console.warn("Exa search diagnostic:", {error:"network_error",name:error?.name||null,message:String(error?.message||"").slice(0,300)||null});
    return {ok:false,error:"network_error"};
  }
}

function alternateRealtimeQuery(query) {
  const q=String(query||"").trim();
  if(/天气/i.test(q)) {
    const place=q.replace(/(?:今天|现在|实时|目前|天气|怎么样|如何|情况|？|\?)/g," ").replace(/\s+/g," ").trim();
    return (place?place+" ":"")+"天气 实时 温度 预报";
  }
  return q+" 最新 实时";
}

async function searchExa(env, query) {
  console.log("Exa search trace:", {stage:"start",queryChars:String(query||"").length});

  const first=await searchExaOnce(env,query);
  console.log("Exa search trace:", {stage:"first",ok:!!first.ok,error:first.error||null,status:first.status||null,resultCount:first.results?.length||0});
  if(first.ok || first.error==="missing_api_key") return first;

  const second=await searchExaOnce(env,query);
  console.log("Exa search trace:", {stage:"second",ok:!!second.ok,error:second.error||null,status:second.status||null,resultCount:second.results?.length||0});
  if(second.ok) return {...second,retried:true};

  const fallbackQuery=alternateRealtimeQuery(query);
  const third=await searchExaOnce(env,fallbackQuery);
  console.log("Exa search trace:", {stage:"fallback",ok:!!third.ok,error:third.error||null,status:third.status||null,resultCount:third.results?.length||0,queryChanged:fallbackQuery!==String(query||"").trim()});
  if(third.ok) return {...third,retried:true,fallbackQuery:true};

  console.warn("Exa search failed after fallback:", {
    first:first.error,firstStatus:first.status||null,
    second:second.error,secondStatus:second.status||null,
    third:third.error,thirdStatus:third.status||null
  });
  return {...third,retried:true,fallbackQuery:true};
}

async function answerWithWebSearch(env, messages, systemPrompt, query, maxTokens) {
  console.log("Realtime web trace:", {stage:"answer_start"});
  const search=await searchExa(env,query);
  if(!search.ok) {
    console.warn("Realtime web trace:", {stage:"search_failed",error:search.error||null,status:search.status||null});
    return null;
  }
  console.log("Realtime web trace:", {stage:"search_ready",resultCount:search.results?.length||0,retried:!!search.retried,fallbackQuery:!!search.fallbackQuery});
  const sources=search.results.map((r,i)=>`[${i+1}] ${r.title}\nURL: ${r.url}\n日期: ${r.publishedDate||"未标注"}\n内容: ${r.text}`).join("\n\n");
  const groundedPrompt=systemPrompt+`\n\n【实时网页检索结果】\n${sources}\n\n只依据以上检索结果和确定性系统时间回答当前实时问题。不要把模型记忆冒充实时事实。重要事实尽量在正文中标注来源编号，如[1][2]；回答末尾加“来源”并列出实际使用的网页标题和 URL。若结果不足以确认，就明确说无法确认。`;
  let response=await callModelNonStream(env,PRIMARY_MODEL,messages,groundedPrompt,maxTokens);
  let model=PRIMARY_MODEL;
  if(!response.ok){response=await callModelNonStream(env,FALLBACK_MODEL,messages,groundedPrompt,maxTokens);model=FALLBACK_MODEL;}
  if(!response.ok)return null;
  const data=await response.json().catch(()=>null);
  const answer=cleanFinalAnswer(data?.choices?.[0]?.message?.content||"");
  return answer?{answer,model,results:search.results}:null;
}

function formatChinaSystemTime(now = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "long"
  }).format(now);
}

function runtimeReadiness(env){
  const missing=REQUIRED_RUNTIME_BINDINGS.filter(name=>!env[name]);
  return {ok:missing.length===0,version:AGENT_VERSION,missing};
}
const VISITOR_MAX_INPUT_CHARS = 1200;
const VISITOR_MAX_TOKENS = 900;
const OWNER_MAX_TOKENS = 1400;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      const readiness=runtimeReadiness(env);
      return json(readiness,readiness.ok?200:503);
    }

    if (url.pathname === "/api/owner/login") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!env.OWNER_PIN) return json({ error: "OWNER_PIN is not configured" }, 500);
      if (!env.brady_agent_memory) return json({ error: "Owner login protection is not configured" }, 503);
      const body = await request.json().catch(() => ({}));
      const loginKey = await ownerLoginKey(request);
      const gate = await ownerLoginGate(env, loginKey);
      if (!gate.ok) return json({ error: "登录尝试过多，请稍后再试" }, 429);
      const ok = safeEqual(String(body.pin || ""), String(env.OWNER_PIN));
      if (!ok) {
        const recorded = await recordOwnerLoginFailure(env, loginKey);
        if (!recorded) return json({ error: "Owner login protection is unavailable" }, 503);
        return json({ error: "Owner PIN 不正确" }, 401);
      }
      const cleared = await clearOwnerLoginFailures(env, loginKey);
      if (!cleared) return json({ error: "Owner login protection is unavailable" }, 503);
      const token = await createOwnerSession(env);
      return jsonWithHeaders({ ok: true, role: "owner" }, 200, {
        "Set-Cookie": ownerCookie(token, OWNER_SESSION_SECONDS)
      });
    }

    if (url.pathname === "/api/owner/session") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return (await isOwner(request, env)) ? json({ ok: true, role: "owner" }) : json({ ok: false }, 401);
    }

    if (url.pathname === "/api/owner/logout") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return jsonWithHeaders({ ok: true }, 200, { "Set-Cookie": ownerCookie("", 0) });
    }

    if (url.pathname === "/api/project/cold-room/reset") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      const body = await request.json().catch(() => ({}));
      if (!body.projectId) return json({ error: "projectId is required" }, 400);
      await clearColdRoomProjectState(env, body.projectId);
      return json({ ok: true });
    }

    if (url.pathname === "/api/memory") {
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      if (!env.brady_agent_memory) return json({ error: "Memory database is not configured" }, 500);

      if (request.method === "GET") {
        const result = await env.brady_agent_memory.prepare("SELECT id, category, content, created_at, updated_at FROM memories ORDER BY updated_at DESC, id DESC LIMIT 100").all();
        return json({ memories: result.results || [] });
      }
      if (request.method === "PUT") {
        try {
          const body = await request.json(), id = Number(body.id);
          const content = typeof body.content === "string" ? body.content.trim() : "";
          const category = typeof body.category === "string" && body.category.trim() ? body.category.trim().slice(0, 50) : "general";
          if (!Number.isInteger(id) || id <= 0) return json({ error: "Valid memory id is required" }, 400);
          if (!content) return json({ error: "Memory content is required" }, 400);
          if (content.length > 2000) return json({ error: "Memory is too long" }, 400);
          await env.brady_agent_memory.prepare("UPDATE memories SET category = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(category, content, id).run();
          return json({ ok: true });
        } catch (error) { return json({ error: error?.message || "Failed to update memory" }, 500); }
      }
      if (request.method === "POST") {
        try {
          const body = await request.json();
          const content = typeof body.content === "string" ? body.content.trim() : "";
          const category = typeof body.category === "string" && body.category.trim() ? body.category.trim().slice(0, 50) : "general";
          if (!content) return json({ error: "Memory content is required" }, 400);
          if (content.length > 2000) return json({ error: "Memory is too long" }, 400);
          const result = await env.brady_agent_memory.prepare("INSERT INTO memories (category, content) VALUES (?, ?)").bind(category, content).run();
          return json({ ok: true, id: result.meta?.last_row_id });
        } catch (error) { return json({ error: error?.message || "Failed to save memory" }, 500); }
      }
      if (request.method === "DELETE") {
        const id = Number(url.searchParams.get("id"));
        if (!Number.isInteger(id) || id <= 0) return json({ error: "Valid memory id is required" }, 400);
        await env.brady_agent_memory.prepare("DELETE FROM memories WHERE id = ?").bind(id).run();
        return json({ ok: true });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/manufacturer/bitzer/polynomial/inspect") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body=await request.json();
        const csvText=String(body?.csvText||"");
        if(!csvText.trim()) return json({ok:false,error:"csvText is required"},400);
        if(csvText.length>2_000_000) return json({ok:false,error:"CSV is too large for inspection"},413);
        return json(inspectBitzerPolynomialCsv(csvText,body?.metadata||{}));
      } catch (error) { return json({ error: error?.message || "BITZER polynomial CSV inspection failed" }, 400); }
    }

    if (url.pathname === "/api/manufacturer/bitzer/ecoline") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      return json({ ok: true, catalogue: BITZER_ECOLINE_CATALOGUE });
    }

    if (url.pathname === "/api/manufacturer/bitzer/source") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      return json({ ok: true, source: BITZER_SOURCE_REGISTRY });
    }

    if (url.pathname === "/api/manufacturer/bitzer/bootstrap") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const documentResult=await saveReviewedManufacturerDocument(env,BITZER_ECOLINE_OFFICIAL_STAGING_BATCH.document);
        if(!documentResult.ok) return json(documentResult,400);
        const staged=[];
        for(const row of BITZER_ECOLINE_OFFICIAL_STAGING_BATCH.rows){
          const validation=validateBitzerEcolineSeedRow(row);
          if(!validation.ok) return json({ok:false,error:"invalid_official_seed",validation},400);
          staged.push(await stagePerformanceExtractionRow(env,row));
        }
        return json({ok:staged.every(x=>x.ok),document:documentResult.document,staged,reviewStatus:"unreviewed",nextStep:"Review each staging row, then promote it. Bootstrap never writes directly to Verified."});
      } catch (error) { return json({ error: error?.message || "BITZER bootstrap failed" }, 500); }
    }

    if (url.pathname === "/api/manufacturer/bitzer/bootstrap-r404a-lt") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const staged=[];
        for (const row of BITZER_R404A_LT_POINTS) {
          const validation=validateBitzerEcolineSeedRow(row);
          if (!validation.ok) return json({ok:false,error:"invalid_r404a_lt_seed",validation,row},400);
          staged.push(await stagePerformanceExtractionRow(env,row));
        }
        return json({ok:staged.every(x=>x.ok),count:staged.length,staged,reviewStatus:"unreviewed",nextStep:"Review against KP-104-3-CN p.19 before promotion. No row is written directly to Verified."});
      } catch (error) { return json({ error:error?.message || "BITZER R404A low-temperature bootstrap failed" },500); }
    }

    if (url.pathname === "/api/manufacturer/bitzer/stage") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const normalized = normalizeBitzerPerformanceRow(await request.json().catch(() => ({})));
        if (!normalized.ok) return json(normalized, 400);
        const result = await stagePerformanceExtractionRow(env, {...normalized.row,ratingContext:normalized.ratingContext});
        return json({ ...result, ratingContext: normalized.ratingContext, warning: normalized.warning }, result.ok ? 200 : 400);
      } catch (error) { return json({ error: error?.message || "BITZER staging failed" }, 500); }
    }

    if (url.pathname === "/api/manufacturer/staging") {
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        if (request.method === "GET") return json(await listStagedPerformanceRows(env, url.searchParams.get("documentId") || ""));
        if (request.method === "POST") {
          const result = await stagePerformanceExtractionRow(env, await request.json().catch(() => ({})));
          return json(result, result.ok ? 200 : 400);
        }
        return json({ error: "Method not allowed" }, 405);
      } catch (error) { return json({ error: error?.message || "Manufacturer staging failed" }, 500); }
    }

    if (url.pathname === "/api/manufacturer/staging/review") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body = await request.json().catch(() => ({}));
        const result = await reviewStagedPerformanceRow(env, body.id, body.status, body.note);
        return json(result, result.ok ? 200 : 400);
      } catch (error) { return json({ error: error?.message || "Manufacturer staging review failed" }, 500); }
    }

    if (url.pathname === "/api/manufacturer/staging/promote") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body = await request.json().catch(() => ({}));
        const result = await promoteReviewedStagingRow(env, body.id);
        return json(result, result.ok ? 200 : 400);
      } catch (error) { return json({ error: error?.message || "Manufacturer staging promotion failed" }, 500); }
    }

    if (url.pathname === "/api/manufacturer/document") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const result = await saveReviewedManufacturerDocument(env, await request.json().catch(() => ({})));
        return json(result, result.ok ? 200 : 400);
      } catch (error) { return json({ error: error?.message || "Manufacturer document save failed" }, 500); }
    }

    if (url.pathname === "/api/manufacturer/performance/promote") {
      return json({error:"Direct promotion is disabled. Use staging -> reviewed (with review note) -> staging/promote."},409);
    }

    if (url.pathname === "/api/manufacturer/envelope/stage") {
      if (request.method !== "POST") return json({ error:"Method not allowed" },405);
      if (!(await isOwner(request,env))) return json({ error:"Owner authentication required" },401);
      const result=await stageEnvelopePoint(env,await request.json().catch(()=>({})));
      return json(result,result.ok?200:400);
    }
    if (url.pathname === "/api/manufacturer/envelope/review") {
      if (request.method !== "POST") return json({ error:"Method not allowed" },405);
      if (!(await isOwner(request,env))) return json({ error:"Owner authentication required" },401);
      const body=await request.json().catch(()=>({})); const result=await reviewEnvelopePoint(env,body.id,body.status,body.note);
      return json(result,result.ok?200:400);
    }
    if (url.pathname === "/api/manufacturer/envelope/promote") {
      if (request.method !== "POST") return json({ error:"Method not allowed" },405);
      if (!(await isOwner(request,env))) return json({ error:"Owner authentication required" },401);
      const body=await request.json().catch(()=>({})); const result=await promoteReviewedEnvelopePoint(env,body.id);
      return json(result,result.ok?200:400);
    }

    if (url.pathname === "/api/manufacturer/bitzer/native/import") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body=await request.json().catch(()=>({}));
        const rows=Array.isArray(body)?body:body.rows;
        const result=await importBitzerNativeRows(env,rows||[]);
        return json(result,result.ok?200:400);
      } catch (error) { return json({ error:error?.message || "BITZER native import failed" },500); }
    }

    if (url.pathname === "/api/manufacturer/bitzer/native/query") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const result=await queryBitzerNativePerformance(env,await request.json().catch(()=>({})));
        return json(result,result.ok?200:400);
      } catch (error) { return json({ error:error?.message || "BITZER native query failed" },500); }
    }

    if (url.pathname === "/api/manufacturer/bitzer/native/status") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const db=env.brady_agent_memory;
        const total=await db.prepare("SELECT COUNT(*) AS n, SUM(CASE WHEN return_code=0 AND result_code=0 AND cooling_capacity_kw>0 THEN 1 ELSE 0 END) AS valid FROM bitzer_native_performance").first();
        const combos=await db.prepare("SELECT COUNT(*) AS n FROM (SELECT model,refrigerant FROM bitzer_native_performance GROUP BY model,refrigerant)").first();
        return json({ok:true,rows:Number(total?.n||0),validRows:Number(total?.valid||0),combinations:Number(combos?.n||0),expected:{rows:76216,validRows:52301,combinations:644},complete:Number(total?.n||0)===76216&&Number(total?.valid||0)===52301&&Number(combos?.n||0)===644});
      } catch (error) { return json({ error:error?.message || "BITZER native status failed" },500); }
    }

    if (url.pathname === "/api/manufacturer/performance/select") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body = await request.json().catch(() => ({}));
        const result = await queryManufacturerPerformance(env, body);
        if (!result.ok) return json(result, 400);
        return json({...result,selectionStatus:result.noExactData?"insufficient_verified_data":(result.capacityCandidates?.length?"verified_capacity_candidates":"verified_points_below_required"),note:result.noExactData?"No verified manufacturer point exists at this exact refrigerant/Te/Tc condition. Do not interpolate, extrapolate, or infer capacity from displacement.":"Candidates are capacity matches only; operating envelope, application limits, motor version, electrical data and system architecture still require verification."});
      } catch (error) { return json({ error: error?.message || "Manufacturer selection failed" }, 500); }
    }

    if (url.pathname === "/api/manufacturer/performance/query") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body = await request.json().catch(() => ({}));
        const result = await queryManufacturerPerformance(env, body);
        return json(result, result.ok ? 200 : 400);
      } catch (error) {
        return json({ error: error?.message || "Manufacturer performance query failed" }, 500);
      }
    }
    if (url.pathname === "/api/manufacturer/components/stage-batch") {
      if (request.method !== "POST") return json({error:"Method not allowed"},405);
      if (!(await isOwner(request,env))) return json({error:"Owner authentication required"},401);
      try { const body=await request.json().catch(()=>({})); const result=await stageManufacturerComponentBatch(env,body.rows); return json(result,result.ok?200:207); }
      catch(error){ return json({error:error?.message||"Component batch staging failed"},500); }
    }
    if (url.pathname === "/api/manufacturer/components/staged") {
      if (request.method !== "GET") return json({error:"Method not allowed"},405);
      if (!(await isOwner(request,env))) return json({error:"Owner authentication required"},401);
      try { const result=await listStagedManufacturerComponents(env,{status:url.searchParams.get("status"),componentType:url.searchParams.get("componentType")}); return json(result,200); }
      catch(error){ return json({error:error?.message||"Component staging list failed"},500); }
    }

    if (url.pathname === "/api/manufacturer/components/review-batch") {
      if (request.method !== "POST") return json({error:"Method not allowed"},405);
      if (!(await isOwner(request,env))) return json({error:"Owner authentication required"},401);
      try { const body=await request.json().catch(()=>({})); const result=await reviewStagedManufacturerComponentBatch(env,body); return json(result,result.ok?200:400); }
      catch(error){ return json({error:error?.message||"Component batch review failed"},500); }
    }
    if (url.pathname === "/api/manufacturer/components/promote-batch") {
      if (request.method !== "POST") return json({error:"Method not allowed"},405);
      if (!(await isOwner(request,env))) return json({error:"Owner authentication required"},401);
      try { const body=await request.json().catch(()=>({})); const result=await promoteReviewedManufacturerComponentBatch(env,body.ids); return json(result,result.ok?200:207); }
      catch(error){ return json({error:error?.message||"Component batch promotion failed"},500); }
    }

    if (url.pathname === "/api/manufacturer/components/supersede") {
      if (request.method !== "POST") return json({error:"Method not allowed"},405);
      if (!(await isOwner(request,env))) return json({error:"Owner authentication required"},401);
      try { const body=await request.json().catch(()=>({})); const result=await supersedeManufacturerComponentVersion(env,body); return json(result,result.ok?200:400); }
      catch(error){ return json({error:error?.message||"Component version supersede failed"},500); }
    }

    if (url.pathname === "/api/manufacturer/components/stage") {
      if (request.method !== "POST") return json({error:"Method not allowed"},405);
      if (!(await isOwner(request,env))) return json({error:"Owner authentication required"},401);
      try { const body=await request.json().catch(()=>({})); const result=await stageManufacturerComponent(env,body); return json(result,result.ok?200:400); }
      catch(error){ return json({error:error?.message||"Component staging failed"},500); }
    }
    if (url.pathname === "/api/manufacturer/components/review") {
      if (request.method !== "POST") return json({error:"Method not allowed"},405);
      if (!(await isOwner(request,env))) return json({error:"Owner authentication required"},401);
      try { const body=await request.json().catch(()=>({})); const result=await reviewStagedManufacturerComponent(env,body.id,body.status,body.note); return json(result,result.ok?200:400); }
      catch(error){ return json({error:error?.message||"Component review failed"},500); }
    }
    if (url.pathname === "/api/manufacturer/components/promote") {
      if (request.method !== "POST") return json({error:"Method not allowed"},405);
      if (!(await isOwner(request,env))) return json({error:"Owner authentication required"},401);
      try { const body=await request.json().catch(()=>({})); const result=await promoteReviewedManufacturerComponent(env,body.id); return json(result,result.ok?200:400); }
      catch(error){ return json({error:error?.message||"Component promotion failed"},500); }
    }

    if (url.pathname === "/api/tools/condensing-unit/select") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body=await request.json().catch(()=>({}));
        // Manufacturer verification evidence is server-owned. Raw HTTP callers may not inject reviewed catalogue rows.
        const forbiddenManufacturerEvidence=["condenserManufacturerRows","receiverManufacturerRows","oilManagementManufacturerRows","accessoryManufacturerRows"];
        const injected=forbiddenManufacturerEvidence.filter(key=>Object.prototype.hasOwnProperty.call(body,key));
        if(injected.length) return json({ok:false,error:"manufacturer_evidence_injection_rejected",fields:injected,rule:"厂家已审核数据必须由服务端可信数据源取得，不能由客户端 JSON 声明 reviewed 后进入最终机组选型。"},400);
        const componentTypes=["condenser","liquid_receiver","oil_management","filter_drier","sight_glass","solenoid_valve","expansion_device","hp_lp_protection"];
        const componentResults=await Promise.all(componentTypes.map(componentType=>queryReviewedManufacturerComponents(env,{componentType})));
        const byType=Object.fromEntries(componentTypes.map((type,i)=>[type,componentResults[i]?.rows||[]]));
        const trustedInput={...body,
          condenserManufacturerRows:byType.condenser,
          receiverManufacturerRows:byType.liquid_receiver,
          oilManagementManufacturerRows:byType.oil_management,
          accessoryManufacturerRows:["filter_drier","sight_glass","solenoid_valve","expansion_device","hp_lp_protection"].flatMap(type=>byType[type]||[])
        };
        const result=buildCondensingUnitCandidates(trustedInput);
        return json(result,result.ok?200:400);
      } catch (error) {
        return json({ error:error?.message || "Condensing unit selection failed" },500);
      }
    }

    if (url.pathname === "/api/tools/cold-storage-load") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body = await request.json();
        const result = calculateColdStorageLoad(body);
        return json(result, result.ok ? 200 : 400);
      } catch (error) {
        return json({ error: error?.message || "Cold storage load calculation failed" }, 500);
      }
    }

    if (url.pathname === "/api/tools/cold-storage-load-range") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body = await request.json();
        const result = calculateColdStorageLoadRange(body);
        return json(result, result.ok ? 200 : 400);
      } catch (error) {
        return json({ error: error?.message || "Cold storage load range calculation failed" }, 500);
      }
    }

    if (url.pathname === "/api/tools/product-load") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!(await isOwner(request, env))) return json({ error: "Owner authentication required" }, 401);
      try {
        const body = await request.json();
        const result = calculateProductLoad(body);
        return json(result, result.ok ? 200 : 400);
      } catch (error) {
        return json({ error: error?.message || "Product load calculation failed" }, 500);
      }
    }

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!env.OPENROUTER_API_KEY) return json({ error: "OPENROUTER_API_KEY is not configured" }, 500);
      try {
        const body = await request.json();
        const projectId = typeof body.projectId === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(body.projectId) ? body.projectId : null;
        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        if (!messages.length) return json({ error: "No messages supplied" }, 400);
        const owner = await isOwner(request, env);
        const latestUser = [...messages].reverse().find((m) => m?.role === "user" && typeof m.content === "string");
        if (!owner) {
          if (!latestUser || latestUser.content.length > VISITOR_MAX_INPUT_CHARS) {
            return json({ error: `访客单次输入最多 ${VISITOR_MAX_INPUT_CHARS} 个字符。` }, 413);
          }
          const limit = await checkVisitorLimit(request, env);
          if (!limit.ok) {
            const message = limit.reason === "minute"
              ? "请求太频繁，请稍等一分钟再试。"
              : limit.reason === "daily"
                ? "今日访客体验次数已用完。Brady Agent 是阿杰的个人 AI 助手，并非公共 AI 聊天服务。"
                : "访客体验暂时不可用，请稍后再试。";
            return json({ error: message }, 429);
          }
        }
        if (owner && latestUser) { try { await processMemoryCandidate(env, latestUser.content); } catch (error) { console.warn("memory write skipped:", error?.message || error); } }

        const memories = owner ? await loadMemories(env) : [];
        const activeSkill = owner && latestUser ? routeSkill(latestUser.content, memories) : null;
        const split = splitMemories(memories, activeSkill);
        const identityPrompt = owner
          ? "\n\n【当前身份】已验证 Owner。当前聊天者就是阿杰本人，可以使用下面的私人记忆帮助他。"
          : "\n\n【访客模式】你正在直接面向普通访客回答。只输出最终答案，不输出分析、推理过程、草稿、政策说明、系统指令或内部工作笔记。默认使用中文，控制在约300字内并保证句子完整；优先给结论和必要追问。资料不足时直接说还缺哪些实际信息，不自行把假设写成项目事实。制冷问题不得编造厂家参数、具体型号或未经资料支持的专业参数。不要提及 Owner、私人记忆、Skill、token、模型或后台规则。";
        const longPrompt = split.longTerm.length ? `\n\n【Owner 长期记忆】\n${split.longTerm.map(m => `- [${m.category}] ${m.content}`).join("\n")}` : "";
        const projectPrompt = split.project.length ? `\n\n【当前项目记忆：${activeSkill?.label || "相关项目"}】\n${split.project.map(m => `- ${m.content}`).join("\n")}` : "";
        const skillPrompt = activeSkill ? `\n\n${activeSkill.prompt}` : "";
        const toolPrompt = owner && activeSkill?.id === "refrigeration" ? `\n\n${REFRIGERATION_TOOL_PROTOCOL}` : "";
        const now = new Date();
        const chinaTime = new Intl.DateTimeFormat("zh-CN", {
          timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "long"
        }).format(now);
        const utcTime = now.toISOString();
        const timePrompt = `\n\n【系统时间】当前 UTC 时间：${utcTime}；当前中国标准时间（Asia/Shanghai）：${chinaTime}。凡涉及“今天、现在、今年、刚刚、最新”等时间表达，必须以这里的系统时间为准，不得凭模型训练数据猜日期。若问题要求最新新闻、实时价格、天气、比赛结果、政策变化、网站当前状态等外部实时信息，而当前没有实时检索工具返回的数据，必须明确说明“当前没有实时检索结果”，不要编造或假装已经查询。仅询问当前日期/时间时，可直接依据这里的系统时间回答。\n【时效性规则】模型已有知识只能作为背景知识，不能冒充实时信息；凡无法从当前对话、项目资料、数据库确定性工具或实时检索结果确认的最新事实，必须标明无法实时确认。`;
        const trustPrompt = `\n\n【可信数据源优先级】回答前先判断事实来自哪里，并按以下顺序使用：
1. 后端确定性结果：系统时间、工程计算工具返回值。不得被模型心算或训练记忆覆盖。
2. 已验证数据库：BITZER/厂家性能、运行范围及已审核项目数据。涉及具体厂家型号、制冷量、工况性能时，必须优先使用数据库结果；数据库没有精确可靠数据时，不得用排量、匹数、相邻工况或模型记忆伪造精确厂家性能。
3. 当前对话和 Owner 项目资料：可用于用户明确提供的事实；与旧记忆冲突时以当前输入为准。
4. 模型通用知识：只用于概念解释、思路、写作和不依赖最新/专有数据的常识。不得冒充厂家资料、实时信息或用户资料。
5. 未知：以上来源均不能确认时，明确说当前无法可靠确认，并指出需要什么数据或工具。禁止为了显得有帮助而猜一个具体数字、型号、日期、价格或最新事实。
【回答纪律】确定性数据与模型推理冲突时，以确定性数据为准；“估算”必须明确标注估算及关键假设；具体厂家性能必须可追溯到已验证数据库或当前提供的厂家资料。`;
        const systemPrompt = SYSTEM_PROMPT + timePrompt + trustPrompt + identityPrompt + longPrompt + projectPrompt + skillPrompt + toolPrompt;

        const requestClass = classifyRequest(latestUser?.content || "", activeSkill);
        if (requestClass === "system-time") {
          return sseText("当前中国标准时间（北京时间）：" + formatChinaSystemTime(now) + "。", { model:"deterministic-system-time", role:owner?"owner":"visitor", skill:"general", tool:"system_time" });
        }
        const maxTokens = owner ? OWNER_MAX_TOKENS : VISITOR_MAX_TOKENS;
        if (requestClass === "realtime-external") {
          const webAnswer=await answerWithWebSearch(env,messages,systemPrompt,latestUser?.content||"",maxTokens);
          if(webAnswer) return sseText(webAnswer.answer,{model:webAnswer.model,role:owner?"owner":"visitor",skill:"general",tool:"exa_web_search"});
          return sseText("这个问题需要实时外部数据，但本次联网检索没有取得可靠结果。我不会用模型旧知识猜测，请稍后再试。",{model:"deterministic-realtime-guard",role:owner?"owner":"visitor",skill:"general",tool:"realtime_guard"});
        }

        if (!owner && latestUser) {
          const capabilityQuestion = latestUser.content || "";
          if (/(?:能不能|可以|能否|会不会|是否).{0,8}(?:直接)?(?:生成|做|制作|画).{0,4}(?:图片|图像|照片)|(?:直接)?(?:生成|做|制作|画).{0,4}(?:图片|图像|照片).{0,8}(?:吗|么|不)/i.test(capabilityQuestion)) {
            return sseText("目前这个 Brady Agent 网页还没有接入图片生成接口，所以暂时不能在这里直接出图。我可以帮你设计画面、写生成提示词、优化图片方案；以后接入图片生成服务后，就可以直接生成。", { model:"deterministic-capability", role:"visitor", skill:"general" });
          }
        }
        if (!owner && latestUser && projectId) {
          const visitorText = latestUser.content || "";
          const visitorColdRoom = /(?:冷库|冷冻库|冷藏库|速冻库|保鲜库)/i.test(visitorText) &&
            /(?:怎么配|怎么选|方案|配置|选型|负荷|计算|核算|做一个|建一个|配多大|多大机组|多少匹|几匹|用多大|需要多大|该配什么|怎么做)/i.test(visitorText);
          const visitorStartsNewProject = /(?:另一个|新的|新项目|重新做|重新算|换一个).{0,8}(?:冷库|项目)|(?:冷库|项目).{0,8}(?:另一个|新的|新项目|重新|换一个)/i.test(visitorText);
          if(visitorStartsNewProject) await clearColdRoomProjectState(env,projectId);
          let visitorState = visitorStartsNewProject ? null : await loadColdRoomProjectState(env, projectId);
          const visitorFollowup = !!visitorState && /(?:入库|货温|聚氨酯|PIR|XPS|EPS|一楼|楼上|地面|保温|开门|次|分钟|人工|叉车|速冻|冻结|小时|不知道)/i.test(visitorText);
          if (visitorColdRoom || visitorFollowup) {
            const patch = extractColdRoomProject(visitorText);
            if (visitorColdRoom && !visitorState) visitorState = {};
            visitorState = mergeColdRoomProjectState(visitorState || {}, patch);
            await saveColdRoomProjectState(env, visitorState, projectId);
            const p = visitorState, known=[];
            if(p.location)known.push(p.location);
            if(p.dimensions?.lengthM)known.push(p.dimensions.lengthM+"×"+p.dimensions.widthM+"×"+p.dimensions.heightM+" m");
            else {if(Number.isFinite(p.floorAreaM2))known.push("约"+p.floorAreaM2+"㎡");if(Number.isFinite(p.heightM))known.push("高"+p.heightM+"m");}
            if(Number.isFinite(p.volumeM3))known.push("约"+Math.round(p.volumeM3*10)/10+"m³");
            if(Number.isFinite(p.roomTempC))known.push("库温"+p.roomTempC+"℃");
            if(p.productCategory)known.push(p.productCategory);
            if(Number.isFinite(p.dailyInboundKg))known.push("日进货约"+p.dailyInboundKg/1000+"吨");
            if(Number.isFinite(p.entryTempC))known.push("入库"+p.entryTempC+"℃");
            if(p.insulation?.material)known.push(p.insulation.thicknessMm+"mm "+p.insulation.material+"板");
            if(p.floor?.description)known.push(p.floor.description);
            if(p.doorUsage?.description)known.push(p.doorUsage.description);
            const freezing = p.processMode==="freezing" || /(?:速冻|冻结加工|鲜货冻结|常温货冻结)/i.test(visitorText);
            const unknown=new Set(p.unknownFields||[]);
            const missing=[];
            if(!Number.isFinite(p.entryTempC)&&!unknown.has("entryTempC"))missing.push("货物入库时大约多少℃？");
            if(freezing&&!Number.isFinite(p.pullDownHours))missing.push("这是速冻/冻结加工项目：要求货物多少小时达到目标温度？");
            if((!p.insulation?.material||!Number.isFinite(p.insulation?.thicknessMm))&&!unknown.has("insulation"))missing.push("库板是什么材料、厚度多少？");
            if(!p.floor?.description&&!unknown.has("floor"))missing.push("冷库是一楼落地还是楼上？地面有没有保温？");
            if(!p.doorUsage?.description&&!unknown.has("doorUsage"))missing.push("每天大约开门多少次、每次多久？主要人工搬运还是叉车进出？");
            const quick = quickEstimateColdRoom(p);
            let quickText = "";
            if(!quick.ok && quick.message) quickText = "\n\n工程快速估算：暂不直接给冷量范围。"+quick.message;
            if(quick.ok){
              quickText = "\n\n工程快速估算参考："+quick.category+"，制冷量约 "+quick.refrigerationLoadKW.min+"～"+quick.refrigerationLoadKW.max+" kW。"+(quick.estimatedFields?.length?" 其中以下条件未知，已扩大估算范围："+quick.estimatedFields.join("；")+"。":"");
              const allUserText = messages.filter(m=>m?.role==="user").map(m=>String(m.content||"")).join("\n");
              const refrigerant = /R507A?|507/i.test(allUserText) ? "R507A" : /R404A?/i.test(allUserText) ? "R404A" : "";
              const teMatch = allUserText.match(/(?:Te|蒸发温度)\s*[:：]?\s*(-?\d+(?:\.\d+)?)/i);
              const tcMatch = allUserText.match(/(?:Tc|冷凝温度)\s*[:：]?\s*(-?\d+(?:\.\d+)?)/i);
              if(refrigerant && teMatch && tcMatch){
                const perf=await queryManufacturerPerformance(env,{refrigerant,evaporatingTempC:Number(teMatch[1]),condensingTempC:Number(tcMatch[1]),requiredCoolingCapacityKW:quick.refrigerationLoadKW.min});
                const ref=referenceCompressorBandFromReviewedPerformance(perf,{requiredLoadMinKW:quick.refrigerationLoadKW.min,requiredLoadMaxKW:quick.refrigerationLoadKW.max});
                if(ref.ok&&ref.candidates.length) quickText += " 在你明确的 "+refrigerant+"、Te "+teMatch[1]+"℃、Tc "+tcMatch[1]+"℃ 条件下，已找到可追溯厂家性能候选，可继续核对具体型号。";
                else quickText += " 当前工况下暂无足够的已审核厂家性能点，因此暂不报具体匹数或型号。";
              } else {
                const duty=deriveEngineeringDuty(p);
                quickText += " 压缩机具体型号需要结合制冷剂和实际运行工况核对厂家性能数据，这些工程参数不要求普通客户提供。";
                if(duty.ok) quickText += " 当前已进入"+duty.duty+"的工程预选流程，正式定型前还会复核运行工况。";
                if(refrigerant&&duty.ok){
                  const provisional=await queryProvisionalDutyCandidates(env,{...p,refrigerant},quick.refrigerationLoadKW.min);
                  const count=provisional.ok?provisional.hits.reduce((n,h)=>n+h.candidates.length,0):0;
                  if(count) quickText += " 当前已有可追溯厂家性能候选，但仍属于暂定预选，不能直接定型。";
                }
              }
              quickText += " 该估算仅用于前期沟通。";
            }
            const reply="已记录："+known.join("，")+"。"+quickText+"\n\n"+(missing.length?"还需要补充：\n"+missing.map((x,i)=>(i+1)+". "+x).join("\n")+"\n\n不知道的项目可以直接说“不知道”，估算项会单独标明。":"基本项目条件已经收齐，可以继续做正式负荷核算；具体设备型号仍需结合可追溯厂家性能数据。")+"\n\n访客体验有使用额度限制，回答采用简洁模式。";
            return sseText(reply,{model:"deterministic-intake",role:"visitor",skill:"refrigeration-intake"});
          }
        }
        if (owner && activeSkill?.id === "refrigeration") {
          const currentText = latestUser?.content || "";
          const startsNewProject = /(?:另一个|另外一个|新的|新项目|重新做|重新算|换一个|再算一个|再做一个).{0,8}(?:冷库|项目)|(?:冷库|项目).{0,8}(?:另一个|另外一个|新的|新项目|重新|换一个|再算|再做)/i.test(currentText);
          if (startsNewProject && projectId) await clearColdRoomProjectState(env, projectId);
          let coldRoomState = projectId ? await loadColdRoomProjectState(env, projectId) : null;
          // Recovery path: after a deployment or older version, rebuild the active project
          // only from explicit cold-room intake messages in the current chat history.
          if (!coldRoomState) {
            const priorIntake = [...messages].reverse().find((m) =>
              m?.role === "user" &&
              typeof m.content === "string" &&
              /(?:冷库|冷冻库|冷藏库|速冻库|保鲜库)/i.test(m.content) &&
              /(?:怎么配|怎么选|方案|看看|配置|选型|负荷|计算|核算|配多大|多大机组|多少匹|几匹|用多大|需要多大|该配什么|怎么做)/i.test(m.content)
            );
            if (priorIntake) {
              coldRoomState = extractColdRoomProject(priorIntake.content);
              if (Object.keys(coldRoomState).length) if (projectId) await saveColdRoomProjectState(env, coldRoomState, projectId);
            }
          }
          const startsIntake = /(?:冷库|冷冻库|冷藏库|速冻库|保鲜库)/i.test(currentText) && /(?:怎么配|怎么选|方案|看看|配置|选型|负荷|计算|核算|配多大|多大机组|多少匹|几匹|用多大|需要多大|该配什么|怎么做)/i.test(currentText);
          const isProjectFollowup = !!coldRoomState && !startsNewProject && /(?:鲜肉|冷藏肉|冻结|冻肉|牛肉|猪肉|鸡肉|鸭肉|鱼|海鲜|蔬菜|水果|豆腐|食品|货物|入库|进货|每天|每日|日进|吨|公斤|kg|货温|中心温度|目标温度|小时|一楼|落地|楼层|地面|保温|库板|聚氨酯|PIR|XPS|EPS|开门|次|分钟|室外|环境温度|夏天|夏季|最热|高温|叉车|托盘车|地牛|人工搬运|人员进出|手推车|平方米|平米|㎡|库温|制冷剂|R22|R404A|R507A?|不知道|不清楚|没有|有)/i.test(currentText);
          if (startsIntake || isProjectFollowup) {
            const patch = extractColdRoomProject(currentText);
            // A complete intake is authoritative for the whole active project.
            // Clear the old D1 project before merging so stale product/floor/door facts cannot leak in.
            const authoritativeIntake = startsIntake && !!patch.dimensions && (
              !!patch.productCategory ||
              Number.isFinite(patch.roomTempC) ||
              Number.isFinite(patch.dailyInboundKg) ||
              Number.isFinite(patch.entryTempC)
            );
            if (authoritativeIntake) coldRoomState = {};
            coldRoomState = mergeColdRoomProjectState(coldRoomState || {}, patch);
            if (projectId) await saveColdRoomProjectState(env, coldRoomState, projectId);
            const readiness = assessColdRoomProject(coldRoomState);
            const readyResults = calculateReadyColdRoomParts(coldRoomState, readiness);
            let calculatedText = formatReadyColdRoomCalculations(readyResults);
            let compressorSelectionText = "";
            const selectionRequest = readyResults.manufacturer_selection_request;
            if (selectionRequest?.ready && readyResults.selection_readiness?.readyForManufacturerSelection) {
              const plannedQueries = readyResults.manufacturer_query_plan?.queries?.length ? readyResults.manufacturer_query_plan.queries : [selectionRequest.request];
              const architectureRuns = [];
              for (const manufacturerQuery of plannedQueries) {
                const useBitzerNative = manufacturerQuery.architecture === "semi-hermetic-reciprocating" &&
                  (!manufacturerQuery.manufacturer || String(manufacturerQuery.manufacturer).toUpperCase() === "BITZER");
                let performance = useBitzerNative
                  ? await queryBitzerNativePerformance(env, manufacturerQuery)
                  : await queryManufacturerPerformance(env, manufacturerQuery);
                // Native BITZER Selection data is the primary source for ECOLINE operating-point performance.
                // Fall back only when the native corpus has no usable point/cell for this condition.
                if (useBitzerNative && performance.ok && performance.noData) {
                  performance = await queryManufacturerPerformance(env, manufacturerQuery);
                }
                const envelope = await queryReviewedEnvelopePointsForCandidates(env, performance.capacityCandidates||[]);
                const chain = finalizeCompressorCandidates(performance, envelope.ok ? envelope.points : [], { allowedArchitectures: manufacturerQuery.architecture ? [manufacturerQuery.architecture] : [] });
                architectureRuns.push({ query:manufacturerQuery, performance, chain, performanceSource:useBitzerNative&&!performance.exactConditionOnly?"bitzer-native":"reviewed-performance" });
              }
              const rankedCandidates = architectureRuns.flatMap((run,architectureRank)=>(run.chain.finalCandidates||[]).map(candidate=>({...candidate,architecture:run.query.architecture||candidate.architecture||null,architectureRank,capacityMarginKW:Number(candidate.coolingCapacityKW)-Number(run.query.requiredCoolingCapacityKW)}))).sort((a,b)=>a.architectureRank-b.architectureRank || a.capacityMarginKW-b.capacityMarginKW);
              const bestArchitectureRank = rankedCandidates.length ? rankedCandidates[0].architectureRank : null;
              const finalCandidates = bestArchitectureRank==null ? [] : rankedCandidates.filter(x=>x.architectureRank===bestArchitectureRank).slice(0,3);
              const fallbackVerifiedCandidates = bestArchitectureRank==null ? [] : rankedCandidates.filter(x=>x.architectureRank>bestArchitectureRank);
              const higherPriorityUnverified = bestArchitectureRank==null ? [] : architectureRuns.slice(0,bestArchitectureRank).filter(run=>!(run.chain.finalCandidates||[]).length).map(run=>run.query.architecture).filter(Boolean);
              const capacityCandidates = architectureRuns.flatMap(x=>x.performance.capacityCandidates||[]);
              const hasExactData = architectureRuns.some(x=>!x.performance.noExactData);
              if (finalCandidates.length) {
                compressorSelectionText = "\n\n**压缩机候选**\n" + finalCandidates.map(x => "• " + x.manufacturer + " " + x.model + "：已验证厂家性能点制冷量 " + x.coolingCapacityKW + " kW" + (x.architecture ? "；架构 " + x.architecture : "") + "。").join("\n") + (higherPriorityUnverified.length ? "\n\n说明：工程判断中还有优先级更高的架构（" + higherPriorityUnverified.join("、") + "），但当前数据库缺少足够的已验证厂家性能/运行范围数据；这里显示的是目前资料闭环后可确认的候选，不代表工程上否定前述架构。" : "") + (fallbackVerifiedCandidates.length ? "\n\n其他架构也有通过校验的候选，当前不混入主候选；需要做方案对比时再展开。" : "") + "\n\n以上候选已通过当前精确性能点和已审核运行范围校验，最终仍需结合电气、机组结构及现场要求确认。";
                const unitResult=buildCondensingUnitCandidates({
                  requiredCoolingCapacityKW:selectionRequest.request.requiredCoolingCapacityKW,
                  compressorCandidates:finalCandidates,
                  refrigerant:selectionRequest.request.refrigerant,
                  evaporatingTempC:selectionRequest.request.evaporatingTempC,
                  condensingTempC:selectionRequest.request.condensingTempC,
                  ambientTempC:Number.isFinite(coldRoomState?.ambientTempC)?coldRoomState.ambientTempC:null,
                  redundancyRequired:coldRoomState?.redundancyRequired===true,
                  heatRejectionType:coldRoomState?.heatRejectionType||null,
                  condenserType:coldRoomState?.condenserType||null,
                  coolingMethod:coldRoomState?.coolingMethod||coldRoomState?.heatRejectionType||null,
                  receiverVolumeL:coldRoomState?.receiverVolumeL,
                  receiverSizingBasis:coldRoomState?.receiverSizingBasis,
                  oilManagementBasis:coldRoomState?.oilManagementBasis
                });
                if(unitResult.unitCandidates?.length){
                  const bestUnit=unitResult.unitCandidates[0];
                  compressorSelectionText += "\n\n**机组方案进度**\n";
                  compressorSelectionText += "已按上述真实工况压缩机能力进入机组组合：工作压缩机 "+bestUnit.dutyCompressorCount+" 台"+(bestUnit.reserveCompressorCount?"，备用 "+bestUnit.reserveCompressorCount+" 台":"")+"，工作组合冷量 "+bestUnit.dutyCoolingCapacityKW+" kW，冷量裕量 "+bestUnit.dutyMarginPercent+"%。";
                  if(bestUnit.condenserDesign?.requiredHeatRejectionKW!=null) compressorSelectionText += " 当前工况计算冷凝排热需求约 "+bestUnit.condenserDesign.requiredHeatRejectionKW+" kW。";
                  if(bestUnit.unitReview?.finalSelectable) compressorSelectionText += "\n该候选的整机设计依据已经闭环，可进入最终机组方案。";
                  else {
                    const blockers=(bestUnit.unitReview?.blockers||[]).map(x=>x.message);
                    const fields=unitResult.unresolved||[];
                    const pending=[...new Set([...blockers,...fields])];
                    compressorSelectionText += "\n当前仍属于工程候选，不能冒充完整厂家机组。"+(pending.length?" 待补/待校核："+pending.join("；")+"。":"");
                  }
                }
              } else if (!hasExactData) {
                compressorSelectionText = "\n\n**压缩机选型状态**\n当前候选架构在该制冷剂和运行工况下还没有已验证的精确厂家性能点，因此暂不报具体型号，也不会跨架构用排量或匹数反推。";
              } else if (capacityCandidates.length) {
                compressorSelectionText = "\n\n**压缩机选型状态**\n已经找到满足制冷量的厂家性能候选，但运行范围资料还没有完成审核校验，因此暂不作为最终型号。";
              }
            }
            const intakeReply = formatColdRoomProjectState(coldRoomState) + "\
\
" + formatColdRoomReadiness(readiness) + (calculatedText ? "\
\
" + calculatedText : "") + compressorSelectionText;
            return sseText(intakeReply, { model: "deterministic-intake", role: "owner", skill: activeSkill.id, tool: "cold_room_intake" });
          }
          const manufacturerSelection = detectManufacturerSelectionRequest(messages, coldRoomState);
          if (manufacturerSelection?.clarify) return sseText(manufacturerSelection.clarify, { model:"deterministic-router", role:"owner", skill:activeSkill.id, tool:"manufacturer_selection" });
          if (manufacturerSelection?.query) {
            // Direct compressor questions use the same architecture layer as full cold-room projects.
            // If the user did not explicitly name scroll/reciprocating/screw, infer only from persisted
            // project facts; never choose an architecture from capacity alone.
            if (!manufacturerSelection.query.architecture) {
              const architectureAssessment = assessCompressorArchitectureCandidates(coldRoomState || {}, {
                design_capacity:{requiredCapacityRangeKW:{min:manufacturerSelection.query.requiredCoolingCapacityKW,max:manufacturerSelection.query.requiredCoolingCapacityKW}}
              });
              const preferredArchitectures=(architectureAssessment.architectureAssessment||[])
                .filter(x=>x.preference==="preferred")
                .map(x=>x.architecture)
                .filter(x=>x!=="parallel-rack");
              if (preferredArchitectures.length===1) manufacturerSelection.query.architecture=preferredArchitectures[0];
              else if (preferredArchitectures.length>1) {
                return sseText("根据当前项目资料，存在多个合理的压缩机架构候选（"+preferredArchitectures.join("、")+"）。我不会只按冷量大小替你强行定一种。请补充连续运行时间、负荷波动、多库/并联需求和冗余要求，或明确希望比较哪种架构。",{model:"deterministic-architecture-router",role:"owner",skill:activeSkill.id,tool:"manufacturer_selection"});
              } else {
                return sseText("现在已经具备厂家性能查询条件，但还不能可靠判断该优先用涡旋、半封闭活塞还是螺杆。我不会只按 kW/匹数直接定架构。请补充项目用途（冷藏/冷冻/速冻）、库温或工艺、连续运行时间、负荷波动，以及是否多库/需要并联冗余。",{model:"deterministic-architecture-router",role:"owner",skill:activeSkill.id,tool:"manufacturer_selection"});
              }
            }
            const useBitzerNative = manufacturerSelection.query.architecture === "semi-hermetic-reciprocating" &&
              (!manufacturerSelection.query.manufacturer || String(manufacturerSelection.query.manufacturer).toUpperCase() === "BITZER");
            let selected = useBitzerNative ? await queryBitzerNativePerformance(env, manufacturerSelection.query) : await queryManufacturerPerformance(env, manufacturerSelection.query);
            // Fall back to the legacy reviewed exact-point store until the native corpus has been imported.
            if (useBitzerNative && selected.ok && selected.noData) selected = await queryManufacturerPerformance(env, manufacturerSelection.query);
            if (manufacturerSelection.directPerformance && manufacturerSelection.query.model && useBitzerNative) {
              const directText=formatBitzerDirectPerformanceResult(selected,manufacturerSelection.query);
              return sseText(directText,{model:"deterministic-bitzer-native",role:"owner",skill:activeSkill.id,tool:"bitzer_direct_performance"});
            }
            const envelopeResult = await queryReviewedEnvelopePointsForCandidates(env, selected.capacityCandidates||[]);
            const directArchitecture = manufacturerSelection.query.architecture ? [manufacturerSelection.query.architecture] : [];
            const selectionChain = finalizeCompressorCandidates(selected, envelopeResult.ok ? envelopeResult.points : [], { allowedArchitectures: directArchitecture });
            const selectionText = formatManufacturerSelectionResult({...selected,...manufacturerSelection.query,finalCandidates:selectionChain.finalCandidates}) + (selectionChain.provisionalCandidates?.length ? "\\n\\n运行范围校验：仍有容量候选尚未通过已审核的官方 Application Limits 运行点校验，因此这些型号只能保持候选状态。" : "") + (!manufacturerSelection.query.manufacturer && selected.architecture==="semi-hermetic-reciprocating" ? "\\n\\n数据说明：本次未指定厂家，当前半封闭活塞数据库默认查询 BITZER 已验证数据；这表示当前数据覆盖范围，不代表工程上只推荐 BITZER。" : "");
            return sseText(selectionText, { model:"deterministic-manufacturer-db", role:"owner", skill:activeSkill.id, tool:"manufacturer_selection" });
          }
          const directRequest = detectDeterministicRefrigerationRequest(messages);
          if (directRequest?.__brady_clarify__) return sseText(directRequest.__brady_clarify__, { model: "deterministic-router", role: "owner", skill: activeSkill.id });
          if (directRequest) {
            const directResult = runRefrigerationTool({ tool: directRequest.__brady_tool__, args: directRequest.args });
            const fastText = formatDeterministicRefrigerationResult(directResult);
            if (fastText) return sseText(fastText, { model: "deterministic", role: "owner", skill: activeSkill.id, tool: directRequest.__brady_tool__ });
          }
          const toolTurn = await callModelNonStream(env, PRIMARY_MODEL, messages, systemPrompt, 700);
          let toolModel = PRIMARY_MODEL;
          let toolData = toolTurn.ok ? await toolTurn.json().catch(() => null) : null;
          if (!toolTurn.ok) {
            const fallbackTurn = await callModelNonStream(env, FALLBACK_MODEL, messages, systemPrompt, 700);
            toolModel = FALLBACK_MODEL;
            toolData = fallbackTurn.ok ? await fallbackTurn.json().catch(() => null) : null;
          }
          const draft = cleanFinalAnswer(toolData?.choices?.[0]?.message?.content || "");
          const requestData = parseToolRequest(draft);
          if (requestData) {
            const toolResult = runRefrigerationTool({ tool: requestData.__brady_tool__, args: requestData.args });
            const finalMessages = [...messages, { role: "assistant", content: draft }, { role: "user", content: "【后端确定性计算结果】\n" + JSON.stringify(toolResult) + "\n请依据该结果回答，不要重新心算覆盖工具结果。" }];
            let finalResponse = await callModelNonStream(env, toolModel, finalMessages, systemPrompt, maxTokens);
            if (!finalResponse.ok) { toolModel = FALLBACK_MODEL; finalResponse = await callModelNonStream(env, FALLBACK_MODEL, finalMessages, systemPrompt, maxTokens); }
            if (!finalResponse.ok) return json({ error: "计算结果解释暂时不可用，请稍后再试。" }, finalResponse.status);
            const finalData = await finalResponse.json().catch(() => null);
            const finalText = cleanFinalAnswer(finalData?.choices?.[0]?.message?.content || "");
            if (!finalText) return sseText("计算已完成，但结果解释生成失败。请重试一次。", { model:toolModel, role:"owner", skill:activeSkill.id, tool:requestData.__brady_tool__ });
            return sseText(finalText, { model:toolModel, role:"owner", skill:activeSkill.id, tool:requestData.__brady_tool__ });
          }
          if (draft) return sseText(cleanFinalAnswer(draft), { model: toolModel, role: "owner", skill: activeSkill.id });
        }
        if (!owner) {
          let visitorResponse = await callModelNonStream(env, PRIMARY_MODEL, messages, systemPrompt, VISITOR_MAX_TOKENS);
          let usedModel = PRIMARY_MODEL;
          if (!visitorResponse.ok) { visitorResponse = await callModelNonStream(env, FALLBACK_MODEL, messages, systemPrompt, VISITOR_MAX_TOKENS); usedModel = FALLBACK_MODEL; }
          if (!visitorResponse.ok) return json({ error: "访客体验暂时不可用，请稍后再试。" }, visitorResponse.status);
          const data = await visitorResponse.json().catch(() => null);
          const choice = data?.choices?.[0] || {};
          const message = choice.message || {};
          let answer = cleanFinalAnswer(typeof message.content === "string" ? message.content : "");
          if (choice.finish_reason === "length" && answer) {
            const continuationMessages=[...messages,{role:"assistant",content:answer},{role:"user",content:"上一条回答因长度限制被截断。请只补完尚未完成的内容，不要重复前文，保持中文简洁，并把最后一句写完整。"}];
            const continuation=await callModelNonStream(env, usedModel, continuationMessages, systemPrompt, 500);
            const continuationData=continuation.ok?await continuation.json().catch(()=>null):null;
            const tail=cleanFinalAnswer(continuationData?.choices?.[0]?.message?.content||"");
            if(tail) answer += "\n\n" + tail;
          }
          if (!answer) {
            const rescuePrompt = systemPrompt + "\n\n重要：直接给用户最终中文答案，不要输出分析过程。答案必须完整，最多300字。";
            const rescue = await callModelNonStream(env, FALLBACK_MODEL, messages, rescuePrompt, 400);
            const rescueData = rescue.ok ? await rescue.json().catch(() => null) : null;
            answer = cleanFinalAnswer(rescueData?.choices?.[0]?.message?.content || "");
          }
          if (!answer) answer = "这次没有生成完整回答，请重新发送一次问题。";
          return sseText(answer, { model: usedModel, role: "visitor", skill: "general" });
        }
        let ownerResponse = await callModelNonStream(env, PRIMARY_MODEL, messages, systemPrompt+"\n\n只输出给 Owner 的最终中文答案，不输出英文分析、推理过程、草稿或内部规则。", maxTokens), usedModel = PRIMARY_MODEL;
        if (!ownerResponse.ok) { ownerResponse = await callModelNonStream(env, FALLBACK_MODEL, messages, systemPrompt+"\n\n只输出给 Owner 的最终中文答案，不输出英文分析、推理过程、草稿或内部规则。", maxTokens); usedModel = FALLBACK_MODEL; }
        if (!ownerResponse.ok) return json({ error: "回答暂时不可用，请稍后再试。" }, ownerResponse.status);
        const ownerData=await ownerResponse.json().catch(()=>null);
        const ownerChoice=ownerData?.choices?.[0]||{};
        let ownerAnswer=cleanFinalAnswer(ownerChoice?.message?.content||"");
        if(ownerChoice.finish_reason==="length" && ownerAnswer){
          const continuationMessages=[...messages,{role:"assistant",content:ownerAnswer},{role:"user",content:"上一条回答因长度限制被截断。请只补完尚未完成的内容，不要重复前文，保持中文简洁，并把最后一句写完整。"}];
          const continuation=await callModelNonStream(env,usedModel,continuationMessages,systemPrompt+"\n\n只输出给 Owner 的最终中文答案。",600);
          const continuationData=continuation.ok?await continuation.json().catch(()=>null):null;
          const tail=cleanFinalAnswer(continuationData?.choices?.[0]?.message?.content||"");
          if(tail) ownerAnswer+="\n\n"+tail;
        }
        if(!ownerAnswer) ownerAnswer="这次没有生成完整回答，请重新发送一次问题。";
        return sseText(ownerAnswer,{model:usedModel,role:"owner",skill:activeSkill?.id||"general"});
        /* legacy streaming path retained below but unreachable */
        let response = await callModel(env, PRIMARY_MODEL, messages, systemPrompt, maxTokens), usedModelLegacy = PRIMARY_MODEL;
        if (!response.ok) { response = await callModel(env, FALLBACK_MODEL, messages, systemPrompt, maxTokens); usedModelLegacy = FALLBACK_MODEL; }
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return json({ error: data?.error?.message || "免费模型暂时不可用，请稍后再试。" }, response.status);
        }
        return new Response(response.body, { status: 200, headers: {
          "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no",
          "X-Brady-Model": usedModelLegacy, "X-Brady-Role": owner ? "owner" : "visitor", "X-Brady-Skill": activeSkill?.id || "general",
          "X-Brady-Version": AGENT_VERSION
        }});
      } catch (error) { return json({ error: error?.message || "Request failed" }, 500); }
    }
    return env.ASSETS.fetch(request);
  }
};

export function cleanFinalAnswer(value="") {
  let s=String(value||"").trim();
  if(!s)return "";
  s=s.replace(/<think>[\s\S]*?<\/think>/gi,"").trim();
  s=s.replace(/^```(?:text|markdown|md)?\s*\n?/i,"").replace(/\n?```\s*$/,"").trim();
  s=s.replace(/^(?:system|developer|tool)\s*[:：\-—]+\s*/i,"").trim();
  const markers=[/\n(?:Final answer|Final|Answer|最终答案|答复)\s*[:：]\s*/i,/^(?:Final answer|Final|Answer|最终答案|答复)\s*[:：]\s*/i];
  for(const re of markers){const parts=s.split(re);if(parts.length>1)s=parts[parts.length-1].trim();}
  const firstChinese=s.search(/[\u4e00-\u9fff]/);
  if(firstChinese>0){
    const prefix=s.slice(0,firstChinese);
    if(/\b(?:we need|need to|analysis|reasoning|policy|user asks|must|should|let's|let us|assistant|system|developer|tool|thought|thinking|plan|response|draft)\b/i.test(prefix))s=s.slice(firstChinese).trim();
  }
  // Remove leaked role/analysis labels and a meaningless leading "1." without
  // destroying legitimate numbered lists that contain 2., 3. later.
  s=s.replace(/^(?:assistant|analysis|reasoning|thoughts?|thinking|final answer|final response|response|draft)\s*[:：\-—]+\s*/i,"").trim();
  if(/^1[.、]\s*/.test(s) && !/(?:^|\n)\s*2[.、]\s+/m.test(s)) s=s.replace(/^1[.、]\s*/,"").trim();
  return s;
}

async function ownerLoginKey(request) {
  const ip=(request.headers.get("CF-Connecting-IP")||"unknown").trim();
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("owner-login|"+ip));
  return b64url(digest);
}
async function ownerLoginGate(env,key) {
  if(!env.brady_agent_memory) return {ok:false};
  try {
    const row=await env.brady_agent_memory.prepare("SELECT failures, window_started FROM owner_login_attempts WHERE login_key=?").bind(key).first();
    if(!row) return {ok:true};
    const age=Math.floor(Date.now()/1000)-Number(row.window_started||0);
    if(age>=OWNER_LOGIN_WINDOW_SECONDS) return {ok:true};
    return {ok:Number(row.failures||0)<OWNER_LOGIN_MAX_FAILURES};
  } catch { return {ok:false}; }
}
async function recordOwnerLoginFailure(env,key) {
  if(!env.brady_agent_memory) return false;
  const now=Math.floor(Date.now()/1000);
  try {
    await env.brady_agent_memory.prepare("INSERT INTO owner_login_attempts(login_key,failures,window_started,updated_at) VALUES(?,1,?,?) ON CONFLICT(login_key) DO UPDATE SET failures=CASE WHEN ?-window_started>=? THEN 1 ELSE failures+1 END,window_started=CASE WHEN ?-window_started>=? THEN ? ELSE window_started END,updated_at=?").bind(key,now,now,now,OWNER_LOGIN_WINDOW_SECONDS,now,OWNER_LOGIN_WINDOW_SECONDS,now,now).run();
  } catch { return false; }
  return true;
}
async function clearOwnerLoginFailures(env,key) {
  if(!env.brady_agent_memory) return false;
  try { await env.brady_agent_memory.prepare("DELETE FROM owner_login_attempts WHERE login_key=?").bind(key).run(); return true; } catch { return false; }
}
async function isOwner(request, env) {
  if (!env.OWNER_PIN) return false;
  const token = readCookie(request, OWNER_COOKIE);
  if (!token) return false;
  return verifyOwnerSession(env, token);
}
function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}
function ownerCookie(value, maxAge) {
  return OWNER_COOKIE + "=" + encodeURIComponent(value) + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAge;
}
async function ownerSessionKey(env) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(String(env.OWNER_PIN)), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
function b64url(bytes) {
  let s=""; for (const b of new Uint8Array(bytes)) s+=String.fromCharCode(b);
  const base=btoa(s);
  return base.split("+").join("-").split("/").join("_").replace(/=+$/,"");
}
function fromB64url(s) {
  const x=s.replace(/-/g,"+").replace(/_/g,"/"); const padded=x+"=".repeat((4-x.length%4)%4);
  const raw=atob(padded); return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
}
async function createOwnerSession(env) {
  const exp=Math.floor(Date.now()/1000)+OWNER_SESSION_SECONDS;
  const nonce=crypto.getRandomValues(new Uint8Array(16));
  const payload=exp+"."+b64url(nonce);
  const sig=await crypto.subtle.sign("HMAC",await ownerSessionKey(env),new TextEncoder().encode(payload));
  return payload+"."+b64url(sig);
}
async function verifyOwnerSession(env, token) {
  try {
    const parts=String(token).split("."); if(parts.length!==3) return false;
    const now=Math.floor(Date.now()/1000);
    const exp=Number(parts[0]); if(!Number.isFinite(exp)||exp<now||exp>now+OWNER_SESSION_SECONDS+OWNER_SESSION_FUTURE_SKEW_SECONDS) return false;
    const payload=parts[0]+"."+parts[1];
    return crypto.subtle.verify("HMAC",await ownerSessionKey(env),fromB64url(parts[2]),new TextEncoder().encode(payload));
  } catch { return false; }
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0;
}
async function processMemoryCandidate(env, text) {
  if (!env.brady_agent_memory || typeof text !== "string") return;
  const raw = text.trim(); if (!raw || raw.length > 1200) return;
  const explicit = raw.match(/^(?:请)?(?:帮我)?记住[：:，,\s]*(.+)$/s);
  let content = explicit ? explicit[1].trim() : raw; if (!content) return;
  if (!explicit) {
    if (content.length < 8 || content.length > 800) return;
    if (/^(好|好的|可以|行|开始|继续|谢谢|收到|明白|知道了|没问题)[。！!？?]*$/.test(content)) return;
    if (/^(今天|刚才|现在|这次|临时|测试)/.test(content) && !/(以后|长期|一直|目标|计划|准备|考试|第[一二三四五六七八九十\d]+章)/.test(content)) return;
  }
  let category = null;
  const rules = [
    ["profile", /(?:我叫|我的名字|叫我|我是\d+岁|我今年\d+|我住在|我来自|我的职业|我从事|我有[一二两三四五六七八九\d]+个孩子)/],
    ["preference", /(?:我喜欢|我偏好|我不喜欢|我习惯|我希望你以后|以后回答我|以后请|我更喜欢|我倾向于)/],
    ["project", /(?:我正在(?:开发|做|搭建|运营)|我目前在(?:开发|做|搭建|运营)|我的项目|我准备长期做|我的网站|我的Agent|我的智能体)/i],
    ["work", /(?:我主要做|我的工作|我负责|我做制冷|我做冷库|我的客户|我的业务)/],
    ["learning", /(?:中级经济师|经济师|工商管理|经济基础|我正在学|我在学习|我的学习|学习目前|我的学习目标|我的考试|我要考|准备考|我想在\d+天|我计划学习|\d+月.*考试|已经完成第[一二三四五六七八九十\d]+章|完成第[一二三四五六七八九十\d]+章|学完第[一二三四五六七八九十\d]+章|学到第[一二三四五六七八九十\d]+章|开始学习第[一二三四五六七八九十\d]+章|开始第[一二三四五六七八九十\d]+章|开始刷题|正在刷题|错题|模拟考试|模拟卷)/]
  ];
  const found = rules.find(([, re]) => re.test(content)); category = found?.[0] || (explicit ? "general" : null); if (!category) return;
  content = content.replace(/\s+/g, " ").slice(0, 800);
  const rows = await env.brady_agent_memory.prepare("SELECT id, category, content FROM memories ORDER BY updated_at DESC, id DESC LIMIT 100").all();
  const memories = rows.results || [], normalized = normalizeMemory(content);
  if (memories.some(m => normalizeMemory(m.content) === normalized)) return;
  const topic = memoryTopic(category, content);
  const related = topic ? memories.find(m => m.category === category && memoryTopic(m.category, m.content) === topic) : null;
  if (related) {
    const similarity = memorySimilarity(related.content, content);
    if (similarity >= 0.82) return;
    await env.brady_agent_memory.prepare("UPDATE memories SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(content, related.id).run();
    return;
  }
  await env.brady_agent_memory.prepare("INSERT INTO memories (category, content) VALUES (?, ?)").bind(category, content).run();
}
function normalizeMemory(text) { return String(text).toLowerCase().replace(/[\s，。！？、,.!?;；:："'“”‘’（）()\-]/g, ""); }
function memoryTopic(category, text) {
  const rules = {
    profile: [["name", /名字|我叫|叫我/], ["location", /住在|来自|常驻/], ["career", /职业|从事/], ["family", /孩子|家庭/]],
    preference: [["english-style", /英语|英式|发音|口音/], ["answer-style", /回答|简短|详细|直接/]],
    project: [["brady-agent", /Brady\s*Agent|Agent|智能体/i], ["website", /网站|bradyci/i]],
    work: [["refrigeration", /制冷|冷库|冷风机|压缩机/]],
    learning: [
      ["economist-progress", /(?:经济师|工商管理|经济基础).*(?:第[一二三四五六七八九十\d]+章|学完|学到|进度|刷题|错题|模拟)|(?:第[一二三四五六七八九十\d]+章|学完|学到|进度|刷题|错题|模拟).*(?:经济师|工商管理|经济基础)|^(?:我(?:的)?中级经济师)?第[一二三四五六七八九十\d]+章.*(?:学完|完成|开始)/],
      ["economist-goal", /经济师|工商管理|经济基础/],
      ["english-progress", /英语.*(?:学到|进度|练习了|完成)|(?:学到|进度|练习了|完成).*英语/],
      ["english-goal", /英语|口语|英式/]
    ]
  };
  const hit = (rules[category] || []).find(([, re]) => re.test(text)); return hit?.[0] || null;
}
function memorySimilarity(a, b) {
  const x = memoryTokens(a), y = memoryTokens(b); if (!x.size || !y.size) return 0;
  let common = 0; for (const token of x) if (y.has(token)) common++; return common / Math.max(x.size, y.size);
}
function memoryTokens(text) { const s = normalizeMemory(text), out = new Set(); for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2)); return out; }
async function loadMemories(env) {
  if (!env.brady_agent_memory) return [];
  try { const result = await env.brady_agent_memory.prepare("SELECT category, content FROM memories ORDER BY updated_at DESC, id DESC LIMIT 40").all(); return result.results || []; }
  catch { return []; }
}
function callModelNonStream(env, model, messages, systemPrompt, maxTokens = 700) {
  return fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: {
    "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json",
    "HTTP-Referer": "https://bradyci.com", "X-Title": "Brady Agent"
  }, body: JSON.stringify({ model, stream: false, max_tokens: maxTokens, temperature: 0.2, messages: [{ role: "system", content: systemPrompt }, ...messages] }) });
}
function formatDeterministicRefrigerationResult(data) {
  const r = data?.result;
  if (!r) return null;
  if (!r.ok) return (data.tool === "product_core_freezing_time" ? formatCoreFreezingFailure(r) : "") || r.message || r.error || (r.missing?.length ? "还缺参数：" + r.missing.join("、") : null);
  if (data.tool === "cold_storage_load") {
    const g=r.geometry||{}, e=r.envelope||{};
    return "**围护结构传热负荷：" + r.totalKW + " kW**\n\n"
      + "- 库容：" + g.volumeM3 + " m³\n"
      + "- 墙面：" + g.wallAreaM2 + " m²，负荷 " + e.walls?.loadKW + " kW\n"
      + "- 顶板：" + g.roofAreaM2 + " m²，负荷 " + e.roof?.loadKW + " kW\n"
      + "- 地面：" + g.floorAreaM2 + " m²，负荷 " + e.floor?.loadKW + " kW\n"
      + "- 安全系数：" + r.safetyFactor + "\n\n"
      + "以上为围护结构及已明确输入项目的确定性计算结果；未提供的货物、换气、人员、照明、风机、化霜等负荷未计入。";
  }
  if (data.tool === "cold_storage_load_range") {
    return "**围护结构负荷范围：" + r.totalLoadRangeKW.min + "–" + r.totalLoadRangeKW.max + " kW**\n\n"
      + "- U值范围：" + r.uValueRangeWm2K.min.toFixed(3) + "–" + r.uValueRangeWm2K.max.toFixed(3) + " W/(m²·K)\n"
      + "- 传热负荷范围：" + r.transmissionLoadRangeKW.min + "–" + r.transmissionLoadRangeKW.max + " kW\n\n"
      + "该范围来自热工参数范围传播，不是安全系数、设备选型裕量或压缩机推荐范围。";
  }
  if (data.tool === "product_load") {
    const en=r.energyKJ||{}, inp=r.inputs||{};
    let s = "**货物降温/冻结平均负荷：" + r.averageLoadKW + " kW**\n\n"
      + "- 货物质量：" + inp.massKg + " kg\n"
      + "- 入库温度：" + inp.entryTempC + "℃\n"
      + "- 目标温度：" + inp.targetTempC + "℃\n"
      + "- 处理时间：" + inp.pullDownHours + " h\n"
      + "- 总热量：" + en.total + " kJ";
    if (r.freezing) s += "\n- 冻结前显热：" + en.sensibleAbove + " kJ\n- 冻结潜热：" + en.latent + " kJ\n- 冻结后显热：" + en.sensibleBelow + " kJ";
    if (r.propertyData) s += "\n\n**采用的食品热物性**\n- 食品：" + r.propertyData.label + "\n- 冻结点：" + inp.freezingPointC + "℃\n- 冻结点以上比热：" + inp.cpAboveKJkgK + " kJ/(kg·K)\n- 冻结潜热：" + inp.latentHeatKJkg + " kJ/kg\n- 冻结点以下比热：" + inp.cpBelowKJkgK + " kJ/(kg·K)\n- 资料来源：" + r.propertyData.source;
    return s + "\n\n这是货物负荷，不等于压缩机选型冷量。";
  }
  if (data.tool === "envelope_u_value") return "**理论 U 值：" + r.uValueWm2K + " W/(m²·K)**\n\n" + (r.notes || []).join("\n");
  if (data.tool === "envelope_u_value_range") return "**理论 U 值范围：" + r.uValueRangeWm2K.min + "–" + r.uValueRangeWm2K.max + " W/(m²·K)**\n\n" + (r.notes || []).join("\n");
  return null;
}

function parseToolRequest(text) {
  if (typeof text !== "string") return null;
  const match = text.trim().match(/^\{[\s\S]*\}$/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[0]);
    return ["cold_storage_load", "cold_storage_load_range", "product_load", "envelope_u_value", "envelope_u_value_range"].includes(data?.__brady_tool__) && data.args && typeof data.args === "object" ? data : null;
  } catch { return null; }
}
function sseText(content, meta = {}) {
  const payload = JSON.stringify({ choices: [{ delta: { content } }] });
  const done = "data: " + payload + "\n\ndata: [DONE]\n\n";
  return new Response(done, { status: 200, headers: {
    "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache",
    "X-Brady-Model": meta.model || "", "X-Brady-Role": meta.role || "", "X-Brady-Skill": meta.skill || "general",
    "X-Brady-Tool": meta.tool || "", "X-Brady-Version": AGENT_VERSION
  }});
}
function callModel(env, model, messages, systemPrompt, maxTokens = 900) {
  return fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: {
    "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json",
    "HTTP-Referer": "https://bradyci.com", "X-Title": "Brady Agent"
  }, body: JSON.stringify({ model, stream: true, max_tokens: maxTokens, temperature: 0.6, messages: [{ role: "system", content: systemPrompt }, ...messages] }) });
}
function jsonWithHeaders(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...extra } });
}
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } }); }
