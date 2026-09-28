// ASHRAE Fundamentals 2025, Ch.1, Table 5: dry-air transport properties at 101.325 kPa.
// Keep tabulated source values; linear interpolation only within the stored interval.
export const ASHRAE_DRY_AIR_101325KPA=[
 {tC:-32,rho:1.465,mu_uPaS:15.58,k:0.02186,Pr:0.7163},
 {tC:-31,rho:1.459,mu_uPaS:15.63,k:0.02194,Pr:0.7162},
 {tC:-30,rho:1.453,mu_uPaS:15.68,k:0.02202,Pr:0.7160},
 {tC:-29,rho:1.447,mu_uPaS:15.73,k:0.02210,Pr:0.7158},
 {tC:-28,rho:1.441,mu_uPaS:15.79,k:0.02218,Pr:0.7156}
];
const keys=["rho","mu_uPaS","k","Pr"];
export function ashraeDryAirProperties(tC){
 const t=Number(tC);if(!Number.isFinite(t)||t<-32||t>-28)return {ok:false,status:"outside_tabulated_temperature_range"};
 const exact=ASHRAE_DRY_AIR_101325KPA.find(x=>x.tC===t);if(exact)return {ok:true,status:"tabulated",temperatureC:t,pressureKPa:101.325,rhoKgM3:exact.rho,muPaS:exact.mu_uPaS*1e-6,kWmK:exact.k,Pr:exact.Pr,source:"ASHRAE Handbook—Fundamentals 2025, Ch.1, Table 5, dry air at 101.325 kPa"};
 const lo=ASHRAE_DRY_AIR_101325KPA.filter(x=>x.tC<t).at(-1),hi=ASHRAE_DRY_AIR_101325KPA.find(x=>x.tC>t),q=(t-lo.tC)/(hi.tC-lo.tC),o={};
 for(const k of keys)o[k]=lo[k]+q*(hi[k]-lo[k]);
 return {ok:true,status:"linearly_interpolated",temperatureC:t,pressureKPa:101.325,rhoKgM3:o.rho,muPaS:o.mu_uPaS*1e-6,kWmK:o.k,Pr:o.Pr,source:"ASHRAE Fundamentals 2025 Ch.1 Table 5"};
}
