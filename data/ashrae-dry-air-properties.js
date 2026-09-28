// ASHRAE Fundamentals 2025, Ch.1, Table 5: dry-air transport properties at 101.325 kPa.
// Keep tabulated source values; linear interpolation only within the stored interval.
export const ASHRAE_DRY_AIR_101325KPA=[
 {tC:-32,rho:1.472,mu_uPaS:15.68,k:0.02187,Pr:0.7160},
 {tC:-31,rho:1.466,mu_uPaS:15.73,k:0.02195,Pr:0.7158},
 {tC:-30,rho:1.460,mu_uPaS:15.78,k:0.02203,Pr:0.7156},
 {tC:-29,rho:1.454,mu_uPaS:15.83,k:0.02211,Pr:0.7154},
 {tC:-28,rho:1.448,mu_uPaS:15.88,k:0.02219,Pr:0.7152}
];
const keys=["rho","mu_uPaS","k","Pr"];
export function ashraeDryAirProperties(tC){
 const t=Number(tC);if(!Number.isFinite(t)||t<-32||t>-28)return {ok:false,status:"outside_tabulated_temperature_range"};
 const exact=ASHRAE_DRY_AIR_101325KPA.find(x=>x.tC===t);if(exact)return {ok:true,status:"tabulated",temperatureC:t,pressureKPa:101.325,rhoKgM3:exact.rho,muPaS:exact.mu_uPaS*1e-6,kWmK:exact.k,Pr:exact.Pr,source:"ASHRAE Fundamentals 2025 Ch.1 Table 5"};
 const lo=ASHRAE_DRY_AIR_101325KPA.filter(x=>x.tC<t).at(-1),hi=ASHRAE_DRY_AIR_101325KPA.find(x=>x.tC>t),q=(t-lo.tC)/(hi.tC-lo.tC),o={};
 for(const k of keys)o[k]=lo[k]+q*(hi[k]-lo[k]);
 return {ok:true,status:"linearly_interpolated",temperatureC:t,pressureKPa:101.325,rhoKgM3:o.rho,muPaS:o.mu_uPaS*1e-6,kWmK:o.k,Pr:o.Pr,source:"ASHRAE Fundamentals 2025 Ch.1 Table 5"};
}
