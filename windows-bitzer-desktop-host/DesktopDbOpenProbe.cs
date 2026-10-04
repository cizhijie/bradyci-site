using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Logging.Abstractions;
using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class DesktopDbOpenProbe
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
            var options = new WebApplicationOptions
            {
                ContentRootPath = root,
                EnvironmentName = "Production"
            };
            var builder = WebApplication.CreateBuilder(options);

            var platform = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "BitzerPlatform.dll"));
            var factoryType = platform.GetType("api.DbConnectionFactory", true)!;
            var create = factoryType.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
                .Single(m => m.Name == "Create" && m.GetParameters().Length == 3);

            var loggerType = typeof(NullLogger<>).MakeGenericType(factoryType);
            var logger = loggerType.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static)!.GetValue(null);
            Console.WriteLine("Stage: create_factory");
            var factory = create.Invoke(null, new object?[] { true, false, logger });
            Console.WriteLine("Stage: factory_created");
            if (factory is null) return Fail("factory_create_failed");

            var setup = factoryType.GetMethod("SetupSqliteDesktop", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
            if (setup is null) return Fail("SetupSqliteDesktop_missing");

            Console.WriteLine("BITZER desktop DB bootstrap: invoking");
            var cleanup = setup.Invoke(factory, new object?[] { builder });
            Console.WriteLine("BITZER desktop DB bootstrap: invoked");

            using var app = builder.Build();
            Console.WriteLine("BITZER desktop DB service provider: built");
            Console.WriteLine("Desktop DB open probe: success");
            Console.WriteLine("Safety: no configuration values printed; no HHK calculation invoked; no database writes requested.");

            if (cleanup is Delegate d) d.DynamicInvoke(app);
            return 0;
        }
        catch (TargetInvocationException ex)
        {
            var inner = ex.InnerException ?? ex;
            return Fail(inner.GetType().Name + ": " + inner.Message);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.ToString());
            return Fail(ex.GetType().Name + ": " + ex.Message);
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= Resolver;
        }
    }

    private static int Fail(string message)
    {
        Console.Error.WriteLine("Desktop DB open probe: " + message);
        return 23;
    }
}
