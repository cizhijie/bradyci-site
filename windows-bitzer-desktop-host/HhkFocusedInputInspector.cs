using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkFocusedInputInspector
{
    private static readonly string[] Targets = { "i_CC", "i_Method", "i_OP", "i_FCMV" };

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
                Assembly asm; try { asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(file); } catch { continue; }
                foreach (var t in SafeTypes(asm))
                foreach (var m in t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly))
                {
                    byte[]? il; try { il = m.GetMethodBody()?.GetILAsByteArray(); } catch { continue; }
                    if (il is null) continue;
                    var refs = new List<string>();
                    for (int i=0;i<=il.Length-4;i++)
                    {
                        var token=BitConverter.ToInt32(il,i);
                        MemberInfo? mi=null;
                        try { mi=m.Module.ResolveMember(token,m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null); } catch {}
                        if(mi is null) continue;
                        var s=(mi.DeclaringType?.FullName??"")+"."+mi.Name;
                        if(!refs.Contains(s)) refs.Add(s);
                    }
                    var hits=refs.Where(r=>Targets.Any(x=>r.EndsWith(".get_"+x,StringComparison.Ordinal))).ToArray();
                    if(hits.Length==0) continue;
                    Console.WriteLine($"METHOD {t.FullName}.{m.Name}");
                    foreach(var hit in hits) Console.WriteLine("  TARGET "+hit);
                    foreach(var r in refs.Where(r=>r.Contains("Calculation",StringComparison.OrdinalIgnoreCase)||r.Contains("Operating",StringComparison.OrdinalIgnoreCase)||r.Contains("Mode",StringComparison.OrdinalIgnoreCase)||r.Contains("Capacity",StringComparison.OrdinalIgnoreCase)||r.Contains("FCMV",StringComparison.OrdinalIgnoreCase)||r.Contains("Method",StringComparison.OrdinalIgnoreCase)))
                        Console.WriteLine("  RELATED "+r);
                }
            }
            Console.WriteLine("HHK focused input inspection: complete");
            Console.WriteLine("Safety: IL/member metadata only; no database, services, DTO values, or calculation.");
            return 0;
        }
        catch(Exception ex){Console.Error.WriteLine($"HHK focused input inspection failed: {ex.GetType().Name}: {ex.Message}");return 38;}
        finally { AssemblyLoadContext.Default.Resolving -= Resolve; }
    }

    private static IEnumerable<Type> SafeTypes(Assembly a)
    {
        try{return a.GetTypes();}
        catch(ReflectionTypeLoadException e){return e.Types.OfType<Type>();}
        catch{return Array.Empty<Type>();}
    }
}
