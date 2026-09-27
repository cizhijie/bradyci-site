const chat=document.querySelector("#chat"),input=document.querySelector("#input"),form=document.querySelector("#composer"),welcome=document.querySelector(".welcome");
function add(text,type){welcome?.classList.add("hidden");const d=document.createElement("div");d.className="message "+type;d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight}
document.querySelectorAll(".chips button").forEach(b=>b.onclick=()=>{input.value=b.textContent;input.focus()});
form.addEventListener("submit",e=>{e.preventDefault();const t=input.value.trim();if(!t)return;add(t,"user");input.value="";setTimeout(()=>add("界面已经可以工作。下一步接入模型 API 后，我就能真正回答和执行任务。","assistant"),250)});
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
document.querySelector("#clear").onclick=()=>location.reload();