using System.Buffers.Binary;
using System.Text;
namespace Brady.BitzerDesktopHost;
internal static class DotnetBundlePayloadCopy
{
 static readonly byte[] Sig={0x8b,0x12,0x02,0xb9,0x6a,0x61,0x20,0x38,0x72,0x7b,0x93,0x02,0x14,0xd7,0xa0,0x32,0x13,0xf5,0xb9,0xe6,0xef,0xae,0x33,0x18,0xee,0x3b,0x2d,0xce,0x24,0xb3,0x6a,0xae};
 public static int Run(string root)
 {
  var exe=Path.GetFullPath(Path.Combine(root,"..","selection","BITZER_API.exe"));var d=File.ReadAllBytes(exe);int s=Find(d,Sig);
  if(s<8){Console.Error.WriteLine("bundle signature/header pointer not found.");return 47;}
  long h=BinaryPrimitives.ReadInt64LittleEndian(d.AsSpan(s-8,8));if(h<=0||h>=d.LongLength){Console.Error.WriteLine("invalid bundle header.");return 48;}
  using var ms=new MemoryStream(d,false);using var br=new BinaryReader(ms,Encoding.UTF8,false);ms.Position=h;
  uint major=br.ReadUInt32(),minor=br.ReadUInt32();int count=br.ReadInt32();Console.WriteLine($"bundle_header=0x{h:X}; version={major}.{minor}; files={count}");
  if(count<1||count>10000)return 49; ReadStr(br); if(major>=2){br.ReadInt64();br.ReadInt64();br.ReadInt64();br.ReadInt64();br.ReadUInt64();}
  for(int i=0;i<count;i++){long off=br.ReadInt64(),size=br.ReadInt64(),zip=major>=6?br.ReadInt64():0;byte type=br.ReadByte();string path=ReadStr(br);
   if(!path.Equals("BITZER_API.dll",StringComparison.OrdinalIgnoreCase))continue;
   Console.WriteLine($"payload={path}; offset=0x{off:X}; size={size}; compressed={zip}; type={type}");
   if(zip!=0){Console.Error.WriteLine("compressed payload: stopped.");return 50;}if(off<0||size<=0||size>int.MaxValue||off+size>d.LongLength)return 51;
   var dir=Path.Combine(Path.GetTempPath(),"brady-bitzer-inspect");Directory.CreateDirectory(dir);var dst=Path.Combine(dir,"BITZER_API.dll");
   using(var fs=File.Create(dst))fs.Write(d,(int)off,(int)size);Console.WriteLine("copied_payload="+dst);
   Console.WriteLine("Safety: copied embedded bytes only; payload not loaded/executed; no database, HTTP, config values, services, or calculation.");return 0;}
  Console.Error.WriteLine("BITZER_API.dll manifest entry not found.");return 52;
 }
 static string ReadStr(BinaryReader br){int n=0,shift=0;byte b;do{b=br.ReadByte();n|=(b&127)<<shift;shift+=7;if(shift>28)throw new InvalidDataException();}while((b&128)!=0);return Encoding.UTF8.GetString(br.ReadBytes(n));}
 static int Find(byte[] d,byte[] q){for(int i=0;i<=d.Length-q.Length;i++){int j=0;for(;j<q.Length&&d[i+j]==q[j];j++);if(j==q.Length)return i;}return -1;}
}