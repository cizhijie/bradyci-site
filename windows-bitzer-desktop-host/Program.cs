using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class Program
{
    private static readonly string[] RequiredAssemblies =
    {
        "BitzerPlatform.dll",
        "Bitzer.Selection.Platform.Abstractions.dll",
        "Bitzer.Selection.Platform.Data.dll",
        "Bitzer.Selection.Platform.HHK.dll"
    };

    static int Main(string[] args)
    {
        Console.WriteLine("Brady BITZER Desktop Host bootstrap.");
        Console.WriteLine($"Framework: {RuntimeInformation.FrameworkDescription}");
        Console.WriteLine($"Process architecture: {RuntimeInformation.ProcessArchitecture}");

        if (!OperatingSystem.IsWindows()) return Fail(2, "windows_required");
        if (Environment.Is64BitProcess) return Fail(3, "x86_process_required");
        if (args.Length != 2 || !(string.Equals(args[0], "--probe", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--inspect-hhk-runtime", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--inspect-desktop-db", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--validate-desktop-config", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--db-startup-check", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--db-bootstrap-probe", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--db-open-probe", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--scan-desktop-config-source", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--scan-desktop-config-il", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--scan-config-injection", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--scan-exe-config", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--inspect-calculation-route", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--probe-runtime-endpoints", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--discover-runtime-routes", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--discover-hhk-chain", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--inspect-hhk-managed", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--inspect-hhk-entry", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--inspect-hhk-dto", StringComparison.OrdinalIgnoreCase) || string.Equals(args[0], "--inspect-hhk-mapper-il", StringComparison.OrdinalIgnoreCase)))
        {
            Console.Error.WriteLine("Usage: Brady.BitzerDesktopHost.exe --probe|--inspect-hhk-runtime|--inspect-desktop-db|--validate-desktop-config|--db-startup-check|--db-bootstrap-probe|--db-open-probe|--scan-desktop-config-source|--scan-desktop-config-il|--scan-config-injection|--scan-exe-config|--inspect-calculation-route|--probe-runtime-endpoints|--discover-runtime-routes <BITZER-platform-directory>");
            return 1;
        }

        var root = Path.GetFullPath(args[1]);
        if (!Directory.Exists(root)) return Fail(4, "platform_directory_not_found");

        if (string.Equals(args[0], "--inspect-hhk-runtime", StringComparison.OrdinalIgnoreCase)) return HhkRuntimeInspector.Run(root);
        if (string.Equals(args[0], "--inspect-desktop-db", StringComparison.OrdinalIgnoreCase)) return DesktopDbRuntimeInspector.Run(root);
        if (string.Equals(args[0], "--validate-desktop-config", StringComparison.OrdinalIgnoreCase)) return DesktopConfigPreflight.Run(root);
        if (string.Equals(args[0], "--db-startup-check", StringComparison.OrdinalIgnoreCase)) return DesktopDbStartupCheck.Run(root);
        if (string.Equals(args[0], "--db-bootstrap-probe", StringComparison.OrdinalIgnoreCase)) return DesktopDbBootstrapProbe.Run(root);
        if (string.Equals(args[0], "--db-open-probe", StringComparison.OrdinalIgnoreCase)) return DesktopDbOpenProbe.Run(root);
        if (string.Equals(args[0], "--scan-desktop-config-source", StringComparison.OrdinalIgnoreCase)) return DesktopConfigSourceScanner.Run(root);
        if (string.Equals(args[0], "--scan-desktop-config-il", StringComparison.OrdinalIgnoreCase)) return DesktopConfigKeyIlScanner.Run(root);
        if (string.Equals(args[0], "--scan-config-injection", StringComparison.OrdinalIgnoreCase)) return DesktopConfigInjectionScanner.Run(root);
        if (string.Equals(args[0], "--scan-exe-config", StringComparison.OrdinalIgnoreCase)) return DesktopExeConfigScanner.Run(root);
        if (string.Equals(args[0], "--inspect-calculation-route", StringComparison.OrdinalIgnoreCase)) return CalculationRouteInspector.Run(root);
        if (string.Equals(args[0], "--probe-runtime-endpoints", StringComparison.OrdinalIgnoreCase)) return RuntimeEndpointProbe.Run(root);
        if (string.Equals(args[0], "--discover-runtime-routes", StringComparison.OrdinalIgnoreCase)) return RuntimeRouteDiscovery.Run(root);
        if (string.Equals(args[0], "--discover-hhk-chain", StringComparison.OrdinalIgnoreCase)) return RuntimeRouteDiscovery.Run(root);
        if (string.Equals(args[0], "--inspect-hhk-managed", StringComparison.OrdinalIgnoreCase)) return HhkManagedSurfaceInspector.Run(root);
        if (string.Equals(args[0], "--inspect-hhk-entry", StringComparison.OrdinalIgnoreCase)) return HhkEntryPointInspector.Run(root);
        if (string.Equals(args[0], "--inspect-hhk-dto", StringComparison.OrdinalIgnoreCase)) return HhkDtoContractInspector.Run(root);
        if (string.Equals(args[0], "--inspect-hhk-mapper-il", StringComparison.OrdinalIgnoreCase)) return HhkMapperIlInspector.Run(root);

        var missing = RequiredAssemblies.Where(x => !File.Exists(Path.Combine(root, x))).ToArray();
        if (missing.Length != 0) return Fail(5, $"missing_assemblies: {string.Join(", ", missing)}");

        Assembly? Resolver(AssemblyLoadContext context, AssemblyName name)
        {
            var candidate = Path.Combine(root, $"{name.Name}.dll");
            return File.Exists(candidate) ? context.LoadFromAssemblyPath(candidate) : null;
        }

        AssemblyLoadContext.Default.Resolving += Resolver;
        try
        {
            foreach (var file in RequiredAssemblies)
            {
                var path = Path.Combine(root, file);
                Console.WriteLine($"FOUND {file} | {AssemblyName.GetAssemblyName(path).FullName}");
            }

            var platform = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "BitzerPlatform.dll"));
            var data = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "Bitzer.Selection.Platform.Data.dll"));
            var hhk = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "Bitzer.Selection.Platform.HHK.dll"));

            return RequireType(platform, "api.DbConnectionFactory")
                && RequireType(data, "Bitzer.Selection.Platform.Data.DbContexts.DbCtx")
                && RequireType(hhk, "Bitzer.Selection.Platform.HHK.HHKModuleConfig")
                ? Ready()
                : 6;
        }
        catch (Exception ex)
        {
            return Fail(7, $"vendor_load_failed: {ex.GetType().Name}: {ex.Message}");
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= Resolver;
        }
    }

    private static bool RequireType(Assembly assembly, string typeName)
    {
        var ok = assembly.GetType(typeName, throwOnError: false) is not null;
        Console.WriteLine($"{typeName}: {(ok ? "present" : "missing")}");
        return ok;
    }

    private static int Ready()
    {
        Console.WriteLine("Desktop host: runtime_and_vendor_types_ready");
        Console.WriteLine("Safety: no database opened; no HHK calculation invoked; no native CopyDesign call.");
        return 0;
    }

    private static int Fail(int code, string status)
    {
        Console.Error.WriteLine($"Desktop host: {status}");
        return code;
    }
}
