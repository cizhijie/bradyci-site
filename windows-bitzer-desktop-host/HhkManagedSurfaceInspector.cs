using System.Reflection;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkManagedSurfaceInspector
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
            var path = Path.Combine(root, "Bitzer.Selection.Platform.HHK.dll");
            var asm = AssemblyLoadContext.Default.LoadFromAssemblyPath(path);
            IEnumerable<Type> types;
            try { types = asm.GetTypes(); }
            catch (ReflectionTypeLoadException e) { types = e.Types.OfType<Type>(); }
            foreach (var type in types.Where(t => (t.FullName ?? t.Name).Contains("HHK", StringComparison.OrdinalIgnoreCase)).OrderBy(t => t.FullName))
            {
                var methods = type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly)
                    .Where(m => m.Name.Contains("Map", StringComparison.OrdinalIgnoreCase) || m.Name.Contains("Calc", StringComparison.OrdinalIgnoreCase) || m.Name.Contains("Series", StringComparison.OrdinalIgnoreCase) || m.Name.Contains("Register", StringComparison.OrdinalIgnoreCase)).ToArray();
                if (methods.Length == 0) continue;
                Console.WriteLine("TYPE " + type.FullName);
                foreach (var m in methods.OrderBy(x => x.Name))
                    Console.WriteLine("  METHOD " + m.Name + "(" + string.Join(", ", m.GetParameters().Select(p => (p.ParameterType.FullName ?? p.ParameterType.Name) + " " + p.Name)) + ") -> " + (m.ReturnType.FullName ?? m.ReturnType.Name));
            }
            Console.WriteLine("HHK managed surface inspection: complete");
            Console.WriteLine("Safety: reflection metadata only; no calculation or database operation invoked.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("HHK managed surface inspection failed: " + ex.GetType().Name + ": " + ex.Message);
            return 32;
        }
        finally { AssemblyLoadContext.Default.Resolving -= Resolve; }
    }
}