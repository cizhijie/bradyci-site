const pos=(v,n)=>{const x=Number(v);if(!Number.isFinite(x)||x<=0)throw new Error(n+"_must_be_positive");return x};
export function forcedAirHFromNuCorrelation(i={}){
 const velocity=pos(i.airVelocityMs,"airVelocityMs"),L=pos(i.characteristicLengthM,"characteristicLengthM");
 const rho=pos(i.airDensityKgM3,"airDensityKgM3"),mu=pos(i.airDynamicViscosityPaS,"airDynamicViscosityPaS");
 const k=pos(i.airThermalConductivityWmK,"airThermalConductivityWmK"),Pr=pos(i.airPrandtl,"airPrandtl");
 const C=pos(i.C,"C"),m=pos(i.m,"m"),n=pos(i.n,"n");
 const Re=rho*velocity*L/mu;
 if(Array.isArray(i.reynoldsRange)&&(Re<i.reynoldsRange[0]||Re>i.reynoldsRange[1])) return {ok:false,status:"reynolds_outside_reviewed_range",Re};
 const Nu=C*Math.pow(Re,m)*Math.pow(Pr,n),h=Nu*k/L;
 return {ok:true,status:"reviewed_correlation_calculated",Re,Pr,Nu,hWm2K:h,characteristicLengthM:L,
  note:"Air properties must be supplied from a reviewed source at the declared evaluation temperature; velocity alone is insufficient."};
}
