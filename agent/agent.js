const chat=document.querySelector("#chat"),input=document.querySelector("#input"),form=document.querySelector("#composer"),welcome=document.querySelector(".welcome"),send=document.querySelector("#send");
const messages=[];
let ownerPin=sessionStorage.getItem("bradyOwnerPin")||"";

function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function renderMarkdown(text){
  let s=escapeHtml(text);const blocks=[];
  s=s.replace(/```([\s\S]*?)```/g,(_,code)=>{const i=blocks.push(`<pre><code>${code.trim()}</code></pre>`)-1;return `@@CODE${i}@@`});
  s=s.replace(/`([^`\n]+)`/g,"<code>$1</code>").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
  s=s.replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>");
  s=s.replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>");
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
}
async function verifyStoredPin(){
  if(!ownerPin){setOwnerUI(false);return;}
  const r=await fetch("/api/owner/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:ownerPin})});
  if(!r.ok){ownerPin="";sessionStorage.removeItem("bradyOwnerPin");setOwnerUI(false);return;}
  setOwnerUI(true);
}
document.querySelector("#ownerLogin").onclick=async()=>{
  if(ownerPin){ownerPin="";sessionStorage.removeItem("bradyOwnerPin");setOwnerUI(false);location.reload();return;}
  const pin=prompt("请输入 Owner PIN：");if(!pin)return;
  const r=await fetch("/api/owner/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin})});
  if(!r.ok){alert("Owner PIN 不正确。");return;}
  ownerPin=pin;sessionStorage.setItem("bradyOwnerPin",pin);setOwnerUI(true);alert("Owner 身份验证成功。");
};
document.querySelectorAll(".chips button").forEach(b=>b.onclick=()=>{input.value=b.textContent;input.focus()});
form.addEventListener("submit",async e=>{
  e.preventDefault();const t=input.value.trim();if(!t||send.disabled)return;
  add(t,"user");messages.push({role:"user",content:t});input.value="";send.disabled=true;const bubble=add("正在连接…","assistant");let reply="";
  try{
    const headers={"Content-Type":"application/json"};if(ownerPin)headers["X-Owner-Pin"]=ownerPin;
    const r=await fetch("/api/chat",{method:"POST",headers,body:JSON.stringify({messages})});
    if(!r.ok){const data=await r.json().catch(()=>({}));throw new Error(data.error||"请求失败");}
    if(!r.body)throw new Error("浏览器不支持流式响应");bubble.textContent="";
    const reader=r.body.getReader(),decoder=new TextDecoder();let buffer="";
    while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";
      for(const raw of lines){const line=raw.trim();if(!line.startsWith("data:"))continue;const payload=line.slice(5).trim();if(!payload||payload==="[DONE]")continue;
        try{const data=JSON.parse(payload),delta=data?.choices?.[0]?.delta?.content;if(typeof delta==="string"&&delta){reply+=delta;bubble.innerHTML=renderMarkdown(reply);chat.scrollTop=chat.scrollHeight;}}catch{}
      }
    }
    if(!reply)throw new Error("模型没有返回内容");messages.push({role:"assistant",content:reply});
  }catch(err){bubble.innerHTML=renderMarkdown("暂时无法连接 AI："+err.message);}finally{send.disabled=false;input.focus();}
});
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
document.querySelector("#clear").onclick=()=>location.reload();
verifyStoredPin();
