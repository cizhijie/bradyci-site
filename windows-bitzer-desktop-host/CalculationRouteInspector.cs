using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class CalculationRouteInspector
{
    public static int Run(string root)
    {
        var selection = Path.GetFullPath(Path.Combine(root, "..", "selection"));
        if (!Directory.Exists(selection))
        {
            Console.Error.WriteLine("Calculation route inspection: selection directory not found.");
            return 20;
        }

        Assembly? Resolver(AssemblyLoadContext context, AssemblyName name)
        {
            foreach (var dir in new[] { selection, root })
            {
                var p = Path.Combine(dir, $"{name.Name}.dll");
                if (File.Exists(p))
                {
                    try { return context.LoadFromAssemblyPath(p); } catch { }
                }
            }
            return null;
        }

        AssemblyLoadContext.Default.Resolving += Resolver;
        try
        {
            var candidates = Directory.EnumerateFiles(selection, "*.dll", SearchOption.TopDirectoryOnly)
                .Where(IsManaged)
                .ToArray();

            Type? controller = null;
            Assembly? owner = null;
            foreach (var path in candidates)
            {
                try
                {
                    var asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(path);
                    var type = SafeTypes(asm).FirstOrDefault(t =>
                        string.Equals(t.Name, "CalculationController", StringComparison.Ordinal));
                    if (type is not null) { controller = type; owner = asm; break; }
                }
                catch { }
            }

            if (controller is null)
            {
                Console.Error.WriteLine($"Calculation route inspection: CalculationController not found in {candidates.Length} managed DLL(s).");
                Console.Error.WriteLine("Next step: inspect runtime endpoint metadata instead of guessing URL paths.");
                return 21;
            }

            Console.WriteLine($"Assembly: {owner!.GetName().Name}");
            Console.WriteLine($"Controller: {controller.FullName}");
            PrintAttributes("Controller", controller.GetCustomAttributesData());

            foreach (var method in controller.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
                         .OrderBy(m => m.Name))
            {
                Console.WriteLine($"Method: {method.Name}");
                PrintAttributes("  Attribute", method.GetCustomAttributesData());
                foreach (var p in method.GetParameters())
                    Console.WriteLine($"  Parameter: {p.Name} : {p.ParameterType.FullName}");
                Console.WriteLine($"  Returns: {method.ReturnType.FullName}");
            }

            Console.WriteLine("Calculation route inspection: complete");
            Console.WriteLine("Safety: managed metadata only; BITZER_API.exe not loaded; no HTTP request; no calculation invoked.");
            return 0;
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= Resolver;
        }
    }

    private static bool IsManaged(string path)
    {
        try { _ = AssemblyName.GetAssemblyName(path); return true; }
        catch { return false; }
    }

    private static IEnumerable<Type> SafeTypes(Assembly asm)
    {
        try { return asm.GetTypes(); }
        catch (ReflectionTypeLoadException ex) { return ex.Types.Where(t => t is not null)!; }
        catch { return Array.Empty<Type>(); }
    }

    private static void PrintAttributes(string label, IEnumerable<CustomAttributeData> attrs)
    {
        foreach (var a in attrs)
        {
            var n = a.AttributeType.Name;
            if (!n.Contains("Route", StringComparison.OrdinalIgnoreCase) &&
                !n.StartsWith("Http", StringComparison.OrdinalIgnoreCase))
                continue;
            var args = string.Join(", ", a.ConstructorArguments.Select(x => x.Value?.ToString() ?? "null"));
            Console.WriteLine($"{label}: {n}({args})");
        }
    }
}
