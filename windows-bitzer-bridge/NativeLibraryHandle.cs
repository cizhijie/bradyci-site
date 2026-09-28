using System.Runtime.InteropServices;

namespace Brady.BitzerBridge;

internal sealed class NativeLibraryHandle : IDisposable
{
    private IntPtr _handle;
    public string Path { get; }

    public NativeLibraryHandle(string path)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Windows required.");
        if (Environment.Is64BitProcess) throw new BadImageFormatException("BITZER bridge must be x86.");
        Path = System.IO.Path.GetFullPath(path);
        if (!File.Exists(Path)) throw new FileNotFoundException("Authorized BITZER DLL not found.", Path);
        _handle = NativeLibrary.Load(Path);
    }

    public IntPtr GetExport(string name)
    {
        if (_handle == IntPtr.Zero) throw new ObjectDisposedException(nameof(NativeLibraryHandle));
        if (!NativeLibrary.TryGetExport(_handle, name, out var address))
            throw new EntryPointNotFoundException($"Export '{name}' was not found in {System.IO.Path.GetFileName(Path)}.");
        return address;
    }

    public void Dispose()
    {
        if (_handle == IntPtr.Zero) return;
        NativeLibrary.Free(_handle);
        _handle = IntPtr.Zero;
    }
}
