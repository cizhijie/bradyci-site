using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkRuntimeInspector
{
    public static int Run(string root)
    {
        Assembly? Resolver(AssemblyLoadContext context, AssemblyName name)
        {
            var candidate = Path.Combine(root, name.Name + ".dll");
            return File.Exists(candidate) ? context.LoadFromAssemblyPath(candidate) : null;
        }

        AssemblyLoadContext.Default.Resolving += Resolver;
        try
        {
            var path = Path.Combine(root, "Bitzer.Selection.Platform.HHK.dll");
            if (!File.Exists(path))
            {
                Console.Error.WriteLine("HHK runtime inspection: assembly_not_found");
                return 8;
            }

            var hhk = AssemblyLoadContext.Default.LoadFromAssemblyPath(path);
            var module = hhk.GetType("Bitzer.Selection.Platform.HHK.HHKModuleConfig", true)!;
            var mapper = hhk.GetType("Bitzer.Selection.Platform.HHK.Inputs.HHKInputsMapper", true)!;
            var dto = hhk.GetType("Bitzer.Selection.Platform.HHK.Inputs.HHKInputsDto", true)!;

            Console.WriteLine("HHK runtime inspection:");
            DumpMethods(module, "RegisterServices");
            DumpMethods(module, "Calculation");
            DumpMethods(mapper, "MapToAPIinput");
            DumpMethods(mapper, "GetSeries");

            Console.WriteLine("DTO writable properties:");
            foreach (var p in dto.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                         .Where(p => p.CanWrite)
                         .OrderBy(p => p.Name, StringComparer.Ordinal))
            {
                Console.WriteLine("  " + p.Name + ": " + TypeName(p.PropertyType));
            }

            Console.WriteLine("HHK runtime inspection: ready_for_safe_wiring");
            Console.WriteLine("Safety: reflection only; no service provider built; no database opened; no calculation invoked.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("HHK runtime inspection failed: " + ex.GetType().Name + ": " + ex.Message);
            return 9;
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= Resolver;
        }
    }

    private static void DumpMethods(Type type, string name)
    {
        var methods = type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance)
            .Where(m => m.Name == name)
            .ToArray();

        if (methods.Length == 0)
        {
            Console.WriteLine("METHOD " + type.FullName + "." + name + ": missing");
            return;
        }

        foreach (var m in methods)
        {
            var parameters = string.Join(", ", m.GetParameters().Select(p => TypeName(p.ParameterType) + " " + p.Name));
            Console.WriteLine("METHOD " + type.FullName + "." + m.Name + "(" + parameters + ") -> " + TypeName(m.ReturnType));
        }
    }

    private static string TypeName(Type type)
    {
        if (!type.IsGenericType) return type.FullName ?? type.Name;
        var name = type.GetGenericTypeDefinition().FullName ?? type.Name;
        var tick = name.IndexOf('`');
        if (tick >= 0) name = name[..tick];
        return name + "<" + string.Join(", ", type.GetGenericArguments().Select(TypeName)) + ">";
    }
}
