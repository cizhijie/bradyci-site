namespace Brady.BitzerBridge;

internal static class Hhk52NativeExecutionGate
{
    public static (bool Ok, string Status) Check(string dllPath)
    {
        if (!Hhk52OutputAbiReview.Complete)
            return (false, "hhk52_design_output_abi_review_required");
        if (!Hhk52DesignAbi.Executable)
            return (false, "hhk52_design_delegate_not_enabled");

        var preflight = BitzerDllPreflight.CheckHhk52(dllPath);
        return preflight.Ok
            ? (true, "hhk52_native_execution_ready")
            : (false, preflight.Status);
    }
}
