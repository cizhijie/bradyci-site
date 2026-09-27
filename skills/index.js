import { economistSkill } from "./economist.js";
import { refrigerationSkill } from "./refrigeration.js";

export const SKILLS = [
  refrigerationSkill,
  economistSkill
];

export function routeSkill(text, memories = []) {
  const raw = String(text || "");
  const direct = SKILLS.find(skill => skill.detect.test(raw));
  if (direct) return direct;

  if (/^(继续|开始|复习|学习|接着来|继续吧)[。！!？?\s]*$/.test(raw)) {
    return SKILLS.find(skill =>
      skill.memoryMatch && memories.some(memory => skill.memoryMatch.test(memory.content))
    ) || null;
  }
  return null;
}

export function splitMemories(memories, activeSkill) {
  if (!activeSkill?.memoryMatch) {
    return { longTerm: memories.slice(0, 24), project: [] };
  }

  const project = [];
  const longTerm = [];

  for (const memory of memories) {
    if (activeSkill.memoryMatch.test(memory.content)) project.push(memory);
    else longTerm.push(memory);
  }

  return {
    longTerm: longTerm.slice(0, 24),
    project: project.slice(0, 12)
  };
}
