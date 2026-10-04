using System.Net;
using System.Net.Http;

namespace Brady.BitzerDesktopHost;

internal static class RuntimeEndpointProbe
{
    private static readonly string[] Paths =
    {
        "/swagger/v1/swagger.json",
        "/swagger/swagger.json",
        "/openapi/v1.json",
        "/openapi.json",
        "/api-docs",
        "/health"
    };

    public static int Run(string root)
    {
        using var client = new HttpClient
        {
            BaseAddress = new Uri("http://127.0.0.1:7400"),
            Timeout = TimeSpan.FromSeconds(3)
        };

        Console.WriteLine("BITZER runtime endpoint metadata probe: 127.0.0.1:7400");
        foreach (var path in Paths)
        {
            try
            {
                using var response = client.GetAsync(path).GetAwaiter().GetResult();
                var type = response.Content.Headers.ContentType?.MediaType ?? "-";
                var len = response.Content.Headers.ContentLength?.ToString() ?? "unknown";
                Console.WriteLine($"{path} -> {(int)response.StatusCode} {response.StatusCode}; type={type}; length={len}");

                if (response.IsSuccessStatusCode &&
                    (type.Contains("json", StringComparison.OrdinalIgnoreCase) ||
                     path.Contains("swagger", StringComparison.OrdinalIgnoreCase) ||
                     path.Contains("openapi", StringComparison.OrdinalIgnoreCase)))
                {
                    var body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                    PrintInterestingRoutes(body);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{path} -> {ex.GetType().Name}");
            }
        }

        Console.WriteLine("Runtime endpoint probe: complete");
        Console.WriteLine("Safety: localhost GET requests only; no calculation submitted; no configuration or encryption material printed.");
        return 0;
    }

    private static void PrintInterestingRoutes(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return;
        foreach (var token in body.Split('"', StringSplitOptions.RemoveEmptyEntries)
                     .Where(x => x.StartsWith("/") &&
                                 (x.Contains("calcul", StringComparison.OrdinalIgnoreCase) ||
                                  x.Contains("result", StringComparison.OrdinalIgnoreCase) ||
                                  x.Contains("hhk", StringComparison.OrdinalIgnoreCase)))
                     .Distinct()
                     .Take(30))
            Console.WriteLine($"  ROUTE {token}");
    }
}
