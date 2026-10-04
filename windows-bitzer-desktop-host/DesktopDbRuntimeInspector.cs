using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class DesktopDbRuntimeInspector
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
            var platformPath = Path.Combine(root, "BitzerPlatform.dll");
            var dataPath = Path.Combine(root, "Bitzer.Selection.Platform.Data.dll");
            if (!File.Exists(platformPath) || !File.Exists(dataPath))
            {
                Console.Error.WriteLine("Desktop DB inspection: required_assembly_not_found");
                return 10;
            }

            var platform = AssemblyLoadContext.Default.LoadFromAssemblyPath(platformPath);
            var data = AssemblyLoadContext.Default.LoadFromAssemblyPath(dataPath);

            Console.WriteLine("BITZER desktop DB runtime inspection:");
            DumpType(platform, "api.DbConnectionFactory", new[] { "Create", "SetupDb", "SetupSqliteDev", "SetupSqliteDesktop", "SetupSqlServer" });
            DumpType(data, "Bitzer.Selection.Platform.Data.DbContexts.DbCtx", new[] { ".ctor", "OnConfiguring", "OnModelCreating" });

            Console.WriteLine("Config files near platform:");
            var roots = new[] { root, Directory.GetParent(root)?.FullName }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase);
            foreach (var dir in roots)
            {
                foreach (var file in Directory.EnumerateFiles(dir!, "appsettings*.json", SearchOption.TopDirectoryOnly))
                    Console.WriteLine("  " + file);
            }

            Console.WriteLine("Desktop config keys (values hidden):");
            foreach (var file in Directory.EnumerateFiles(root, "appsettings*.json", SearchOption.TopDirectoryOnly))
            {
                using var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(file));
                Console.WriteLine("  " + Path.GetFileName(file));
                foreach (var p in doc.RootElement.EnumerateObject())
                {
                    Console.WriteLine("    " + p.Name);
                    if (p.NameEquals("ConnectionStrings") && p.Value.ValueKind == System.Text.Json.JsonValueKind.Object)
                    {
                        foreach (var child in p.Value.EnumerateObject())
                            Console.WriteLine("      " + child.Name + ": <value hidden>");
                    }
                    else if (p.NameEquals("Configuration") && p.Value.ValueKind == System.Text.Json.JsonValueKind.Object)
                    {
                        foreach (var child in p.Value.EnumerateObject())
                            Console.WriteLine("      " + child.Name + ": <" + child.Value.ValueKind + ">");
                    }
                }
            }

            Console.WriteLine("Desktop DB inspection: metadata_ready");
            Console.WriteLine("Safety: no configuration values printed; no database opened; no connection created.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Desktop DB inspection failed: " + ex.GetType().Name + ": " + ex.Message);
            return 11;
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= Resolver;
        }
    }

    private static void DumpType(Assembly assembly, string typeName, string[] methodNames)
    {
        var type = assembly.GetType(typeName, true)!;
        Console.WriteLine("TYPE " + type.FullName);

        foreach (var ctor in type.GetConstructors(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance))
            Console.WriteLine("  CTOR " + Signature(ctor));

        foreach (var name in methodNames.Where(x => x != ".ctor"))
        {
            foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance)
                         .Where(m => m.Name == name))
                Console.WriteLine("  METHOD " + Signature(method));
        }
    }

    private static string Signature(MethodBase method)
    {
        var parameters = string.Join(", ", method.GetParameters().Select(p => TypeName(p.ParameterType) + " " + p.Name));
        var result = method is MethodInfo mi ? " -> " + TypeName(mi.ReturnType) : "";
        return method.Name + "(" + parameters + ")" + result;
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
