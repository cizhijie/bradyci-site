using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
namespace Brady.BitzerDesktopHost;
internal static class HhkNativeContractInspector{
 public static int Run(string root){
  var dir=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","hhk-candidates");
  var dll=Path.Combine(dir,"BitzerRemote.dll");
  if(!File.Exists(dll)){Console.Error.WriteLine("BitzerRemote.dll not found.");return 83;}
  AssemblyLoadContext.Default.Resolving+=(c,n)=>{foreach(var d in new[]{dir,Path.GetFullPath(Path.Combine(root,"..","selection")),root}){var p=Path.Combine(d,n.Name+".dll");if(File.Exists(p))try{return c.LoadFromAssemblyPath(p);}catch{}}return null;};
  try{
   var a=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);
   Console.WriteLine("HHK NATIVE CONTRACT");
   foreach(var tn in new[]{"BitzerRemote.HHK_Design_Input_Native","BitzerRemote.HHK_Design_Output_Native"}){
    var t=a.GetType(tn,true)!;var sla=t.StructLayoutAttribute;
    Console.WriteLine($"TYPE {t.FullName} | Layout={sla?.Value} Pack={sla?.Pack} Size={sla?.Size} Marshal.SizeOf={Marshal.SizeOf(t)}");
    foreach(var f in t.GetFields(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance).OrderBy(x=>Marshal.OffsetOf(t,x.Name).ToInt64())){
     string ma=string.Join("; ",f.GetCustomAttributesData().Where(x=>x.AttributeType.Namespace=="System.Runtime.InteropServices").Select(x=>x.ToString()));
     Console.WriteLine($" FIELD +{Marshal.OffsetOf(t,f.Name).ToInt64(),4} {f.FieldType.FullName} {f.Name}{(ma.Length>0?" | "+ma:"")}");
    }
   }
   var nt=a.GetType("BitzerNative.BitzerNative",true)!;
   var m=nt.GetMethod("Native_Call_HHK_Design",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Static)!;
   var da=m.GetCustomAttribute<DllImportAttribute>();
   Console.WriteLine($"PINVOKE DLL={da?.Value} EntryPoint={da?.EntryPoint} CallingConvention={da?.CallingConvention} CharSet={da?.CharSet} ExactSpelling={da?.ExactSpelling} SetLastError={da?.SetLastError}");
   Console.WriteLine("HHK DEFAULT CONSTRUCTORS");
   foreach(var tn in new[]{"BitzerRemote.HHK_Design_Input_Native","BitzerRemote.HHK_Design_Output_Native"}){var t=a.GetType(tn,true)!;var o=Activator.CreateInstance(t)!;Console.WriteLine("DEFAULT "+tn);foreach(var fld in t.GetFields(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance))Console.WriteLine($" {fld.Name}={fld.GetValue(o)??"<null>"}");}
   Console.WriteLine($"SIGNATURE {m}");
   Console.WriteLine("Safety: contract metadata only; native function not invoked.");
   return 0;
  }catch(Exception e){Console.Error.WriteLine($"{e.GetType().Name}: {e.Message}");return 84;}
 }
}