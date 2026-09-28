using System.Runtime.InteropServices;

namespace Brady.BitzerBridge;

internal static class Program
{
    static int Main(string[] args)
    {
        if (!OperatingSystem.IsWindows())
        {
            Console.Error.WriteLine("BITZER bridge requires Windows.");
            return 2;
        }
        if (Environment.Is64BitProcess)
        {
            Console.Error.WriteLine("BITZER bridge must run as an x86 process for the 32-bit vendor DLL.");
            return 3;
        }

        Console.WriteLine("Brady BITZER Bridge x86 host ready.");
        Console.WriteLine($"Process architecture: {RuntimeInformation.ProcessArchitecture}");

        if (args.Length == 0)
            return 0;

        if (args.Length == 2 && string.Equals(args[0], "--preflight", StringComparison.OrdinalIgnoreCase))
        {
            var dllPath = args[1];
            var result = BitzerDllPreflight.CheckHhk52(dllPath);
            Console.WriteLine($"HHK52 preflight: {result.Status}");
            Console.WriteLine($"DLL: {dllPath}");
            if (result.Missing.Length != 0)
                Console.WriteLine($"Missing exports: {string.Join(", ", result.Missing)}");
            return result.Ok ? 0 : 4;
        }

        Console.Error.WriteLine("Usage: Brady.BitzerBridge.exe [--preflight <path-to-Hhk52.dll>]");
        return 1;
    }
}
