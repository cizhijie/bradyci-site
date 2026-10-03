# Brady BITZER Desktop Host

Isolated x86 host for the official BITZER Selection platform runtime.

## Why it is separate

The existing `Brady.BitzerBridge` targets .NET 8 and remains unchanged. BITZER Selection 7.1.11 platform assemblies reference `System.Runtime, Version=10.0.0.0`, so this host targets `net10.0-windows`.

## Current safety boundary

The first probe only:

- verifies Windows/x86;
- verifies required BITZER assemblies;
- loads the official managed platform assemblies;
- verifies `DbConnectionFactory`, `DbCtx`, and `HHKModuleConfig` types.

It does **not** open the encrypted desktop database, construct `DbCtx`, run HHK calculations, or call `Hhk52.dll`.

## Probe

```cmd
dotnet run --project windows-bitzer-desktop-host\Brady.BitzerDesktopHost.csproj -- --probe "C:\Users\bradyci\AppData\Local\Bitzer Software_7.1.11-0\platform"
```

If the machine does not have a .NET 10 SDK/runtime usable by `dotnet`, the project will fail before vendor code is executed. That result is intentional evidence for the next bootstrap step.
