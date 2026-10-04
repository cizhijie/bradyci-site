using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkEnumContractInspector
{
    private static readonly string[] Terms =
    {
        "Flags", "OperatingMode", "FrequencyInverterType", "GridFrequency",
        "ReferenceTemperature", "Series", "Method", "Capacity", "Product"
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
            foreach (var file in new[]
            {
                "Domain.dll",
                "Bitzer.Selection.Platform.Abstractions.dll",
                "Bitzer.Selection.Platform.HHK.dll"
            })
            {
                var path = Path.Combine(root, file);
                if (!File.Exists(path)) continue;
                var asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(path);
                foreach (var t in SafeTypes(asm)
                    .Where(t => t.IsEnum && Terms.Any(k => (t.FullName ?? t.Name).Contains(k, StringComparison.OrdinalIgnoreCase)))
                    .OrderBy(t => t.FullName))
                {
                    Console.WriteLine("ENUM " + t.FullName + " : " + Enum.GetUnderlyingType(t).Name);
                    foreach (var name in Enum.GetNames(t))
                    {
                        var value = Convert.ToInt64(Enum.Parse(t, name));
                        Console.WriteLine($"  {name} = {value}");
                    }
                }
            }

            Console.WriteLine("HHK enum contract inspection: complete");
            Console.WriteLine("Safety: enum metadata only; no database, DTO values, services, or calculation.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"HHK enum contract inspection failed: {ex.GetType().Name}: {ex.Message}");
            return 36;
        }
        finally { AssemblyLoadContext.Default.Resolving -= Resolve; }
    }

    private static IEnumerable<Type> SafeTypes(Assembly a)
    {
        try { return a.GetTypes(); }
        catch (ReflectionTypeLoadException e) { return e.Types.OfType<Type>(); }
    }
}
