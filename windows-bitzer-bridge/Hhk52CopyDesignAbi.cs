using System.Runtime.InteropServices;

namespace Brady.BitzerBridge;

// CopyDesign result-copy boundary. Kept non-executable until the exact official
// string/hint/error buffer declarations are pinned.
internal static class Hhk52CopyDesignAbi
{
    [UnmanagedFunctionPointer(CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    internal delegate int CopyDesign(
        IntPtr designData,
        IntPtr type1,
        IntPtr type2,
        IntPtr hint1,
        IntPtr hint2,
        IntPtr error);

    internal const bool Executable = false;
    internal const string BlockReason = "CopyDesign text/hint/error buffer ABI not fully reviewed";
}
