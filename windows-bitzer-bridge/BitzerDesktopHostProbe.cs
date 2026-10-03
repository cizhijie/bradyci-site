using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerBridge;

/// <summary>
/// Safe first-stage probe for the installed BITZER desktop platform.
/// It validates the platform layout and assembly identities only.
/// It deliberately does not open the encrypted database, build DbCtx,
/// invoke HHK Calculation, or call Hhk52.dll.
/// </summary>
internal static class BitzerDesktopHostProbe
{
    private static readonly string[] RequiredAssemblies =
    {
        "BitzerPlatform.dll",
        "Bitzer.Selection.Platform.Abstractions.dll",
        "Bitzer.Selection.Platform.Data.dll",
        "Bitzer.Selection.Platform.HHK.dll"
    };

    internal static int Run(string platformDirectory)
    {
        var root = Path.GetFullPath(platformDirectory);
        Console.WriteLine($"BITZER desktop platform: {root}");

        if (!Directory.Exists(root))
        {
            Console.Error.WriteLine("Desktop host probe: platform_directory_not_found");
            return 20;
        }

        var missing = RequiredAssemblies
            .Where(name => !File.Exists(Path.Combine(root, name)))
            .ToArray();

        if (missing.Length != 0)
        {
            Console.Error.WriteLine($"Desktop host probe: missing_assemblies: {string.Join(", ", missing)}");
            return 21;
        }

        var previousResolver = new Func<AssemblyLoadContext, AssemblyName, Assembly?>(ResolveFromPlatform);
        AssemblyLoadContext.Default.Resolving += previousResolver;
        try
        {
            foreach (var name in RequiredAssemblies)
            {
                var path = Path.Combine(root, name);
                var assemblyName = AssemblyName.GetAssemblyName(path);
                Console.WriteLine($"FOUND {name} | {assemblyName.FullName}");
            }

            // Metadata/type-presence checks only. Do not instantiate vendor types here.
            var platformAssembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "BitzerPlatform.dll"));
            var dataAssembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "Bitzer.Selection.Platform.Data.dll"));
            var hhkAssembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "Bitzer.Selection.Platform.HHK.dll"));

            var dbFactory = platformAssembly.GetType("api.DbConnectionFactory", throwOnError: false);
            var dbCtx = dataAssembly.GetType("Bitzer.Selection.Platform.Data.DbContexts.DbCtx", throwOnError: false);
            var hhkModule = hhkAssembly.GetType("Bitzer.Selection.Platform.HHK.HHKModuleConfig", throwOnError: false);

            Console.WriteLine($"DbConnectionFactory: {(dbFactory is null ? "missing" : "present")}");
            Console.WriteLine($"DbCtx: {(dbCtx is null ? "missing" : "present")}");
            Console.WriteLine($"HHKModuleConfig: {(hhkModule is null ? "missing" : "present")}");

            if (dbFactory is null || dbCtx is null || hhkModule is null)
            {
                Console.Error.WriteLine("Desktop host probe: required_vendor_type_missing");
                return 22;
            }

            Console.WriteLine("Desktop host probe: ready_for_isolated_bootstrap");
            Console.WriteLine("Safety: no database opened; no HHK calculation invoked; no native CopyDesign call.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Desktop host probe: load_failed: {ex.GetType().Name}: {ex.Message}");
            return 23;
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= previousResolver;
        }

        Assembly? ResolveFromPlatform(AssemblyLoadContext context, AssemblyName assemblyName)
        {
            var candidate = Path.Combine(root, $"{assemblyName.Name}.dll");
            return File.Exists(candidate) ? context.LoadFromAssemblyPath(candidate) : null;
        }
    }
}
