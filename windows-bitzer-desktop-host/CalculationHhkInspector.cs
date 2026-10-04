using System.Reflection;
using System.Runtime.Loader;
namespace Brady.BitzerDesktopHost;
internal static class CalculationHhkInspector
{
 public static int Run(string root)
 {
  var dll=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","hhk-candidates","Calculation.dll");
  if(!File.Exists(dll)){Console.Error.WriteLine("Calculation.dll not found; run --locate-bitzer-bundle-hhk first.");return 56;}
  AssemblyLoadContext.Default.Resolving+=(c,n)=>{foreach(var d in new[]{Path.GetDirectoryName(dll)!,Path.GetFullPath(Path.Combine(root,"..","selection")),root}){var p=Path.Combine(d,n.Name+".dll");if(File.Exists(p))try{return c.LoadFromAssemblyPath(p);}catch{}}return null;};
  try{
   var a=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);
   var ts=Safe(a).Where(t=>t.FullName?.Contains("CalculationHHK",StringComparison.OrdinalIgnoreCase)==true).ToArray();
   Console.WriteLine($"Calculation.dll CalculationHHK types={ts.Length}");
   foreach(var t in ts){Console.WriteLine("TYPE "+t.FullName);foreach(var m in t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly)){if(m.Name.Contains("CalculateSingle",StringComparison.OrdinalIgnoreCase))Dump(m);}}
   Console.WriteLine("Calculation.dll HHK inspection: complete");Console.WriteLine("Safety: metadata/IL token scan only; no method invoked, database, HTTP, config values, services, or calculation.");return 0;
  }catch(Exception e){Console.Error.WriteLine($"{e.GetType().Name}: {e.Message}");return 57;}
 }
 static void Dump(MethodInfo m)
 {
  Console.WriteLine("METHOD "+m);var il=m.GetMethodBody()?.GetILAsByteArray();if(il==null)return;
  var hits=new SortedSet<string>();for(int i=0;i<=il.Length-4;i++){int tok=BitConverter.ToInt32(il,i);try{var x=m.Module.ResolveMember(tok,m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);var s=(x.DeclaringType?.FullName??"")+"."+x.Name;if(s.Contains("i_CC")||s.Contains("i_Method")||s.Contains("i_OP")||s.Contains("i_FCMV")||s.Contains("hhkDesign",StringComparison.OrdinalIgnoreCase)||s.Contains("HHK",StringComparison.OrdinalIgnoreCase))hits.Add($"IL~0x{i:X4} {s}");}catch{}}
  foreach(var h in hits)Console.WriteLine("  "+h);
 }
 static IEnumerable<Type> Safe(Assembly a){try{return a.GetTypes();}catch(ReflectionTypeLoadException e){return e.Types.OfType<Type>();}}
}