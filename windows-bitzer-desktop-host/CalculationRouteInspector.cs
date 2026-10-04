using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class CalculationRouteInspector
{
    public static int Run(string root)
    {
        var apiPath = Path.Combine(root, "..", "selection", "BITZER_API.exe");
        apiPath = Path.GetFullPath(apiPath);
        if (!File.Exists(apiPath))
        {
            Console.Error.WriteLine("Calculation route inspection: BITZER_API.exe not found.");
            return 20;
        }

        Assembly? Resolver(AssemblyLoadContext context, AssemblyName name)
        {
            var candidates = new[]
            {
                Path.Combine(Path.GetDirectoryName(apiPath)!, $"{name.Name}.dll"),
                Path.Combine(root, $"{name.Name}.dll")
            };
            var candidate = candidates.FirstOrDefault(File.Exists);
            return candidate is null ? null : context.LoadFromAssemblyPath(candidate);
        }

        AssemblyLoadContext.Default.Resolving += Resolver;
        try
        {
            var asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(apiPath);
            var controller = asm.GetTypes().FirstOrDefault(t =>
                string.Equals(t.Name, "CalculationController", StringComparison.Ordinal));

            if (controller is null)
            {
                Console.Error.WriteLine("Calculation route inspection: CalculationController not found.");
                return 21;
            }

            Console.WriteLine($"Controller: {controller.FullName}");
            PrintRouteAttributes("Controller route", controller.GetCustomAttributesData());

            var methods = controller.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
                .Where(m => m.Name.Contains("Result", StringComparison.OrdinalIgnoreCase)
                         || m.Name.Contains("Calcul", StringComparison.OrdinalIgnoreCase))
                .OrderBy(m => m.Name)
                .ToArray();

            foreach (var method in methods)
            {
                Console.WriteLine($"Method: {method.Name}");
                PrintRouteAttributes("  Attribute", method.GetCustomAttributesData());
                foreach (var p in method.GetParameters())
                    Console.WriteLine($"  Parameter: {p.Name} : {p.ParameterType.FullName}");
                Console.WriteLine($"  Returns: {method.ReturnType.FullName}");
            }

            Console.WriteLine("Calculation route inspection: complete");
            Console.WriteLine("Safety: metadata only; no HTTP request; no database opened; no calculation invoked.");
            return 0;
        }
        catch (ReflectionTypeLoadException ex)
        {
            Console.Error.WriteLine("Calculation route inspection: dependency load failure.");
            foreach (var e in ex.LoaderExceptions.Where(e => e is not null).Take(5))
                Console.Error.WriteLine($"  {e!.GetType().Name}: {e.Message}");
            return 22;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Calculation route inspection failed: {ex.GetType().Name}: {ex.Message}");
            return 23;
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= Resolver;
        }
    }

    private static void PrintRouteAttributes(string label, IEnumerable<CustomAttributeData> attrs)
    {
        foreach (var a in attrs)
        {
            var name = a.AttributeType.Name;
            if (!name.Contains("Route", StringComparison.OrdinalIgnoreCase)
                && !name.StartsWith("Http", StringComparison.OrdinalIgnoreCase))
                continue;

            var args = string.Join(", ", a.ConstructorArguments.Select(x => x.Value?.ToString() ?? "null"));
            Console.WriteLine($"{label}: {name}({args})");
        }
    }
}
