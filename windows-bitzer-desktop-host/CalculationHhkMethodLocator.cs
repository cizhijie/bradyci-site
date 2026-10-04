using System.Reflection;
using System.Runtime.Loader;
namespace Brady.BitzerDesktopHost;
internal static class CalculationHhkMethodLocator
{
 static readonly string[] Marks={"CalculationHHK","hhkDesign_Invoke","i_CC","i_Method","i_OP","i_FCMV"};
 public static int Run(string root){
  var dll=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","hhk-candidates","Calculation.dll");if(!File.Exists(dll)){Console.Error.WriteLine("Calculation.dll not found.");return 58;}
  AssemblyLoadContext.Default.Resolving+=(c,n)=>{foreach(var d in new[]{Path.GetDirectoryName(dll)!,Path.GetFullPath(Path.Combine(root,"..","selection")),root}){var p=Path.Combine(d,n.Name+".dll");if(File.Exists(p))try{return c.LoadFromAssemblyPath(p);}catch{}}return null;};
  try{var a=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);int hits=0;foreach(var t in Safe(a))foreach(var m in t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly)){var il=m.GetMethodBody()?.GetILAsByteArray();if(il==null)continue;var found=new SortedSet<string>();for(int i=0;i<=il.Length-4;i++){int tok=BitConverter.ToInt32(il,i);try{var s=m.Module.ResolveString(tok);foreach(var x in Marks)if(s.Contains(x,StringComparison.OrdinalIgnoreCase))found.Add("STRING "+x+"="+s);}catch{}try{var x=m.Module.ResolveMember(tok,m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);var s=(x?.DeclaringType?.FullName??"")+"."+x?.Name;foreach(var q in Marks)if(s.Contains(q,StringComparison.OrdinalIgnoreCase))found.Add("MEMBER "+s);}catch{}}if(found.Count>0){hits++;Console.WriteLine($"METHOD {t.FullName}.{m.Name}");foreach(var x in found)Console.WriteLine("  "+x);}}
   Console.WriteLine($"Calculation.dll HHK method locator: complete; methods={hits}");Console.WriteLine("Safety: metadata/IL token scan only; no method invoked, database, HTTP, config values, services, or calculation.");return 0;
  }catch(Exception e){Console.Error.WriteLine($"{e.GetType().Name}: {e.Message}");return 59;}
 }
 static IEnumerable<Type> Safe(Assembly a){try{return a.GetTypes();}catch(ReflectionTypeLoadException e){return e.Types.OfType<Type>();}}
}