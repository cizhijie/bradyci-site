const chat=document.querySelector("#chat"),input=document.querySelector("#input"),form=document.querySelector("#composer"),welcome=document.querySelector(".welcome"),send=document.querySelector("#send");
const messages=[];
function add(text,type){welcome?.classList.add("hidden");const d=document.createElement("div");d.className="message "+type;d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d}
document.querySelectorAll(".chips button").forEach(b=>b.onclick=()=>{input.value=b.textContent;input.focus()});
form.addEventListener("submit",async e=>{
  e.preventDefault();const t=input.value.trim();if(!t||send.disabled)return;
  add(t,"user");messages.push({role:"user",content:t});input.value="";send.disabled=true;
  const waiting=add("正在思考…","assistant");
  try{
    const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages})});
    const data=await r.json();waiting.remove();
    if(!r.ok) throw new Error(data.error||"请求失败");
    add(data.reply,"assistant");messages.push({role:"assistant",content:data.reply});
  }catch(err){waiting.textContent="暂时无法连接 AI："+err.message}
  finally{send.disabled=false;input.focus()}
});
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
document.querySelector("#clear").onclick=()=>location.reload();