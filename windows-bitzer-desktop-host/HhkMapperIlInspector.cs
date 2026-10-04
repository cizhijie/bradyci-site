using System.Reflection;
using System.Reflection.Emit;
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
                    var il = m.GetMethodBody()?.GetILAsByteArray();
                    if (il != null)
                    {
                        for (int i = 0; i + 4 < il.Length; i++)
                        {
                            int token = BitConverter.ToInt32(il, i + 1);
                            try
                            {
                                var member = m.Module.ResolveMember(token, m.DeclaringType?.GetGenericArguments(), m.GetGenericArguments());
                                var s = member?.ToString() ?? "";
                                if (s.Contains("i_") || s.Contains("Series") || s.Contains("Motor") || s.Contains("Frequency") ||
                                    s.Contains("Voltage") || s.Contains("Refriger") || s.Contains("Operating") || s.Contains("Capacity") ||
                                    s.Contains("Temperature") || s.Contains("Flags"))
                                    Console.WriteLine($"  IL_REF @{i:X4}: {s}");
                            }
                            catch { }
                        }
                    }
                }
            }

            Console.WriteLine("HHK mapper IL inspection: complete");
            Console.WriteLine("Safety: reflection/IL metadata only; no database, DTO values, services, or calculation.");
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
