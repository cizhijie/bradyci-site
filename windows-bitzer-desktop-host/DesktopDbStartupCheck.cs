namespace Brady.BitzerDesktopHost;

internal static class DesktopDbStartupCheck
{
    public static int Run(string root)
    {
        var required = new[]
        {
            "appsettings.json",
            "BitzerPlatform.dll",
            "Bitzer.Selection.Platform.Data.dll",
            "Microsoft.Extensions.Logging.Abstractions.dll"
        };

        foreach (var name in required)
        {
            var found = File.Exists(Path.Combine(root, name));
            Console.WriteLine(name + " = " + (found ? "present" : "missing"));
            if (!found) return 20;
        }

        Console.WriteLine("Desktop DB startup check: prerequisites_ready");
        Console.WriteLine("Next boundary: invoke vendor desktop database bootstrap.");
        Console.WriteLine("Safety: no configuration values printed; no HHK calculation invoked.");
        return 0;
    }
}
