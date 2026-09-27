// Heat-rejection strategy intake and candidate generation.
// This does NOT auto-select a condenser type. It converts customer-known facts
// into defensible candidates and the next questions needed for engineering review.

export function assessHeatRejectionCandidates(state={}){
  const known=String(state.heatRejectionType||"");
  if(known) return {
    resolved:true,
    selectedByProject:known,
    candidates:[known],
    rule:"Project/customer choice is preserved; verify site feasibility before formal selection."
  };

  const candidates=[];
  const questions=[];
  const water=String(state.siteUtilities?.waterAvailability||state.waterAvailability||"");
  const waterQuality=String(state.siteUtilities?.waterQuality||state.waterQuality||"");
  const waterRestricted=/无|没有|缺|限制|困难|不方便/.test(water);
  const waterAvailable=/有|可以|充足|方便/.test(water) && !waterRestricted;

  candidates.push({
    type:"air-cooled",
    status:"candidate",
    why:"Does not require cooling-water infrastructure; suitability still depends on project design ambient, condenser size, noise/space and manufacturer rating."
  });

  if(!waterRestricted){
    candidates.push({
      type:"evaporative",
      status:waterAvailable?"candidate":"needs_site_confirmation",
      why:"May be considered where make-up water, drainage, water treatment and maintenance are acceptable; do not infer suitability from load alone."
    });
    candidates.push({
      type:"water-cooled",
      status:waterAvailable?"candidate":"needs_site_confirmation",
      why:"Requires a complete condenser-water/heat-rejection system and verified water conditions; do not reuse air-cooled Tc assumptions."
    });
  }

  if(!water) questions.push("现场补水、排水是否方便？如果长期需要用水，客户能否接受？");
  if(!waterQuality && !waterRestricted) questions.push("现场水质大概怎样，是否已有循环水/冷却塔/水处理条件？");
  questions.push("室外机/冷凝器安装位置大概在哪里？空间、噪声或飘水有没有限制？");

  return {
    resolved:false,
    candidates,
    customerQuestions:questions,
    rule:"Condenser type is a system-design choice. Quick estimate may compare candidates, but must not silently choose air/water/evaporative solely from room load or horsepower."
  };
}
