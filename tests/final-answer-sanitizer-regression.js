import { cleanFinalAnswer } from "../worker.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runFinalAnswerSanitizerRegression(){
  check(cleanFinalAnswer("Analysis: we need to answer carefully. 这是正常中文回答。")==="这是正常中文回答。","must remove leaked English analysis prefix");
  check(cleanFinalAnswer("assistant: 这是正常回答。")==="这是正常回答。","must remove leaked assistant label");
  check(cleanFinalAnswer("1. 这是不该有的孤立编号。")==="这是不该有的孤立编号。","must remove meaningless lone leading number");
  const numbered="1. 第一点\n2. 第二点\n3. 第三点";
  check(cleanFinalAnswer(numbered)===numbered,"must preserve a real numbered list");
  check(cleanFinalAnswer("<think>内部推理</think>最终答案：这是最终回答。")==="这是最终回答。","must remove think block and final-answer label");
  check(cleanFinalAnswer("```markdown\n这是正常回答。\n```")==="这是正常回答。","must remove leaked markdown code fence");
  check(cleanFinalAnswer("system: 这是正常回答。")==="这是正常回答。","must remove leaked system label");
  const inlineCode="请执行 `npm test` 检查。";
  check(cleanFinalAnswer(inlineCode)===inlineCode,"must preserve legitimate inline code");
  return {ok:true,checks:8};
}
