using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkInputSemanticsInspector
{
    private static readonly string[] Needles =
    {
        "i_CC","i_Method","i_OP","i_FCMV","i_FCF","i_FI","i_DS","i_CR","i_OV","i_FCV",
        "Capacity","Method","Operating","Mode","Motor","Winding","Frequency","Voltage","Flags","Convert"
    };

    public static int Run(string root)
    {
        Assembly? Resolve(AssemblyLoadContext c, AssemblyName n)
        {
            var p = Path.Combine(root, n.Name + ".dll");
            return File.Exists(p) ? c.LoadFromAssemblyPath(p) : null;
        }
        AssemblyLoadContext.Default.Resolving += Resolve;
        try
        {
            foreach (var file in Directory.EnumerateFiles(root, "*.dll"))
            {
                Assembly asm;
                try { asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(file); } catch { continue; }
                foreach (var t in SafeTypes(asm))
                foreach (var m in t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Static|BindingFlags.Instance|BindingFlags.DeclaredOnly))
                {
                    MethodBody? body; try { body=m.GetMethodBody(); } catch { continue; }
                    var il=body?.GetILAsByteArray(); if (il is null) continue;
                    var refs=new List<string>();
                    for(int i=0;i<=il.Length-4;i++)
                    {
                        int token=BitConverter.ToInt32(il,i);
                        MemberInfo? mi=null;
                        try { mi=m.Module.ResolveMember(token,m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null); } catch {}
                        if(mi is null) continue;
                        var s=(mi.DeclaringType?.FullName??"")+"."+mi.Name;
                        if(Needles.Any(n=>s.Contains(n,StringComparison.OrdinalIgnoreCase)) && !refs.Contains(s)) refs.Add(s);
                    }
                    if(refs.Any(r=>Needles.Take(10).Any(n=>r.Contains(n,StringComparison.OrdinalIgnoreCase))))
                    {
                        Console.WriteLine($"METHOD {t.FullName}.{m.Name}");
                        foreach(var r in refs) Console.WriteLine("  REF "+r);
                    }
                }
            }
            Console.WriteLine("HHK input semantics inspection: complete");
            Console.WriteLine("Safety: IL/member metadata only; no database, services, DTO values, or calculation.");
            return 0;
        }
        catch(Exception ex){ Console.Error.WriteLine($"HHK input semantics inspection failed: {ex.GetType().Name}: {ex.Message}"); return 37; }
        finally { AssemblyLoadContext.Default.Resolving -= Resolve; }
    }

    private static IEnumerable<Type> SafeTypes(Assembly a)
    {
        try { return a.GetTypes(); }
        catch(ReflectionTypeLoadException e){ return e.Types.OfType<Type>(); }
        catch { return Array.Empty<Type>(); }
    }
}
