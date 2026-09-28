using System.Runtime.InteropServices;

namespace Brady.BitzerBridge;

internal sealed class Hhk52CopyDesignInvoker
{
    private readonly string _dllPath;

    internal Hhk52CopyDesignInvoker(string dllPath) => _dllPath = dllPath;

    internal BitzerBridgeResponse Invoke(BitzerBridgeRequest request)
    {
        var gate = Hhk52NativeExecutionGate.Check(_dllPath);
        if (!gate.Ok) return Blocked(request, gate.Status);

        if (!string.Equals(request.Family, "ECOLINE", StringComparison.OrdinalIgnoreCase))
            return Blocked(request, "family_must_be_ECOLINE");
        if (string.IsNullOrWhiteSpace(request.Refrigerant))
            return Blocked(request, "refrigerant_required");

        // CopyDesign needs a complete reviewed input set. Until the remaining control
        // values are supplied by the request mapper, do not invent them here.
        return Blocked(request, "hhk52_input_mapper_not_enabled");
    }

    internal static Hhk52CopyDesignAbi.CopyDesign Resolve(NativeLibraryHandle lib)
    {
        var address = lib.GetExport("CopyDesign");
        return Marshal.GetDelegateForFunctionPointer<Hhk52CopyDesignAbi.CopyDesign>(address);
    }

    private static BitzerBridgeResponse Blocked(BitzerBridgeRequest r, string status) =>
        new(r.RequestId, false, status, "HHK52.DLL", null, null, status,
            null, null, null, null, null, null, null, null);
}
