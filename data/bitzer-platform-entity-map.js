// Exact entity map recovered from BITZER Selection Platform.Data metadata.
// This is the join plan for the offline exporter; names mirror BITZER's EF schema.
export const BITZER_PLATFORM_ENTITY_MAP={
 Products:{key:"Id",fields:["Id","ProductName","CapacityRegulationId","Series","IsDeleted","MotorVersion","NominalRPM","MinFrequency","MaxFrequency","SeriesCode","NumberOfCylinders","SupportCapacityCalc","NominalDisplacement","Module","MaxPowerConsumptionAt50Hz","FIType"]},
 ProductRefrigerants:{key:["ProductId","RefrigerantCode","OperatingMode"],fields:["ProductId","RefrigerantCode","OperatingMode","CoefficientsId","IsVisible"]},
 Coefficients:{key:"Id",fields:["Id","LambdaCoefficientId","CurrentCoefficientId","PowerFICoefficientId","LambdaFICoefficientId","CSLambdaFICoefficientId","CSPowerFICoefficientId","SuperheatCoefficientId","PowerOilPumpCoefficientId","SpecificPowerCoefficientId","AsyncMotorWithInverterId","OilCoolerCoefficientId","LambdaCRFactorCoefficientId","PowerCRFactorCoefficientId","MechanicalCRCoefficientId","PowerCRCoefficientId","OilVolumeFlowCoefficientId","LiEcoCoefficientId","TranscriticalPowerCoefficientId","TranscriticalMassFlowCoefficientId","IsDeleted"]},
 LimitsData:{fields:["Id","ProductId","RefrigerantCode","OperatingMode","CrStep","UserMode","LimitsFilenameId"]},
 joins:[
  ["Products.Id","ProductRefrigerants.ProductId"],
  ["ProductRefrigerants.CoefficientsId","Coefficients.Id"],
  ["Products.Id","LimitsData.ProductId"],
  ["ProductRefrigerants.RefrigerantCode","LimitsData.RefrigerantCode"],
  ["ProductRefrigerants.OperatingMode","LimitsData.OperatingMode"]
 ],
 coefficientFamilies:["LambdaCoefficients","CurrentCoefficients","PowerFICoefficients","LambdaFICoefficients","CSLambdaFICoefficients","CSPowerFICoefficients","SuperheatCoefficients","PowerOilPumpCoefficients","SpecificPowerCoefficients","OilCoolerCoefficients","TranscriticalPowerCoefficients","TranscriticalMassFlowCoefficients","PowerCRCoefficients","MechanicalCRCoefficients","OilVolumeFlowCoefficients","LambdaCRFactorCoefficients","PowerCRFactorCoefficients"],
 rule:"Export raw vendor rows with coefficient-family identity intact; do not flatten all families into one assumed polynomial formula."
};
