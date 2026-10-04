using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkLegacyAssignmentInspector
{
    private static readonly string[] Targets = { "set_i_OP", "set_i_Method", "set_i_CC", "set_i_FCMV" };

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
            Console.WriteLine("HHK LEGACY ASSIGNMENTS");
            Console.WriteLine("Targets: i_OP / i_Method / i_CC / i_FCMV");
            int hits = 0;

            foreach (var file in Directory.EnumerateFiles(root, "*.dll"))
            {
                Assembly asm;
                try { asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(file); } catch { continue; }

                foreach (var t in SafeTypes(asm))
                foreach (var m in t.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly))
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

                    var setters = refs.Where(r => Targets.Any(x => r.EndsWith("." + x, StringComparison.Ordinal))).ToArray();
                    if (setters.Length == 0) continue;

                    foreach (var setter in setters)
                    {
                        hits++;
                        Console.WriteLine($"ASSIGN {setter[(setter.LastIndexOf(".set_i_", StringComparison.Ordinal) + 7)..]} @ {t.FullName}.{m.Name}");
                    }
                    foreach (var r in refs.Where(IsRelated).Take(12))
                        Console.WriteLine("  SOURCE " + r);
                }
            }

            Console.WriteLine($"HHK legacy assignments: complete; hits={hits}");
            Console.WriteLine("Safety: IL/member metadata only; no DTO instantiated, database, services, config values, HTTP, native call, or calculation.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"HHK legacy assignment scan failed: {ex.GetType().Name}: {ex.Message}");
            return 69;
        }
        finally { AssemblyLoadContext.Default.Resolving -= Resolve; }
    }

    private static bool IsRelated(string s) =>
        s.Contains("get_", StringComparison.Ordinal) &&
        (s.Contains("Mode", StringComparison.OrdinalIgnoreCase) ||
         s.Contains("Method", StringComparison.OrdinalIgnoreCase) ||
         s.Contains("Capacity", StringComparison.OrdinalIgnoreCase) ||
         s.Contains("Frequency", StringComparison.OrdinalIgnoreCase) ||
         s.Contains("Voltage", StringComparison.OrdinalIgnoreCase) ||
         s.Contains("Motor", StringComparison.OrdinalIgnoreCase) ||
         s.Contains("i_", StringComparison.Ordinal));

    private static IEnumerable<Type> SafeTypes(Assembly a)
    {
        try { return a.GetTypes(); }
        catch (ReflectionTypeLoadException e) { return e.Types.OfType<Type>(); }
        catch { return Array.Empty<Type>(); }
    }
}
