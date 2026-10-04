using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class DesktopDbBootstrapProbe
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
            var platform = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "BitzerPlatform.dll"));
            var factoryType = platform.GetType("api.DbConnectionFactory", true)!;
            var setup = factoryType.GetMethod("SetupSqliteDesktop", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static);
            if (setup is null)
            {
                Console.Error.WriteLine("Desktop DB bootstrap probe: SetupSqliteDesktop_missing");
                return 21;
            }

            Console.WriteLine("SetupSqliteDesktop = present");
            Console.WriteLine("Parameter count = " + setup.GetParameters().Length);
            Console.WriteLine("Return type = " + setup.ReturnType.FullName);
            Console.WriteLine("Desktop DB bootstrap probe: invocation_shape_ready");
            Console.WriteLine("Safety: vendor method identified but not invoked; database remains unopened.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Desktop DB bootstrap probe failed: " + ex.GetType().Name + ": " + ex.Message);
            return 22;
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= Resolver;
        }
    }
}
