using System.Runtime.InteropServices;

namespace Brady.BitzerBridge;

// Official HHK52 CopyDesign declaration:
// O_T1/O_T2 are caller-owned ANSI buffers of 30 chars;
// O_Err is caller-owned ANSI buffer of 20 chars;
// O_Hint1/O_Hint2 and all size arguments are 32-bit Long values.\n// Official declaration includes I_Flags, I_Serie, then I_Mode.
internal static class Hhk52CopyDesignAbi
{
    internal const int TypeBufferChars = 30;
    internal const int ErrorBufferChars = 20;

    [UnmanagedFunctionPointer(CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    internal delegate int CopyDesign(
        [MarshalAs(UnmanagedType.LPStr)] string refrigerantPath,
        [MarshalAs(UnmanagedType.LPStr)] string notePath,
        int flags, int series, int mode,
        [MarshalAs(UnmanagedType.LPStr)] string type,
        int cc,
        [MarshalAs(UnmanagedType.LPStr)] string refrigerant,
        double requiredCapacity,
        double evaporatingTemp, double condensingTemp,
        double suctionOrSuperheat, double liquidOrSubcooling,
        double nominalTemp,
        int net, int ds, int ov, int fi,
        double fcf, int fcv, int fcof, int fcmv, int op, float cr,
        IntPtr type1, ref int sizeType1,
        IntPtr type2, ref int sizeType2,
        ref Hhk52DesignData designData,
        ref int hint1, ref int hint2,
        IntPtr error, ref int sizeError);

    internal const bool Executable = true;
}
