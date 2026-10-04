using System.Buffers.Binary;
using System.Text;
namespace Brady.BitzerDesktopHost;
internal static class BitzerBundleHhkLocator
{
 static readonly byte[] Sig={0x8b,0x12,0x02,0xb9,0x6a,0x61,0x20,0x38,0x72,0x7b,0x93,0x02,0x14,0xd7,0xa0,0x32,0x13,0xf5,0xb9,0xe6,0xef,0xae,0x33,0x18,0xee,0x3b,0x2d,0xce,0x24,0xb3,0x6a,0xae};
 static readonly string[] Marks={"CalculationHHK","hhkDesign_Invoke","HHKInputsDto"};
 public static int Run(string root){
  var exe=Path.GetFullPath(Path.Combine(root,"..","selection","BITZER_API.exe"));var d=File.ReadAllBytes(exe);int s=Find(d,Sig);if(s<8)return 55;
  long h=BinaryPrimitives.ReadInt64LittleEndian(d.AsSpan(s-8,8));using var ms=new MemoryStream(d,false);using var br=new BinaryReader(ms,Encoding.UTF8,false);ms.Position=h;
  uint major=br.ReadUInt32(),minor=br.ReadUInt32();int count=br.ReadInt32();ReadStr(br);if(major>=2){br.ReadInt64();br.ReadInt64();br.ReadInt64();br.ReadInt64();br.ReadUInt64();}
  Console.WriteLine($"BITZER bundle HHK locator: version={major}.{minor}; files={count}");int hits=0;
  for(int i=0;i<count;i++){long off=br.ReadInt64(),size=br.ReadInt64(),zip=major>=6?br.ReadInt64():0;byte type=br.ReadByte();string path=ReadStr(br);
   if(!path.EndsWith(".dll",StringComparison.OrdinalIgnoreCase)||zip!=0||off<0||size<=0||off+size>d.LongLength||size>int.MaxValue)continue;
   var payload=new byte[(int)size];Buffer.BlockCopy(d,(int)off,payload,0,(int)size);var found=Marks.Where(m=>Has(payload,Encoding.ASCII.GetBytes(m))||Has(payload,Encoding.Unicode.GetBytes(m))).ToArray();
   if(found.Length==0)continue;hits++;Console.WriteLine($"MATCH {path} | offset=0x{off:X} size={size} type={type} | {string.Join(", ",found)}");
   var dir=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect","hhk-candidates");Directory.CreateDirectory(dir);var dst=Path.Combine(dir,Path.GetFileName(path));File.WriteAllBytes(dst,payload);Console.WriteLine("  copied="+dst);
  }
  Console.WriteLine($"BITZER bundle HHK locator: complete; matches={hits}");Console.WriteLine("Safety: manifest scan/copy only; no payload loaded/executed, database, HTTP, config values, services, or calculation.");return 0;
 }
 static bool Has(byte[] d,byte[] q)=>d.AsSpan().IndexOf(q)>=0;
 static string ReadStr(BinaryReader br){int n=0,shift=0;byte b;do{b=br.ReadByte();n|=(b&127)<<shift;shift+=7;}while((b&128)!=0);return Encoding.UTF8.GetString(br.ReadBytes(n));}
 static int Find(byte[]d,byte[]q){for(int i=0;i<=d.Length-q.Length;i++){int j=0;for(;j<q.Length&&d[i+j]==q[j];j++);if(j==q.Length)return i;}return -1;}
}