using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkMapperIlInspector
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
            var mapper = asm.GetType("Bitzer.Selection.Platform.HHK.Inputs.HHKInputsMapper", true)!;

            foreach (var name in new[] { "MapToAPIinput", "GetSeries" })
            {
                var methods = mapper.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static)
                    .Where(m => m.Name == name).ToArray();

                foreach (var m in methods)
                {
                    Console.WriteLine($"METHOD {mapper.FullName}.{m.Name}");
                    Console.WriteLine("  Returns: " + (m.ReturnType.FullName ?? m.ReturnType.Name));
                    foreach (var p in m.GetParameters())
                        Console.WriteLine($"  Parameter: {p.Name} : {p.ParameterType.FullName}");
                }
            }

            Console.WriteLine("HHK mapper inspection: complete");
            Console.WriteLine("Safety: reflection metadata only; no database, DTO values, services, or calculation.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"HHK mapper inspection failed: {ex.GetType().Name}: {ex.Message}");
            return 35;
        }
        finally
        {
            AssemblyLoadContext.Default.Resolving -= Resolve;
        }
    }
}
