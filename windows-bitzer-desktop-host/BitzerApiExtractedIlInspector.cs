using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.Loader;
namespace Brady.BitzerDesktopHost;

internal static class BitzerApiExtractedIlInspector
{
 static readonly Dictionary<short,OpCode> Ops=typeof(OpCodes).GetFields(BindingFlags.Public|BindingFlags.Static).Where(f=>f.FieldType==typeof(OpCode)).Select(f=>(OpCode)f.GetValue(null)!).ToDictionary(o=>o.Value);
 public static int Run(string root)
 {
  var dll=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","BITZER_API.dll");
  if(!File.Exists(dll)){Console.Error.WriteLine("Extracted BITZER_API.dll not found; run --copy-bitzer-api-payload first.");return 53;}
  AssemblyLoadContext.Default.Resolving+=(ctx,n)=>{foreach(var dir in new[]{Path.GetDirectoryName(dll)!,Path.GetFullPath(Path.Combine(root,"..","selection")),root}){var p=Path.Combine(dir,n.Name+".dll");if(File.Exists(p))try{return ctx.LoadFromAssemblyPath(p);}catch{}}return null;};
  try{
   var asm=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);
   var types=SafeTypes(asm).Where(t=>t.FullName?.Contains("CalculationHHK",StringComparison.OrdinalIgnoreCase)==true).ToArray();
   Console.WriteLine($"CalculationHHK types={types.Length}");
   foreach(var t in types){Console.WriteLine("TYPE "+t.FullName);foreach(var m in t.GetMethods(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly).Where(x=>x.Name.Contains("CalculateSingle",StringComparison.OrdinalIgnoreCase)))Dump(m);}
   Console.WriteLine("Extracted BITZER API HHK IL inspection: complete");Console.WriteLine("Safety: reflection/IL only; no method invoked, database, HTTP, config values, services, or calculation.");return 0;
  }catch(Exception e){Console.Error.WriteLine($"{e.GetType().Name}: {e.Message}");return 54;}
 }
 static void Dump(MethodInfo m){Console.WriteLine("METHOD "+m);var il=m.GetMethodBody()?.GetILAsByteArray();if(il==null)return;int i=0;while(i<il.Length){int off=i;OpCode op;byte b=il[i++];if(b==0xfe){if(i>=il.Length)break;op=Ops[(short)(0xfe00|il[i++])];}else op=Ops[b];object? val=null;try{switch(op.OperandType){case OperandType.InlineNone:break;case OperandType.ShortInlineI:val=(sbyte)il[i++];break;case OperandType.InlineI:val=BitConverter.ToInt32(il,i);i+=4;break;case OperandType.InlineI8:val=BitConverter.ToInt64(il,i);i+=8;break;case OperandType.ShortInlineR:val=BitConverter.ToSingle(il,i);i+=4;break;case OperandType.InlineR:val=BitConverter.ToDouble(il,i);i+=8;break;case OperandType.ShortInlineVar:val=il[i++];break;case OperandType.InlineVar:val=BitConverter.ToUInt16(il,i);i+=2;break;case OperandType.ShortInlineBrTarget:val=(sbyte)il[i++]+i;break;case OperandType.InlineBrTarget:val=BitConverter.ToInt32(il,i)+i+4;i+=4;break;case OperandType.InlineString:val=m.Module.ResolveString(BitConverter.ToInt32(il,i));i+=4;break;case OperandType.InlineField:case OperandType.InlineMethod:case OperandType.InlineType:case OperandType.InlineTok:case OperandType.InlineSig:int tok=BitConverter.ToInt32(il,i);i+=4;try{val=m.Module.ResolveMember(tok,m.DeclaringType?.GetGenericArguments(),m.IsGenericMethod?m.GetGenericArguments():null);}catch{val=$"token 0x{tok:X8}";}break;case OperandType.InlineSwitch:int n=BitConverter.ToInt32(il,i);i+=4;var basePos=i+4*n;var a=new int[n];for(int k=0;k<n;k++){a[k]=basePos+BitConverter.ToInt32(il,i);i+=4;}val=string.Join(",",a.Select(x=>$"IL_{x:X4}"));break;}}catch{break;}
    var s=val?.ToString()??"";if(s.Contains("i_CC")||s.Contains("i_Method")||s.Contains("i_OP")||s.Contains("i_FCMV")||s.Contains("hhkDesign",StringComparison.OrdinalIgnoreCase)||s.Contains("HHK",StringComparison.OrdinalIgnoreCase)||op.Name?.StartsWith("ldc.i4")==true)Console.WriteLine($"  IL_{off:X4}: {op.Name} {s}");
   }}
 static IEnumerable<Type> SafeTypes(Assembly a){try{return a.GetTypes();}catch(ReflectionTypeLoadException e){return e.Types.OfType<Type>();}}
}