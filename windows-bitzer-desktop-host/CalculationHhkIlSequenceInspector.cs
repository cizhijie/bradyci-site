using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.Loader;
namespace Brady.BitzerDesktopHost;
internal static class CalculationHhkIlSequenceInspector
{
 static readonly OpCode[] One=new OpCode[256],Two=new OpCode[256];
 static CalculationHhkIlSequenceInspector(){foreach(var f in typeof(OpCodes).GetFields(BindingFlags.Public|BindingFlags.Static)){if(f.GetValue(null) is not OpCode o)continue;ushort v=(ushort)o.Value;if(v<256)One[v]=o;else if((v&0xff00)==0xfe00)Two[v&255]=o;}}
 public static int Run(string root){
  var dir=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","hhk-candidates");var dll=Path.Combine(dir,"Calculation.dll");if(!File.Exists(dll)){Console.Error.WriteLine("Calculation.dll not found.");return 62;}
  AssemblyLoadContext.Default.Resolving+=(c,n)=>{foreach(var d in new[]{dir,Path.GetFullPath(Path.Combine(root,"..","selection")),root}){var p=Path.Combine(d,n.Name+".dll");if(File.Exists(p))try{return c.LoadFromAssemblyPath(p);}catch{}}return null;};
  try{var a=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);var t=a.GetType("Bitzer.CalculationHHK",true)!;var m=t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static).First(x=>x.Name=="CalculateSingle");var il=m.GetMethodBody()!.GetILAsByteArray()!;Console.WriteLine($"TARGET {t.FullName}.{m.Name}; il_bytes={il.Length}");
   int p=0;while(p<il.Length){int off=p;OpCode op=il[p++]==0xfe?Two[il[p++]]:One[il[p-1]];object? val=null;int n=Size(op.OperandType,il,p);if(n<0)break;
    try{if(op.OperandType is OperandType.InlineMethod or OperandType.InlineField or OperandType.InlineType or OperandType.InlineTok){int tok=BitConverter.ToInt32(il,p);var x=m.Module.ResolveMember(tok,t.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);val=(x?.DeclaringType?.FullName??"")+"."+x?.Name;}else if(op.OperandType==OperandType.InlineString)val=m.Module.ResolveString(BitConverter.ToInt32(il,p));else if(op.OperandType==OperandType.ShortInlineI)val=(sbyte)il[p];else if(op.OperandType==OperandType.InlineI)val=BitConverter.ToInt32(il,p);else if(op.OperandType==OperandType.InlineI8)val=BitConverter.ToInt64(il,p);else if(op.OperandType==OperandType.ShortInlineR)val=BitConverter.ToSingle(il,p);else if(op.OperandType==OperandType.InlineR)val=BitConverter.ToDouble(il,p);}catch{}
    var s=val?.ToString()??"";if(IsRelevant(s)||IsConst(op))Console.WriteLine($"IL_{off:X4}: {op.Name} {s}");p+=n;}
   Console.WriteLine("CalculationHHK.CalculateSingle IL sequence: complete");Console.WriteLine("Safety: IL metadata only; no method invoked, database, HTTP, config values, services, or calculation.");return 0;
  }catch(Exception e){Console.Error.WriteLine($"{e.GetType().Name}: {e.Message}");return 63;}
 }
 static bool IsRelevant(string s)=>!string.IsNullOrEmpty(s) && (s.StartsWith("Bitzer.",StringComparison.OrdinalIgnoreCase) || s.StartsWith("BitzerRemote.",StringComparison.OrdinalIgnoreCase) || new[]{"i_CC","i_Method","i_OP","i_FCMV","hhkDesign","Input_","Output_"}.Any(x=>s.Contains(x,StringComparison.OrdinalIgnoreCase)));
 static bool IsConst(OpCode o)=>o.Name!=null&&(o.Name.StartsWith("ldc.i4",StringComparison.Ordinal)||o.Name=="ldc.i8"||o.Name=="ldc.r4"||o.Name=="ldc.r8");
 static int Size(OperandType o,byte[]b,int p)=>o switch{OperandType.InlineNone=>0,OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar=>1,OperandType.InlineVar=>2,OperandType.InlineI or OperandType.InlineBrTarget or OperandType.InlineField or OperandType.InlineMethod or OperandType.InlineSig or OperandType.InlineString or OperandType.InlineTok or OperandType.InlineType or OperandType.ShortInlineR=>4,OperandType.InlineI8 or OperandType.InlineR=>8,OperandType.InlineSwitch=>4+4*BitConverter.ToInt32(b,p),_=>-1};
}