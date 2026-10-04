using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkLegacyFieldMappingInspector
{
    private static readonly OpCode[] One = new OpCode[256], Two = new OpCode[256];
    private static readonly string[] Targets = { "get_i_OP", "get_i_Method", "get_i_CC", "get_i_FCMV" };

    static HhkLegacyFieldMappingInspector()
    {
        foreach (var f in typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            if (f.GetValue(null) is not OpCode o) continue;
            ushort v=(ushort)o.Value;
            if(v<256) One[v]=o; else if((v&0xff00)==0xfe00) Two[v&255]=o;
        }
    }

    private sealed record Ins(int Offset, OpCode Op, string Operand);

    public static int Run(string root)
    {
        Assembly? Resolver(AssemblyLoadContext c, AssemblyName n)
        {
            var p=Path.Combine(root,n.Name+".dll");
            return File.Exists(p) ? c.LoadFromAssemblyPath(p) : null;
        }
        AssemblyLoadContext.Default.Resolving += Resolver;
        try
        {
            var files=new[]{"Bitzer.Selection.Platform.Abstractions.dll","Bitzer.Selection.Platform.HHK.dll"};
            Console.WriteLine("HHK LEGACY FIELD MAP");
            Console.WriteLine("Targets: i_OP / i_Method / i_CC / i_FCMV");
            int hits=0;
            foreach(var file in files)
            {
                var path=Path.Combine(root,file);
                if(!File.Exists(path)) continue;
                var asm=AssemblyLoadContext.Default.LoadFromAssemblyPath(path);
                foreach(var t in SafeTypes(asm))
                foreach(var m in t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly)
                    .Where(x=>x.GetMethodBody()!=null))
                {
                    var ins=Decode(m);
                    for(int i=0;i<ins.Count;i++)
                    {
                        var target=Targets.FirstOrDefault(x=>ins[i].Operand.EndsWith("."+x,StringComparison.Ordinal));
                        if(target is null) continue;
                        hits++;
                        var sink = FindSink(ins, i);
                        Console.WriteLine($"MAP {target[4..]} @ {t.FullName}.{m.Name}");
                        Console.WriteLine($"  SOURCE IL_{ins[i].Offset:X4}: {ins[i].Operand}");
                        if(sink is not null)
                            Console.WriteLine($"  SINK   IL_{sink.Offset:X4}: {sink.Op.Name} {sink.Operand}");
                        else
                            Console.WriteLine("  SINK   unresolved_within_basic_block");
                    }
                }
            }
            Console.WriteLine($"HHK legacy field map: complete; hits={hits}");
            Console.WriteLine("Safety: mapper IL metadata only; no DTO instantiated, database, services, config values, HTTP, native call, or calculation.");
            return 0;
        }
        catch(Exception e){Console.Error.WriteLine($"HHK legacy field map failed: {e.GetType().Name}: {e.Message}");return 68;}
        finally{AssemblyLoadContext.Default.Resolving-=Resolver;}
    }

    private static Ins? FindSink(List<Ins> ins, int source)
    {
        for(int j=source+1;j<Math.Min(ins.Count,source+32);j++)
        {
            var x=ins[j];
            var n=x.Op.Name??"";
            if(n.StartsWith("br",StringComparison.Ordinal) || n=="ret" || n=="throw" || n=="leave" || n=="leave.s") break;
            if(Targets.Any(q=>x.Operand.EndsWith("."+q,StringComparison.Ordinal))) break;
            if(x.Operand.Contains(".set_",StringComparison.Ordinal) ||
               x.Operand.Contains("Convert",StringComparison.OrdinalIgnoreCase) ||
               x.Operand.Contains("GetSeries",StringComparison.OrdinalIgnoreCase))
                return x;
        }
        return null;
    }

    private static bool IsUseful(Ins x)
    {
        var n=x.Op.Name??"";
        if(n.StartsWith("ldc.",StringComparison.Ordinal) || n.StartsWith("conv.",StringComparison.Ordinal)) return true;
        var s=x.Operand;
        return s.Contains(".set_",StringComparison.Ordinal) ||
               s.Contains("Calculation",StringComparison.OrdinalIgnoreCase) ||
               s.Contains("Operating",StringComparison.OrdinalIgnoreCase) ||
               s.Contains("Capacity",StringComparison.OrdinalIgnoreCase) ||
               s.Contains("Frequency",StringComparison.OrdinalIgnoreCase) ||
               s.Contains("Motor",StringComparison.OrdinalIgnoreCase) ||
               s.Contains("Flags",StringComparison.OrdinalIgnoreCase) ||
               s.Contains("Series",StringComparison.OrdinalIgnoreCase);
    }

    private static List<Ins> Decode(MethodInfo m)
    {
        var il=m.GetMethodBody()!.GetILAsByteArray()!; var list=new List<Ins>(); int p=0;
        while(p<il.Length)
        {
            int off=p; OpCode op=il[p++]==0xfe?Two[il[p++]]:One[il[p-1]];
            int n=Size(op.OperandType,il,p); if(n<0||p+n>il.Length) break; string val="";
            try
            {
                if(op.OperandType is OperandType.InlineMethod or OperandType.InlineField or OperandType.InlineType or OperandType.InlineTok)
                {
                    var x=m.Module.ResolveMember(BitConverter.ToInt32(il,p),m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);
                    val=(x?.DeclaringType?.FullName??"")+"."+x?.Name;
                }
                else if(op.OperandType==OperandType.InlineString) val=m.Module.ResolveString(BitConverter.ToInt32(il,p));
                else if(op.OperandType==OperandType.ShortInlineI) val=((sbyte)il[p]).ToString();
                else if(op.OperandType==OperandType.InlineI) val=BitConverter.ToInt32(il,p).ToString();
                else if(op.OperandType==OperandType.InlineI8) val=BitConverter.ToInt64(il,p).ToString();
                else if(op.OperandType==OperandType.ShortInlineR) val=BitConverter.ToSingle(il,p).ToString("R");
                else if(op.OperandType==OperandType.InlineR) val=BitConverter.ToDouble(il,p).ToString("R");
            }catch{}
            list.Add(new Ins(off,op,val)); p+=n;
        }
        return list;
    }

    private static int Size(OperandType o,byte[] b,int p)=>o switch{
        OperandType.InlineNone=>0,
        OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar=>1,
        OperandType.InlineVar=>2,
        OperandType.InlineI or OperandType.InlineBrTarget or OperandType.InlineField or OperandType.InlineMethod or OperandType.InlineSig or OperandType.InlineString or OperandType.InlineTok or OperandType.InlineType or OperandType.ShortInlineR=>4,
        OperandType.InlineI8 or OperandType.InlineR=>8,
        OperandType.InlineSwitch=>4+4*BitConverter.ToInt32(b,p),
        _=>-1};

    private static IEnumerable<Type> SafeTypes(Assembly a)
    {
        try{return a.GetTypes();}
        catch(ReflectionTypeLoadException e){return e.Types.OfType<Type>();}
        catch{return Array.Empty<Type>();}
    }
}
