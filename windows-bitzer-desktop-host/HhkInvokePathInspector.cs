using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.Loader;

namespace Brady.BitzerDesktopHost;

internal static class HhkInvokePathInspector
{
    private static readonly OpCode[] One=new OpCode[256],Two=new OpCode[256];
    static HhkInvokePathInspector(){foreach(var f in typeof(OpCodes).GetFields(BindingFlags.Public|BindingFlags.Static)){if(f.GetValue(null) is not OpCode o)continue;ushort v=(ushort)o.Value;if(v<256)One[v]=o;else if((v&0xff00)==0xfe00)Two[v&255]=o;}}
    public static int Run(string root)
    {
        var dir=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","hhk-candidates");
        var dll=Path.Combine(dir,"Calculation.dll");
        if(!File.Exists(dll)){Console.Error.WriteLine("Calculation.dll not found.");return 76;}
        AssemblyLoadContext.Default.Resolving+=(c,n)=>{foreach(var d in new[]{dir,Path.GetFullPath(Path.Combine(root,"..","selection")),root}){var p=Path.Combine(d,n.Name+".dll");if(File.Exists(p))try{return c.LoadFromAssemblyPath(p);}catch{}}return null;};
        try{
            var a=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);
            var calc=a.GetType("Bitzer.CalculationHHK",true)!;
            var cs=calc.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly).First(m=>m.Name=="CalculateSingle"&&m.GetMethodBody()!=null);
            var members=DecodeMembers(cs).Where(x=>x.Member is MethodBase).Select(x=>(MethodBase)x.Member!).Where(x=>x.DeclaringType?.FullName is "Bitzer.HHK_Design" or "Bitzer.BitzerFunction").DistinctBy(x=>x.MetadataToken).ToArray();
            Console.WriteLine("HHK INVOKE PATH");
            foreach(var m in members){
                Console.WriteLine($"TARGET {m.DeclaringType?.FullName}.{m.Name} | {m}");
                var body=m.GetMethodBody();
                if(body==null){Console.WriteLine("  BODY <none/native/external>");continue;}
                foreach(var x in DecodeMembers(m)) Console.WriteLine($"  IL_{x.Offset:X4}: {x.Op.Name} {x.Text}");
            }
            Console.WriteLine("HHK invoke path: complete.");
            Console.WriteLine("Safety: IL metadata only; no vendor method invoked and no calculation executed.");
            return 0;
        }catch(Exception e){Console.Error.WriteLine($"{e.GetType().Name}: {e.Message}");return 77;}
    }
    private sealed record I(int Offset,OpCode Op,string Text,MemberInfo? Member);
    private static List<I> DecodeMembers(MethodBase m){
        var il=m.GetMethodBody()!.GetILAsByteArray()!;var r=new List<I>();int p=0;
        while(p<il.Length){int off=p;OpCode op=il[p++]==0xfe?Two[il[p++]]:One[il[p-1]];int n=Size(op.OperandType,il,p);if(n<0||p+n>il.Length)break;string s="";MemberInfo? mi=null;
            try{if(op.OperandType is OperandType.InlineMethod or OperandType.InlineField or OperandType.InlineType or OperandType.InlineTok){mi=m.Module.ResolveMember(BitConverter.ToInt32(il,p),m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);s=(mi?.DeclaringType?.FullName??"")+"."+mi?.Name;}else if(op.OperandType==OperandType.InlineString)s=m.Module.ResolveString(BitConverter.ToInt32(il,p));else if(op.OperandType==OperandType.ShortInlineI)s=((sbyte)il[p]).ToString();else if(op.OperandType==OperandType.InlineI)s=BitConverter.ToInt32(il,p).ToString();else if(op.OperandType==OperandType.ShortInlineVar)s=il[p].ToString();else if(op.OperandType==OperandType.InlineVar)s=BitConverter.ToUInt16(il,p).ToString();else if(op.OperandType==OperandType.ShortInlineBrTarget)s=$"IL_{p+1+(sbyte)il[p]:X4}";else if(op.OperandType==OperandType.InlineBrTarget)s=$"IL_{p+4+BitConverter.ToInt32(il,p):X4}";}catch{}
            r.Add(new(off,op,s,mi));p+=n;}return r;
    }
    private static int Size(OperandType o,byte[]b,int p)=>o switch{OperandType.InlineNone=>0,OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar=>1,OperandType.InlineVar=>2,OperandType.InlineI or OperandType.InlineBrTarget or OperandType.InlineField or OperandType.InlineMethod or OperandType.InlineSig or OperandType.InlineString or OperandType.InlineTok or OperandType.InlineType or OperandType.ShortInlineR=>4,OperandType.InlineI8 or OperandType.InlineR=>8,OperandType.InlineSwitch=>4+4*BitConverter.ToInt32(b,p),_=>-1};
}