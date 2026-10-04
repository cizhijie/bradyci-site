using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkDtoContractInspector
{
    public static int Run(string root)
    {
        Assembly? Resolve(AssemblyLoadContext c, AssemblyName n)
        {
            var p = Path.Combine(root, n.Name + ".dll");
            return File.Exists(p) ? c.LoadFromAssemblyPath(p) : null;
        }

        AssemblyLoadContext.Default.Resolving += Resolve;
        try
        {
            var asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(root, "Bitzer.Selection.Platform.HHK.dll"));
            var dto = asm.GetType("Bitzer.Selection.Platform.HHK.Inputs.HHKInputsDto", true)!;
            Console.WriteLine("HHK DTO contract (including inherited writable properties):");
            foreach (var p in dto.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                                 .Where(x => x.CanWrite)
                                 .OrderBy(x => x.Name))
                Console.WriteLine($"  {p.PropertyType.FullName} {p.Name}");

            Console.WriteLine("HHK DTO contract inspection: complete");
            Console.WriteLine("Safety: metadata only; no DTO values, database, services, or calculation.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"HHK DTO contract inspection failed: {ex.GetType().Name}: {ex.Message}");
            return 34;
        }
        finally { AssemblyLoadContext.Default.Resolving -= Resolve; }
    }
}
