// Cleland-Earle modified-Plank freezing time, SI implementation.
// Eq. 6 gives time to the -10 C reference center temperature.
// Eq. 7 applies the 1984 final-center-temperature correction.
// IMPORTANT: deltaH10 is volumetric enthalpy change from Tf to -10 C; do not substitute latent heat.
const pos=(v,n)=>{const x=Number(v);if(!Number.isFinite(x)||x<=0)throw new Error(n+"_must_be_positive");return x};
const num=(v,n)=>{const x=Number(v);if(!Number.isFinite(x))throw new Error(n+"_required");return x};

export function clelandEarleSlabFreezingTime(i={}){
 const dH10=pos(i.deltaH10Jm3,"deltaH10Jm3"),Tf=num(i.initialFreezingTempC,"initialFreezingTempC"),
  Tm=num(i.mediumTempC,"mediumTempC"),D=pos(i.characteristicDimensionM,"characteristicDimensionM"),
  h=pos(i.hWm2K,"hWm2K"),ks=pos(i.frozenThermalConductivityWmK,"frozenThermalConductivityWmK"),
  P=pos(i.P,"P"),R=pos(i.R,"R"),Ste=pos(i.Ste,"Ste");
 if(Tf<=Tm)throw new Error("initial_freezing_temp_must_exceed_medium_temp");
 const baseSeconds=dH10/(Tf-Tm)*(P*D/h+R*D*D/ks);
 const Tc=i.finalCenterTempC==null?-10:num(i.finalCenterTempC,"finalCenterTempC");
 const Tref=-10;
 if(Tc<=Tm)throw new Error("final_center_temp_must_exceed_medium_temp");
 let correctionFactor=1;
 if(Math.abs(Tc-Tref)>1e-12){
  correctionFactor=1-(1.65*Ste/ks)*Math.log((Tc-Tm)/(Tref-Tm));
  if(!Number.isFinite(correctionFactor)||correctionFactor<=0)throw new Error("invalid_final_temperature_correction");
 }
 const slabSeconds=baseSeconds*correctionFactor;
 const E=i.equivalentHeatTransferDimensionality==null?1:pos(i.equivalentHeatTransferDimensionality,"equivalentHeatTransferDimensionality");
 if(E<1)throw new Error("EHTD_must_be_at_least_1");
 const seconds=slabSeconds/E;
 return {ok:true,status:"reviewed_modified_plank_time",seconds,hours:seconds/3600,
  referenceCenterTempC:Tref,baseReferenceHours:baseSeconds/3600,correctionFactor,E,
  note:"deltaH10 must be the volumetric enthalpy change from initial freezing temperature to -10 C; E=1 for an infinite slab."};
}
