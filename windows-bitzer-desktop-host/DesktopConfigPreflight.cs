using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;

namespace Brady.BitzerDesktopHost;

internal static class DesktopConfigPreflight
{
    public static int Run(string root)
    {
        try
        {
            var appsettings = Path.Combine(root, "appsettings.json");
            if (!File.Exists(appsettings))
            {
                Console.Error.WriteLine("Desktop config preflight: appsettings_not_found");
                return 12;
            }

            using var doc = JsonDocument.Parse(File.ReadAllText(appsettings));
            var rootElement = doc.RootElement;

            var requiredConnections = new[] { "DefaultDesktopConnection", "InMemoryConnection" };
            var connectionSection = rootElement.TryGetProperty("ConnectionStrings", out var cs) ? cs : default;
            foreach (var key in requiredConnections)
            {
                var present = connectionSection.ValueKind == JsonValueKind.Object
                    && connectionSection.TryGetProperty(key, out var value)
                    && value.ValueKind == JsonValueKind.String
                    && !string.IsNullOrWhiteSpace(value.GetString());
                Console.WriteLine("ConnectionStrings:" + key + " = " + (present ? "present" : "missing"));
            }

            var desktopFlag = rootElement.TryGetProperty("Configuration", out var config)
                && config.ValueKind == JsonValueKind.Object
                && config.TryGetProperty("IsDesktopAppBuild", out var flag)
                && flag.ValueKind == JsonValueKind.String
                && !string.IsNullOrWhiteSpace(flag.GetString());
            Console.WriteLine("Configuration:IsDesktopAppBuild = " + (desktopFlag ? "present" : "missing"));

            var platform = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "BitzerPlatform.dll"));
            var factoryType = platform.GetType("api.DbConnectionFactory", true)!;
            var create = factoryType.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance)
                .FirstOrDefault(m => m.Name == "Create");
            Console.WriteLine("DbConnectionFactory.Create = " + (create is null ? "missing" : "present"));
            if (create is not null)
            {
                Console.WriteLine("Create parameters: " + string.Join(", ", create.GetParameters().Select(p => p.Name + ":" + p.ParameterType.Name)));
            }

            Console.WriteLine("Desktop config preflight: ready");
            Console.WriteLine("Safety: values hidden; database not opened; no connection created; no HHK calculation invoked.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Desktop config preflight failed: " + ex.GetType().Name + ": " + ex.Message);
            return 13;
        }
    }
}
