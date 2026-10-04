using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkEntryPointInspector
{
    public static int Run(string root)
    {
        Assembly? Resolve(AssemblyLoadContext c, AssemblyName n) { var p=Path.Combine(root,n.Name+".dll"); return File.Exists(p)?c.LoadFromAssemblyPath(p):null; }
        AssemblyLoadContext.Default.Resolving += Resolve;
        try
        {
            var asm=AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root,"Bitzer.Selection.Platform.HHK.dll"));
            foreach(var t in SafeTypes(asm).Where(t => (t.FullName??"").Contains("HHKModuleConfig") || (t.FullName??"").Contains("HHKInputsDto") || (t.FullName??"").Contains("HHKInputsMapper")))
            {
                Console.WriteLine("TYPE "+t.FullName);
                foreach(var p in t.GetProperties(BindingFlags.Public|BindingFlags.Instance|BindingFlags.DeclaredOnly).OrderBy(x=>x.Name)) Console.WriteLine("  PROP "+p.PropertyType.FullName+" "+p.Name+" writable="+p.CanWrite);
                foreach(var f in t.GetFields(BindingFlags.Public|BindingFlags.Instance|BindingFlags.DeclaredOnly).OrderBy(x=>x.Name)) Console.WriteLine("  FIELD "+f.FieldType.FullName+" "+f.Name);
                foreach(var m in t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Static|BindingFlags.Instance|BindingFlags.DeclaredOnly).Where(m=>m.Name=="Calculation" || m.Name=="RegisterServices" || m.Name=="MapToAPIinput" || m.Name=="GetSeries"))
                    Console.WriteLine("  METHOD "+m.Name+" static="+m.IsStatic+" -> "+m.ReturnType.FullName+" | "+string.Join("; ",m.GetParameters().Select(p=>(p.ParameterType.FullName??p.ParameterType.Name)+" "+p.Name)));
            }
            Console.WriteLine("HHK entry point inspection: complete");
            Console.WriteLine("Safety: metadata only; no services registered, database opened, or calculation invoked.");
            return 0;
        } catch(Exception ex) { Console.Error.WriteLine("HHK entry point inspection failed: "+ex.GetType().Name+": "+ex.Message); return 33; }
        finally { AssemblyLoadContext.Default.Resolving -= Resolve; }
    }
    private static IEnumerable<Type> SafeTypes(Assembly a) { try { return a.GetTypes(); } catch(ReflectionTypeLoadException e) { return e.Types.OfType<Type>(); } }
}