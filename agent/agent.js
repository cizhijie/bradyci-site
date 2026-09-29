const chat=document.querySelector("#chat"),input=document.querySelector("#input"),form=document.querySelector("#composer"),welcome=document.querySelector(".welcome"),send=document.querySelector("#send");
const messages=[];
const MAX_CHAT_MESSAGES=12;
let ownerAuthenticated=false;
sessionStorage.removeItem("bradyOwnerPin");
let projectId=(globalThis.crypto?.randomUUID?.()||("p-"+Date.now()+"-"+Math.random().toString(36).slice(2)));

function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function renderMarkdown(text){
  let s=escapeHtml(text);const blocks=[];
  s=s.replace(/```([\s\S]*?)```/g,(_,code)=>{const i=blocks.push(`<pre><code>${code.trim()}</code></pre>`)-1;return `@@CODE${i}@@`});
  s=s.replace(/`([^`\n]+)`/g,"<code>$1</code>").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
  s=s.replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>");
  s=s.replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>");
  s=s.replace(/((?:^|\n)(?:\|.*\|\n){2,})/g,block=>{
    const rows=block.trim().split("\n").filter(x=>/^\|.*\|$/.test(x));
    if(rows.length<2||!/^\|?\s*:?-{3,}/.test(rows[1].replace(/^\|/,"")))return block;
    const cells=r=>r.replace(/^\||\|$/g,"").split("|").map(x=>x.trim());
    const head=cells(rows[0]), body=rows.slice(2).map(cells);
    return "\n<table><thead><tr>"+head.map(x=>"<th>"+x+"</th>").join("")+"</tr></thead><tbody>"+body.map(r=>"<tr>"+r.map(x=>"<td>"+x+"</td>").join("")+"</tr>").join("")+"</tbody></table>\n";
  });
  s=s.replace(/(?:^|\n)((?:[-*] .+(?:\n|$))+)/g,(_,list)=>"\n<ul>"+list.trim().split("\n").map(x=>`<li>${x.replace(/^[-*] /,"")}</li>`).join("")+"</ul>");
  s=s.replace(/(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g,(_,list)=>"\n<ol>"+list.trim().split("\n").map(x=>`<li>${x.replace(/^\d+\. /,"")}</li>`).join("")+"</ol>");
  s=s.replace(/\n{2,}/g,"</p><p>").replace(/\n/g,"<br>");s=`<p>${s}</p>`.replace(/<p>\s*(<(?:h[1-3]|ul|ol|pre|blockquote)>)/g,"$1").replace(/(<\/(?:h[1-3]|ul|ol|pre|blockquote)>)\s*<\/p>/g,"$1");
  blocks.forEach((b,i)=>{s=s.replace(`@@CODE${i}@@`,b)});return s;
}
function add(text,type){welcome?.classList.add("hidden");const d=document.createElement("div");d.className="message "+type;if(type==="assistant")d.innerHTML=renderMarkdown(text);else d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d;}
function setOwnerUI(isOwner){
  const btn=document.querySelector("#ownerLogin");
  document.querySelector("#roleLabel").textContent=isOwner?"OWNER MODE":"VISITOR MODE";
  document.querySelector("#greeting").textContent=isOwner?"你好，阿杰。":"你好，欢迎使用 Brady Agent。";
  document.querySelector("#welcomeText").textContent=isOwner?"Owner 身份已验证。Brady Agent 可以读取你的私人长期记忆来协助当前对话。":"当前为访客模式。你可以正常使用 AI；Owner 私人记忆不会向访客开放。";
  document.querySelector("#modeNote").textContent=isOwner?"Owner 模式":"访客模式";
  btn.textContent=isOwner?"Owner 已登录":"Owner 登录";btn.classList.toggle("owner-active",isOwner);
  document.querySelector("#memoryBtn").classList.toggle("hidden",!isOwner);
}
async function verifyStoredPin(){
  const r=await fetch("/api/owner/session",{credentials:"same-origin"}).catch(()=>null);
  ownerAuthenticated=!!r?.ok;
  setOwnerUI(ownerAuthenticated);
}
const ownerLoginPanel=document.querySelector("#ownerLoginPanel"),ownerLoginForm=document.querySelector("#ownerLoginForm"),ownerPinInput=document.querySelector("#ownerPinInput"),ownerLoginMessage=document.querySelector("#ownerLoginMessage");
function closeOwnerLogin(){ownerPinInput.value="";ownerLoginMessage.textContent="";ownerLoginPanel.classList.add("hidden");}
document.querySelector("#ownerLoginClose").onclick=closeOwnerLogin;
document.querySelector("#ownerLogin").onclick=async()=>{
  if(ownerAuthenticated){
    await fetch("/api/owner/logout",{method:"POST",credentials:"same-origin"}).catch(()=>{});
    ownerAuthenticated=false;setOwnerUI(false);location.reload();return;
  }
  ownerPinInput.value="";ownerLoginMessage.textContent="";ownerLoginPanel.classList.remove("hidden");ownerPinInput.focus();
};
ownerLoginForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const pin=ownerPinInput.value;if(!pin)return;
  const submit=document.querySelector("#ownerLoginSubmit");submit.disabled=true;ownerLoginMessage.textContent="正在验证…";
  let r;
  try {
    r=await fetch("/api/owner/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin})});
  } catch {
    ownerLoginMessage.textContent="Owner 登录请求失败，请检查网络后重试。";submit.disabled=false;ownerPinInput.select();return;
  }
  ownerPinInput.value="";
  if(!r.ok){
    const data=await r.json().catch(()=>({}));
    if(r.status===429) ownerLoginMessage.textContent=data.error||"登录尝试过多，请稍后再试。";
    else if(r.status===503) ownerLoginMessage.textContent=data.error||"Owner 登录保护暂时不可用，请稍后再试。";
    else ownerLoginMessage.textContent=data.error||"Owner PIN 不正确。";
    submit.disabled=false;ownerPinInput.focus();return;
  }
  ownerAuthenticated=true;setOwnerUI(true);submit.disabled=false;closeOwnerLogin();alert("Owner 身份验证成功。");
});
document.querySelectorAll(".chips button").forEach(b=>b.onclick=()=>{input.value=b.textContent;input.focus()});
form.addEventListener("submit",async e=>{
  e.preventDefault();const t=input.value.trim();if(!t||send.disabled)return;
  add(t,"user");messages.push({role:"user",content:t});input.value="";send.disabled=true;const bubble=add("正在连接…","assistant");let reply="";
  try{
    const headers={"Content-Type":"application/json"};
    const r=await fetch("/api/chat",{method:"POST",headers,body:JSON.stringify({messages:messages.slice(-MAX_CHAT_MESSAGES),projectId})});
    if(!r.ok){const data=await r.json().catch(()=>({}));throw new Error(data.error||"请求失败");}
    const toolUsed=r.headers.get("X-Brady-Tool")||"";
    const contentType=r.headers.get("content-type")||"";
    if(!r.body||!r.body.getReader){
      const text=await r.text();
      if(!text)throw new Error("服务器没有返回内容");
      bubble.innerHTML=renderMarkdown(text);reply=text;
      messages.push({role:"assistant",content:reply});
      return;
    }
    bubble.textContent="";
    const reader=r.body.getReader(),decoder=new TextDecoder();let buffer="";
    while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";
      for(const raw of lines){const line=raw.trim();if(!line.startsWith("data:"))continue;const payload=line.slice(5).trim();if(!payload||payload==="[DONE]")continue;
        try{const data=JSON.parse(payload),delta=data?.choices?.[0]?.delta?.content;if(typeof delta==="string"&&delta){reply+=delta;bubble.innerHTML=(toolUsed?"<p><strong>⚙ 已调用确定性计算工具："+escapeHtml(toolUsed)+"</strong></p>":"")+renderMarkdown(reply);chat.scrollTop=chat.scrollHeight;}}catch{}
      }
    }
    if(buffer.trim()){
      for(const raw of buffer.split("\n")){
        const line=raw.trim();if(!line.startsWith("data:"))continue;
        const payload=line.slice(5).trim();if(!payload||payload==="[DONE]")continue;
        try{const data=JSON.parse(payload),delta=data?.choices?.[0]?.delta?.content;if(typeof delta==="string"&&delta){reply+=delta;bubble.innerHTML=(toolUsed?"<p><strong>⚙ 已调用确定性计算工具："+escapeHtml(toolUsed)+"</strong></p>":"")+renderMarkdown(reply);}}catch{}
      }
    }
    if(!reply)throw new Error("模型没有返回内容");messages.push({role:"assistant",content:reply});
  }catch(err){bubble.innerHTML=renderMarkdown("暂时无法连接 AI："+err.message);}finally{send.disabled=false;input.focus();}
});
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
document.querySelector("#clear").onclick=async()=>{
  messages.length=0;
  if(ownerAuthenticated){
    await fetch("/api/project/cold-room/reset",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({projectId})}).catch(()=>{});
    projectId=(globalThis.crypto?.randomUUID?.()||("p-"+Date.now()+"-"+Math.random().toString(36).slice(2)));
  }
  location.reload();
};
verifyStoredPin();

const memoryPanel=document.querySelector("#memoryPanel"),memoryList=document.querySelector("#memoryList");
function ownerHeaders(){return {"Content-Type":"application/json"};}
function memoryCategoryName(c){return ({general:"一般",profile:"个人",preference:"偏好",project:"项目",work:"工作",learning:"学习"})[c]||c;}
async function loadMemoryManager(){
  memoryList.innerHTML="<p class='memory-empty'>正在读取…</p>";
  const r=await fetch("/api/memory",{headers:ownerHeaders()});
  if(!r.ok){memoryList.innerHTML="<p class='memory-empty'>读取失败，请重新登录 Owner。</p>";return;}
  const data=await r.json(),items=data.memories||[];
  if(!items.length){memoryList.innerHTML="<p class='memory-empty'>还没有长期记忆。</p>";return;}
  memoryList.innerHTML="";
  items.forEach(m=>{
    const row=document.createElement("div");row.className="memory-item";
    row.innerHTML=`<span class="memory-tag">${escapeHtml(memoryCategoryName(m.category))}</span><div class="memory-content">${escapeHtml(m.content)}</div><div class="memory-actions"><button data-edit>编辑</button><button data-delete>删除</button></div>`;
    row.querySelector("[data-delete]").onclick=async()=>{if(!confirm("删除这条长期记忆？"))return;await fetch("/api/memory?id="+m.id,{method:"DELETE",headers:ownerHeaders()});loadMemoryManager();};
    row.querySelector("[data-edit]").onclick=async()=>{const content=prompt("修改记忆：",m.content);if(content===null||!content.trim())return;await fetch("/api/memory",{method:"PUT",headers:ownerHeaders(),body:JSON.stringify({id:m.id,category:m.category,content:content.trim()})});loadMemoryManager();};
    memoryList.appendChild(row);
  });
}
document.querySelector("#memoryBtn").onclick=()=>{memoryPanel.classList.remove("hidden");loadMemoryManager();};
document.querySelector("#memoryClose").onclick=()=>memoryPanel.classList.add("hidden");
memoryPanel.addEventListener("click",e=>{if(e.target===memoryPanel)memoryPanel.classList.add("hidden")});
document.querySelector("#memoryAdd").onclick=async()=>{
  const field=document.querySelector("#memoryInput"),content=field.value.trim();if(!content)return;
  const category=document.querySelector("#memoryCategory").value;
  const r=await fetch("/api/memory",{method:"POST",headers:ownerHeaders(),body:JSON.stringify({category,content})});
  if(r.ok){field.value="";loadMemoryManager();}else alert("保存失败");
};
