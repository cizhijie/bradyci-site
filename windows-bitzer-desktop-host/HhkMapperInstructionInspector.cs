using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkMapperInstructionInspector
{
    private static readonly string[] Targets = { "get_i_CC", "get_i_Method", "get_i_OP", "get_i_FCMV" };

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
            foreach (var dll in new[] { "Bitzer.Selection.Platform.Abstractions.dll", "Bitzer.Selection.Platform.HHK.dll" })
            {
                var path = Path.Combine(root, dll);
                if (!File.Exists(path)) continue;
                var asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(path);
                foreach (var t in SafeTypes(asm).Where(x => x.Name.Contains("Mapper", StringComparison.OrdinalIgnoreCase)))
                foreach (var m in t.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly).Where(x => x.Name.Contains("MapToAPIinput", StringComparison.OrdinalIgnoreCase)))
                {
                    var il = m.GetMethodBody()?.GetILAsByteArray();
                    if (il is null) continue;
                    var refs = new List<string>();
                    for (int i = 0; i <= il.Length - 4; i++)
                    {
                        MemberInfo? mi = null;
                        try { mi = m.Module.ResolveMember(BitConverter.ToInt32(il, i), m.DeclaringType?.GetGenericArguments(), m.IsGenericMethod ? m.GetGenericArguments() : null); } catch { }
                        if (mi is null) continue;
                        var s = (mi.DeclaringType?.FullName ?? "") + "." + mi.Name;
                        if (!refs.Contains(s)) refs.Add(s);
                    }
                    var hits = refs.Where(r => Targets.Any(x => r.EndsWith("." + x, StringComparison.Ordinal))).ToArray();
                    if (hits.Length == 0) continue;
                    Console.WriteLine($"METHOD {t.FullName}.{m.Name}");
                    foreach (var h in hits) Console.WriteLine("  TARGET " + h);
                    foreach (var r in refs) Console.WriteLine("  REF " + r);
                }
            }
            Console.WriteLine("HHK mapper instruction inspection: complete");
            Console.WriteLine("Safety: mapper IL/member metadata only; no database, services, DTO values, or calculation.");
            return 0;
        }
        catch (Exception ex) { Console.Error.WriteLine($"HHK mapper instruction inspection failed: {ex.GetType().Name}: {ex.Message}"); return 39; }
        finally { AssemblyLoadContext.Default.Resolving -= Resolve; }
    }

    private static IEnumerable<Type> SafeTypes(Assembly a)
    {
        try { return a.GetTypes(); }
        catch (ReflectionTypeLoadException e) { return e.Types.OfType<Type>(); }
        catch { return Array.Empty<Type>(); }
    }
}
