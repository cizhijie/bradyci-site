using System.Reflection;
using System.Runtime.Loader;
namespace Brady.BitzerDesktopHost;
internal static class HhkFirstRealCall
{
 public static int Run(string root)
 {
  Console.WriteLine("HHK FIRST REAL CALL - MANAGED ENTRY PREFLIGHT");
  Console.WriteLine("Baseline: 2KES-05Y-40S / R404A / Te=-10C");
  Console.WriteLine("Expected: Q=1.94kW P=0.84kW COP=2.31 M=54.2kg/h TH=91.9C");
  Assembly? Resolve(AssemblyLoadContext c,AssemblyName n){foreach(var d in new[]{root,Path.Combine(root,"..","selection")}){var p=Path.GetFullPath(Path.Combine(d,n.Name+".dll"));if(File.Exists(p))try{return c.LoadFromAssemblyPath(p);}catch{}}return null;}
  AssemblyLoadContext.Default.Resolving+=Resolve;
  try{
   var dll=Path.Combine(root,"Bitzer.Selection.Platform.HHK.dll");
   if(!File.Exists(dll)){Console.Error.WriteLine("HHK assembly not found.");return 87;}
   var a=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);
   foreach(var t in SafeTypes(a).Where(x=>(x.FullName??"").Contains("HHKModuleConfig")||(x.FullName??"").Contains("HHKInputsDto")||(x.FullName??"").Contains("HHKInputsMapper")) )
   {
    Console.WriteLine("TYPE "+t.FullName);
    foreach(var prop in t.GetProperties(BindingFlags.Public|BindingFlags.Instance).Where(x=>x.CanWrite).OrderBy(x=>x.Name)) Console.WriteLine(" PROP "+prop.PropertyType.FullName+" "+prop.Name);
    foreach(var m in t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Static|BindingFlags.Instance|BindingFlags.DeclaredOnly).Where(x=>x.Name.Contains("Calculation",StringComparison.OrdinalIgnoreCase)||x.Name.Contains("MapToAPIinput",StringComparison.OrdinalIgnoreCase))) Console.WriteLine(" ENTRY "+m+" static="+m.IsStatic);
   }
   Console.WriteLine("Preflight complete; no calculation invoked in this pass.");
   return 0;
  }catch(Exception e){Console.Error.WriteLine(e.GetType().Name+": "+e.Message);return 88;}
  finally{AssemblyLoadContext.Default.Resolving-=Resolve;}
 }
 static IEnumerable<Type> SafeTypes(Assembly a){try{return a.GetTypes();}catch(ReflectionTypeLoadException e){return e.Types.OfType<Type>();}}
}