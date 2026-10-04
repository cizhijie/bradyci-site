using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkInternalExecuteInspector
{
    private static readonly OpCode[] One=new OpCode[256],Two=new OpCode[256];
    static HhkInternalExecuteInspector(){foreach(var f in typeof(OpCodes).GetFields(BindingFlags.Public|BindingFlags.Static)){if(f.GetValue(null) is not OpCode o)continue;ushort v=(ushort)o.Value;if(v<256)One[v]=o;else if((v&0xff00)==0xfe00)Two[v&255]=o;}}
    public static int Run(string root){
        var dir=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","hhk-candidates");var dll=Path.Combine(dir,"Calculation.dll");
        if(!File.Exists(dll)){Console.Error.WriteLine("Calculation.dll not found.");return 78;}
        AssemblyLoadContext.Default.Resolving+=(c,n)=>{foreach(var d in new[]{dir,Path.GetFullPath(Path.Combine(root,"..","selection")),root}){var p=Path.Combine(d,n.Name+".dll");if(File.Exists(p))try{return c.LoadFromAssemblyPath(p);}catch{}}return null;};
        try{
            var a=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);
            var calc=a.GetType("Bitzer.CalculationHHK",true)!;
            var cs=calc.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly).First(x=>x.Name=="CalculateSingle"&&x.GetMethodBody()!=null);
            var invoke=FindResolvedMethod(cs,"Invoke","Bitzer.BitzerFunction") ?? throw new MissingMethodException("Resolved BitzerFunction.Invoke not found");
            var t=invoke.DeclaringType ?? throw new TypeLoadException("BitzerFunction declaring type not found");
            var internalExecute=t.GetMethod("InternalExecute",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static);
            var m=internalExecute==null?null:FindResolvedMethod(internalExecute,"Execute","Bitzer.BitzerFunction");
            Console.WriteLine("HHK EXECUTE BODY");
            if(m==null){Console.WriteLine("BitzerFunction.Execute not found.");return 79;}
            Console.WriteLine($"METHOD {m}");
            var body=m.GetMethodBody();if(body==null){Console.WriteLine("BODY <none/native/external>");return 0;}
            foreach(var x in Decode(m))Console.WriteLine($"  IL_{x.Offset:X4}: {x.Op.Name} {x.Text}");
            Console.WriteLine("HHK Execute body: complete.");Console.WriteLine("Safety: IL metadata only; no vendor method invoked and no calculation executed.");return 0;
        }catch(Exception e){Console.Error.WriteLine($"{e.GetType().Name}: {e.Message}");return 80;}
    }
    private static MethodBase? FindResolvedMethod(MethodBase m,string methodName,string declaringType)
    {
        var il=m.GetMethodBody()!.GetILAsByteArray()!;int p=0;
        while(p<il.Length)
        {
            OpCode op=il[p++]==0xfe?Two[il[p++]]:One[il[p-1]];
            int n=Size(op.OperandType,il,p);if(n<0||p+n>il.Length)break;
            if(op.OperandType==OperandType.InlineMethod)
            {
                try
                {
                    var x=m.Module.ResolveMethod(BitConverter.ToInt32(il,p),m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);
                    if(x?.Name==methodName && x.DeclaringType?.FullName==declaringType)return x;
                }catch{}
            }
            p+=n;
        }
        return null;
    }
    private sealed record I(int Offset,OpCode Op,string Text);
    private static List<I> Decode(MethodBase m){var il=m.GetMethodBody()!.GetILAsByteArray()!;var r=new List<I>();int p=0;while(p<il.Length){int off=p;OpCode op=il[p++]==0xfe?Two[il[p++]]:One[il[p-1]];int n=Size(op.OperandType,il,p);if(n<0||p+n>il.Length)break;string s="";try{if(op.OperandType is OperandType.InlineMethod or OperandType.InlineField or OperandType.InlineType or OperandType.InlineTok){var mi=m.Module.ResolveMember(BitConverter.ToInt32(il,p),m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);s=(mi?.DeclaringType?.FullName??"")+"."+mi?.Name;}else if(op.OperandType==OperandType.InlineString)s=m.Module.ResolveString(BitConverter.ToInt32(il,p));else if(op.OperandType==OperandType.ShortInlineI)s=((sbyte)il[p]).ToString();else if(op.OperandType==OperandType.InlineI)s=BitConverter.ToInt32(il,p).ToString();else if(op.OperandType==OperandType.ShortInlineVar)s=il[p].ToString();else if(op.OperandType==OperandType.InlineVar)s=BitConverter.ToUInt16(il,p).ToString();else if(op.OperandType==OperandType.ShortInlineBrTarget)s=$"IL_{p+1+(sbyte)il[p]:X4}";else if(op.OperandType==OperandType.InlineBrTarget)s=$"IL_{p+4+BitConverter.ToInt32(il,p):X4}";}catch{}r.Add(new(off,op,s));p+=n;}return r;}
    private static int Size(OperandType o,byte[]b,int p)=>o switch{OperandType.InlineNone=>0,OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar=>1,OperandType.InlineVar=>2,OperandType.InlineI or OperandType.InlineBrTarget or OperandType.InlineField or OperandType.InlineMethod or OperandType.InlineSig or OperandType.InlineString or OperandType.InlineTok or OperandType.InlineType or OperandType.ShortInlineR=>4,OperandType.InlineI8 or OperandType.InlineR=>8,OperandType.InlineSwitch=>4+4*BitConverter.ToInt32(b,p),_=>-1};
}