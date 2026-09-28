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
        return 0;
    }
}
