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

        if (args.Length == 2 && string.Equals(args[0], "--smoke-gate", StringComparison.OrdinalIgnoreCase))
        {
            var dllPath = args[1];
            var gate = Hhk52NativeExecutionGate.Check(dllPath);
            Console.WriteLine($"HHK52 execution gate: {gate.Status}");
            if (!gate.Ok) return 5;

            var probe = new BitzerBridgeRequest(
                "smoke-gate", "ECOLINE", "R404A", -10d, 40d,
                null, null, null, null, null, null);
            var mapped = Hhk52CopyDesignInputMapper.Map(probe, null, dllPath, dllPath);
            Console.WriteLine($"HHK52 input mapper: {mapped.Status}");
            if (mapped.Missing.Length != 0)
                Console.WriteLine($"Blocked missing inputs: {string.Join(", ", mapped.Missing)}");

            // This command deliberately never invokes CopyDesign.
            return mapped.Ok ? 6 : 0;
        }

        Console.Error.WriteLine("Usage: Brady.BitzerBridge.exe [--preflight <path-to-Hhk52.dll> | --smoke-gate <path-to-Hhk52.dll>]");
        return 1;
    }
}
