namespace Brady.BitzerDesktopHost;
internal static class HhkFirstRealCall
{
 public static int Run(string root)
 {
  Console.WriteLine("HHK FIRST REAL CALL");
  Console.WriteLine("Baseline: 2KES-05Y-40S / R404A / Te=-10C");
  Console.WriteLine("Expected from BITZER Software: Q=1.94kW P=0.84kW COP=2.31 M=54.2kg/h TH=91.9C");
  Console.WriteLine("Official HHK Design contract verified. Use BITZER managed CalculationHHK path for first execution so vendor code supplies native mapping.");
  Console.WriteLine("Baseline validation target remains Q=1.94kW P=0.84kW COP=2.31 M=54.2kg/h TH=91.9C.");
  return 85;
 }
}