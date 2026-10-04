using System.Text;
namespace Brady.BitzerDesktopHost;
internal static class BitzerApiHhkInputDiscovery
{
 public static int Run(string root)
 {
  var exe=Path.GetFullPath(Path.Combine(root,"..","selection","BITZER_API.exe"));
  if(!File.Exists(exe)){Console.Error.WriteLine("BITZER_API.exe not found.");return 40;}
  var b=File.ReadAllBytes(exe);
  var markers=new[]{"i_CC","i_Method","i_OP","i_FCMV","HHKInputsDto","CalculationHHK","CalculateSingle","hhkDesign_Invoke","CalculationHandler"};
  var hits=Ascii(b).Concat(Utf16(b)).Where(s=>s.Length<=600&&markers.Any(m=>s.Contains(m,StringComparison.OrdinalIgnoreCase))).Select(s=>s.Replace("\r"," ").Replace("\n"," ").Trim()).Distinct().Take(200);
  Console.WriteLine("BITZER API HHK input discovery:");
  foreach(var h in hits) Console.WriteLine("  "+h);
  Console.WriteLine("BITZER API HHK input discovery: complete");
  Console.WriteLine("Safety: read-only binary scan; no HTTP, database, services, config values, or calculation.");
  return 0;
 }
 static IEnumerable<string> Ascii(byte[] d){var s=new StringBuilder();foreach(var x in d){if(x>=32&&x<=126)s.Append((char)x);else{if(s.Length>=3)yield return s.ToString();s.Clear();}}if(s.Length>=3)yield return s.ToString();}
 static IEnumerable<string> Utf16(byte[] d){for(int k=0;k<2;k++){var s=new StringBuilder();for(int i=k;i+1<d.Length;i+=2){var c=(char)(d[i]|d[i+1]<<8);if(c>=32&&c<=126)s.Append(c);else{if(s.Length>=3)yield return s.ToString();s.Clear();}}if(s.Length>=3)yield return s.ToString();}}
}
