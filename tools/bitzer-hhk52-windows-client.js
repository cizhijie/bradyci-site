// Windows-only HHK52 runner launcher.
// The actual 32-bit vendor DLL call lives in the PowerShell helper process so the
// cloud/64-bit agent never attempts to load legacy BITZER binaries in-process.
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {buildHhk52DesignCall} from "./bitzer-hhk52-native-client.js";

const here=dirname(fileURLToPath(import.meta.url));
const ps1=join(here,"bitzer-hhk52-runner.ps1");

export function createHhk52WindowsNativeClient({powershell="",dllDirectory="",refrigerantPath="",nameplatePath=""}={}){
 return {
  async design(request={}){
   const call=buildHhk52DesignCall(request);
   if(!call.ok)return {ok:false,vendorCode:null,status:"invalid_hhk52_call",blocked:call.blocked};
   const payload={...call,request,dllDirectory,refrigerantPath,nameplatePath};\n   const psHost=powershell||((process.env.WINDIR&&process.arch==="x64")?join(process.env.WINDIR,"SysWOW64","WindowsPowerShell","v1.0","powershell.exe"):"powershell.exe");
   return await new Promise((resolve,reject)=>{
    const p=spawn(psHost,["-NoProfile","-ExecutionPolicy","Bypass","-File",ps1],{stdio:["pipe","pipe","pipe"],windowsHide:true});
    let out="",err="";
    p.stdout.setEncoding("utf8"); p.stderr.setEncoding("utf8");
    p.stdout.on("data",d=>out+=d); p.stderr.on("data",d=>err+=d);
    p.on("error",reject);
    p.on("close",code=>{
     if(code!==0)return reject(new Error("HHK52 runner failed ("+code+"): "+err.trim()));
     try{resolve(JSON.parse(out));}catch(e){reject(new Error("Invalid HHK52 runner JSON: "+out.slice(0,500)));}
    });
    p.stdin.end(JSON.stringify(payload));
   });
  }
 };
}
