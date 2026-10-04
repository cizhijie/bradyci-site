using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class ExtractedHhkBridgeInspector
{
    private static readonly string[] Legacy = { "i_OP", "i_Method", "i_CC", "i_FCMV" };
    private static readonly string[] Modern =
    {
        "OpMode","CalcMethod","ComprType","CapacityReg","PowerCtrlType",
        "FCType","FCMotor","FCPower","FCVoltage","FCMaxVoltage"
    };

    public static int Run(string root)
    {
        var dir=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","hhk-candidates");
        if(!Directory.Exists(dir)){Console.Error.WriteLine("Extracted bundle directory not found; run --extract-bitzer-bundle-dependencies first.");return 70;}

        Assembly? Resolve(AssemblyLoadContext c,AssemblyName n)
        {
            foreach(var d in new[]{dir,Path.GetFullPath(Path.Combine(root,"..","selection")),root})
            {
                var p=Path.Combine(d,n.Name+".dll");
                if(File.Exists(p)) try{return c.LoadFromAssemblyPath(p);}catch{}
            }
            return null;
        }

        AssemblyLoadContext.Default.Resolving+=Resolve;
        try
        {
            Console.WriteLine("EXTRACTED HHK BRIDGE");
            Console.WriteLine("Legacy: i_OP / i_Method / i_CC / i_FCMV");
            int legacyHits=0, bridgeHits=0;

            foreach(var file in Directory.EnumerateFiles(dir,"*.dll"))
            {
                Assembly asm; try{asm=AssemblyLoadContext.Default.LoadFromAssemblyPath(file);}catch{continue;}
                foreach(var t in SafeTypes(asm))
                {
                    MethodInfo[] methods;
                    try{methods=t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly);}catch{continue;}
                    foreach(var m in methods)
                    {
                        byte[]? il; try{il=m.GetMethodBody()?.GetILAsByteArray();}catch{continue;} if(il is null) continue;
                    var refs=Refs(m,il);
                    var old=refs.Where(r=>Legacy.Any(x=>r.Contains("."+x,StringComparison.Ordinal))).Distinct().ToArray();
                    var modern=refs.Where(r=>Modern.Any(x=>r.Contains(x,StringComparison.OrdinalIgnoreCase))).Distinct().ToArray();
                    if(old.Length==0) continue;
                    legacyHits+=old.Length;
                    Console.WriteLine($"METHOD {t.FullName}.{m.Name}");
                    foreach(var x in old) Console.WriteLine("  LEGACY "+x);
                    foreach(var x in modern.Take(12)){Console.WriteLine("  BRIDGE "+x);bridgeHits++;}
                    }
                }
            }

            Console.WriteLine($"Extracted HHK bridge: complete; legacy_hits={legacyHits}; bridge_refs={bridgeHits}");
            Console.WriteLine("Safety: extracted managed IL/member metadata only; no payload method invoked, database, HTTP, config values, services, native call, or calculation.");
            return 0;
        }
        catch(Exception e){Console.Error.WriteLine($"Extracted HHK bridge scan failed: {e.GetType().Name}: {e.Message}");return 71;}
        finally{AssemblyLoadContext.Default.Resolving-=Resolve;}
    }

    private static List<string> Refs(MethodInfo m,byte[] il)
    {
        var r=new List<string>();
        for(int i=0;i<=il.Length-4;i++)
        {
            try
            {
                var x=m.Module.ResolveMember(BitConverter.ToInt32(il,i),m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);
                var s=(x?.DeclaringType?.FullName??"")+"."+x?.Name;
                if(!r.Contains(s))r.Add(s);
            }catch{}
        }
        return r;
    }

    private static IEnumerable<Type> SafeTypes(Assembly a)
    {
        try{return a.GetTypes();}catch(ReflectionTypeLoadException e){return e.Types.OfType<Type>();}catch{return Array.Empty<Type>();}
    }
}
