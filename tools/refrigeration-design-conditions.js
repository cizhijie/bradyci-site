// Refrigeration design-condition bridge.
// Keeps room temperature separate from evaporating temperature (Te), and
// ambient/project heat-rejection condition separate from condensing temperature (Tc).
// No universal TD/approach is silently assumed.

function r1(n){ return Math.round(Number(n)*10)/10; }

export function deriveEvaporatingTemperature({roomTempC,evaporatorTDK}={}){
  const room=Number(roomTempC), td=Number(evaporatorTDK);
  if(!Number.isFinite(room)) return {ok:false,error:"missing_room_temperature"};
  if(!Number.isFinite(td) || td<=0) return {
    ok:false,error:"missing_evaporator_td",
    roomTempC:room,
    rule:"Te must be derived from a justified evaporator temperature difference or supplied directly; room temperature is not Te."
  };
  return {ok:true,roomTempC:room,evaporatorTDK:td,evaporatingTempC:r1(room-td)};
}

export function deriveCondensingTemperature({heatRejectionType,designAmbientTempC,condenserApproachK,designWetBulbC}={}){
  const type=String(heatRejectionType||"").toLowerCase();
  const approach=Number(condenserApproachK);
  if(!type) return {ok:false,error:"missing_heat_rejection_type"};
  if(!Number.isFinite(approach) || approach<=0) return {ok:false,error:"missing_condenser_approach"};
  if(/air|风冷/.test(type)){
    const ambient=Number(designAmbientTempC);
    if(!Number.isFinite(ambient)) return {ok:false,error:"missing_design_ambient_temperature"};
    return {ok:true,heatRejectionType:"air-cooled",designAmbientTempC:ambient,condenserApproachK:approach,condensingTempC:r1(ambient+approach)};
  }
  if(/evap|蒸发冷/.test(type)){
    const wb=Number(designWetBulbC);
    if(!Number.isFinite(wb)) return {ok:false,error:"missing_design_wet_bulb_temperature"};
    return {ok:true,heatRejectionType:"evaporative",designWetBulbC:wb,condenserApproachK:approach,condensingTempC:r1(wb+approach)};
  }
  return {ok:false,error:"unsupported_heat_rejection_type",rule:"Water-cooled systems need their own entering-water/tower/condenser design chain; do not reuse the air-cooled rule."};
}

export function assessRefrigerationConditionInputs(state={}){
  const missing=[];
  if(!state.refrigerant) missing.push("refrigerant");
  const hasTe=Number.isFinite(Number(state.evaporatingTempC));
  if(!hasTe && !Number.isFinite(Number(state.evaporatorTDK))) missing.push("evaporating_temperature_or_TD");
  const hasTc=Number.isFinite(Number(state.condensingTempC));
  if(!hasTc){
    if(!state.heatRejectionType) missing.push("heat_rejection_type");
    if(!Number.isFinite(Number(state.condenserApproachK))) missing.push("condenser_approach");
    if(/蒸发冷|evap/i.test(String(state.heatRejectionType||"")) && !Number.isFinite(Number(state.designWetBulbC))) missing.push("design_wet_bulb");
    if(/风冷|air/i.test(String(state.heatRejectionType||"")) && !Number.isFinite(Number(state.projectOutdoorTempC))) missing.push("design_ambient");
  }
  return {ready:missing.length===0,missing,rule:"Te/Tc are equipment-rating conditions, not synonyms for room temperature/outdoor temperature."};
}
