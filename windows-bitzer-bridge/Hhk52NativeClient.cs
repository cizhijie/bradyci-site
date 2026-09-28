namespace Brady.BitzerBridge;

public interface IBitzerNativeClient
{
    BitzerBridgeResponse Design(BitzerBridgeRequest request);
}

public sealed class Hhk52NativeClient : IBitzerNativeClient
{
    public BitzerBridgeResponse Design(BitzerBridgeRequest request)
    {
        // Fail closed until the exact HHK52 output pointer/buffer declaration is
        // verified against the official interface manual and a licensed local DLL.
        return new BitzerBridgeResponse(
            request.RequestId, false, "native_binding_not_enabled",
            "HHK52.DLL", null, null,
            "HHK52 native binding is intentionally disabled until ABI verification is complete.",
            null, null, null, null, null, null, null, null);
    }
}
