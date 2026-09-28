// Unit-safe dimensionless numbers used by reviewed modified-Plank methods.
// SI only: h W/(m²·K), D m, k W/(m·K), volumetric heat capacities/enthalpy J/(m³·K), J/m³.
const pos=(v,n)=>{const x=Number(v);if(!Number.isFinite(x)||x<=0)throw new Error(n+"_must_be_positive");return x};
export function freezingDimensionlessNumbers(i={}){
 const h=pos(i.hWm2K,"hWm2K"),D=pos(i.characteristicDimensionM,"characteristicDimensionM"),
 k=pos(i.frozenThermalConductivityWmK,"frozenThermalConductivityWmK"),
 dH=pos(i.volumetricEnthalpyChangeJm3,"volumetricEnthalpyChangeJm3"),
 cl=pos(i.unfrozenVolumetricHeatCapacityJm3K,"unfrozenVolumetricHeatCapacityJm3K"),
 cs=pos(i.frozenVolumetricHeatCapacityJm3K,"frozenVolumetricHeatCapacityJm3K");
 const Ti=Number(i.initialTempC),Tf=Number(i.initialFreezingTempC),Tm=Number(i.mediumTempC);
 if(![Ti,Tf,Tm].every(Number.isFinite))throw new Error("temperatures_required");
 return {Bi:h*D/k,Pk:cl*(Ti-Tf)/dH,Ste:cs*(Tf-Tm)/dH};
}
