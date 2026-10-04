using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class CalculationHhkInputFlowInspector
{
    private static readonly OpCode[] One = new OpCode[256], Two = new OpCode[256];

    static CalculationHhkInputFlowInspector()
    {
        foreach (var f in typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            if (f.GetValue(null) is not OpCode o) continue;
            ushort v = (ushort)o.Value;
            if (v < 256) One[v] = o;
            else if ((v & 0xff00) == 0xfe00) Two[v & 255] = o;
        }
    }

    private sealed record Ins(int Offset, OpCode Op, string Operand);

    public static int Run(string root)
    {
        var dir = Path.Combine(Path.GetTempPath(), "brady-bitzer-inspect", "hhk-candidates");
        var dll = Path.Combine(dir, "Calculation.dll");
        if (!File.Exists(dll))
        {
            Console.Error.WriteLine("Calculation.dll not found; run --extract-bitzer-bundle-dependencies first.");
            return 64;
        }

        AssemblyLoadContext.Default.Resolving += (c, n) =>
        {
            foreach (var d in new[] { dir, Path.GetFullPath(Path.Combine(root, "..", "selection")), root })
            {
                var p = Path.Combine(d, n.Name + ".dll");
                if (File.Exists(p)) try { return c.LoadFromAssemblyPath(p); } catch { }
            }
            return null;
        };

        try
        {
            var a = AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);
            var t = a.GetType("Bitzer.CalculationHHK", true)!;
            var methods = t.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly)
                .Where(m => m.GetMethodBody() is not null)
                .OrderBy(m => m.Name)
                .ToArray();

            Console.WriteLine($"TARGET {t.FullName}; methods={methods.Length}");
            int hits = 0;
            foreach (var m in methods)
            {
                var ins = Decode(m);
                for (int i = 0; i < ins.Count; i++)
                {
                    var s = ins[i].Operand;
                    if (!IsInputSetter(s)) continue;
                    hits++;
                    Console.WriteLine();
                    Console.WriteLine($"FLOW {m.Name} -> {s}");
                    int from = Math.Max(0, i - 8), to = Math.Min(ins.Count - 1, i + 2);
                    for (int j = from; j <= to; j++)
                        Console.WriteLine($"  IL_{ins[j].Offset:X4}: {ins[j].Op.Name} {ins[j].Operand}");
                }
            }

            Console.WriteLine();
            Console.WriteLine($"HHK input-flow inspection: complete; setter_hits={hits}");
            Console.WriteLine("Safety: IL metadata only; no method invoked, database, HTTP, config values, services, or calculation.");
            return 0;
        }
        catch (Exception e)
        {
            Console.Error.WriteLine($"{e.GetType().Name}: {e.Message}");
            return 65;
        }
    }

    private static bool IsInputSetter(string s)
    {
        if (string.IsNullOrEmpty(s) || !s.Contains(".set_", StringComparison.Ordinal)) return false;
        return s.Contains("HHK", StringComparison.OrdinalIgnoreCase)
            || s.Contains("DesignInput", StringComparison.OrdinalIgnoreCase)
            || s.Contains("CalculationInput", StringComparison.OrdinalIgnoreCase)
            || s.Contains("BitzerRemote", StringComparison.OrdinalIgnoreCase)
            || s.Contains(".i_", StringComparison.OrdinalIgnoreCase);
    }

    private static List<Ins> Decode(MethodInfo m)
    {
        var il = m.GetMethodBody()!.GetILAsByteArray()!;
        var list = new List<Ins>();
        int p = 0;
        while (p < il.Length)
        {
            int off = p;
            OpCode op = il[p++] == 0xfe ? Two[il[p++]] : One[il[p - 1]];
            int n = Size(op.OperandType, il, p);
            if (n < 0 || p + n > il.Length) break;
            string val = "";
            try
            {
                if (op.OperandType is OperandType.InlineMethod or OperandType.InlineField or OperandType.InlineType or OperandType.InlineTok)
                {
                    var x = m.Module.ResolveMember(BitConverter.ToInt32(il, p), m.DeclaringType?.GetGenericArguments(), m.IsGenericMethod ? m.GetGenericArguments() : null);
                    val = (x?.DeclaringType?.FullName ?? "") + "." + x?.Name;
                }
                else if (op.OperandType == OperandType.InlineString) val = m.Module.ResolveString(BitConverter.ToInt32(il, p));
                else if (op.OperandType == OperandType.ShortInlineI) val = ((sbyte)il[p]).ToString();
                else if (op.OperandType == OperandType.InlineI) val = BitConverter.ToInt32(il, p).ToString();
                else if (op.OperandType == OperandType.InlineI8) val = BitConverter.ToInt64(il, p).ToString();
                else if (op.OperandType == OperandType.ShortInlineR) val = BitConverter.ToSingle(il, p).ToString("R");
                else if (op.OperandType == OperandType.InlineR) val = BitConverter.ToDouble(il, p).ToString("R");
                else if (op.OperandType == OperandType.ShortInlineVar) val = il[p].ToString();
                else if (op.OperandType == OperandType.InlineVar) val = BitConverter.ToUInt16(il, p).ToString();
            }
            catch { }
            list.Add(new Ins(off, op, val));
            p += n;
        }
        return list;
    }

    private static int Size(OperandType o, byte[] b, int p) => o switch
    {
        OperandType.InlineNone => 0,
        OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar => 1,
        OperandType.InlineVar => 2,
        OperandType.InlineI or OperandType.InlineBrTarget or OperandType.InlineField or OperandType.InlineMethod or OperandType.InlineSig or OperandType.InlineString or OperandType.InlineTok or OperandType.InlineType or OperandType.ShortInlineR => 4,
        OperandType.InlineI8 or OperandType.InlineR => 8,
        OperandType.InlineSwitch => 4 + 4 * BitConverter.ToInt32(b, p),
        _ => -1
    };
}
