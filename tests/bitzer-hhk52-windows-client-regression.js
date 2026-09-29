import {readFileSync} from "node:fs";
import {createHhk52WindowsNativeClient} from "../tools/bitzer-hhk52-windows-client.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerHhk52WindowsClientRegression(){
 const src=readFileSync(new URL("../tools/bitzer-hhk52-windows-client.js",import.meta.url),"utf8");
 ck(src.includes("spawn")&&src.includes("bitzer-hhk52-runner.ps1"),"launcher uses isolated Windows runner");
 ck(src.includes("buildHhk52DesignCall"),"launcher validates through reviewed HHK52 call builder");
 ck(typeof createHhk52WindowsNativeClient==="function","native client factory exported");
 return {ok:true,checks:3};
}
