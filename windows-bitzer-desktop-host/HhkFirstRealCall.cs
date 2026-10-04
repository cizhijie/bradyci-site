namespace Brady.BitzerDesktopHost;
internal static class HhkFirstRealCall
{
 public static int Run(string root)
 {
  Console.WriteLine("HHK FIRST REAL CALL");
  Console.WriteLine("Baseline: 2KES-05Y-40S / R404A / Te=-10C");
  Console.WriteLine("Expected from BITZER Software: Q=1.94kW P=0.84kW COP=2.31 M=54.2kg/h TH=91.9C");
  Console.WriteLine("Native invocation is intentionally blocked until the exact Tc/TS/TL/TN and motor variant are obtained from the installed BITZER calculation context.");
  Console.WriteLine("Reason: calling HHK_Design with guessed thermodynamic/electrical inputs could return a plausible but wrong official-looking result.");
  return 85;
 }
}