# Brady BITZER x86 Bridge

This project is the Windows 32-bit boundary for official BITZER selection DLLs. It is intentionally isolated from the cloud runtime.

## Build contract
- Target: Windows x86 only.
- Vendor DLLs are NOT committed to this repository.
- Place authorized BITZER DLLs and dependencies in a local configured directory.
- Do not expose this process directly to the public Internet.
- A vendor result is accepted only when the native return code, hint/error fields and application-limit result are preserved.

## HHK52 status
The JavaScript-side ABI metadata and request builder are reviewed for the standard ECOLINE call shape. The native P/Invoke declaration is kept separate so its exact pointer/output layout can be verified before live execution.

## Runtime flow
Brady Agent -> authenticated bridge transport -> x86 native host -> HHK52.DLL -> normalized response -> Brady selection gates.

No mock or synthetic result may be marked as official BITZER evidence.
