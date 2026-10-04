using System.Buffers.Binary;
using System.Text;
namespace Brady.BitzerDesktopHost;

internal static class DotnetSingleFileBundleInspector
{
    // .NET single-file bundle signature used by the host bundle format.
    static readonly byte[] Signature={0x8b,0x12,0x02,0xb9,0x6a,0x61,0x20,0x38,0x72,0x7b,0x93,0x02,0x14,0xd7,0xa0,0x32,0x13,0xf5,0xb9,0xe6,0xef,0xae,0x33,0x18,0xee,0x3b,0x2d,0xce,0x24,0xb3,0x6a,0xae};

    public static int Run(string root)
    {
        var exe=Path.GetFullPath(Path.Combine(root,"..","selection","BITZER_API.exe"));
        if(!File.Exists(exe)){Console.Error.WriteLine("BITZER_API.exe not found.");return 46;}
        var d=File.ReadAllBytes(exe);
        var sig=Find(d,Signature);
        Console.WriteLine("BITZER .NET single-file bundle inspection:");
        Console.WriteLine($"  file_size={d.LongLength}");
        Console.WriteLine(sig<0?"  bundle_signature=not_found":$"  bundle_signature=0x{sig:X}");
        if(sig>=0)
        {
            // Search near the signature for plausible little-endian manifest offsets.
            var candidates=new SortedSet<long>();
            var a=Math.Max(0,sig-64); var b=Math.Min(d.Length-8,sig+64);
            for(int i=a;i<=b;i++)
            {
                long v=BinaryPrimitives.ReadInt64LittleEndian(d.AsSpan(i,8));
                if(v>0&&v<d.LongLength) candidates.Add(v);
            }
            foreach(var off in candidates.Take(12)) Console.WriteLine($"  nearby_offset_candidate=0x{off:X}");
        }
        foreach(var marker in new[]{"BITZER_API.dll","BITZER_API.deps.json","BITZER_API.runtimeconfig.json"})
        {
            var x=Find(d,Encoding.UTF8.GetBytes(marker));
            Console.WriteLine($"  {marker}={(x<0?"not_found":$"0x{x:X}")}");
        }
        Console.WriteLine("BITZER .NET single-file bundle inspection: complete");
        Console.WriteLine("Safety: read-only file-format inspection; no payload execution, extraction, database, HTTP, config values, services, or calculation.");
        return 0;
    }
    static int Find(byte[] d,byte[] q)
    {
        for(int i=0;i<=d.Length-q.Length;i++){int j=0;for(;j<q.Length&&d[i+j]==q[j];j++);if(j==q.Length)return i;}return -1;
    }
}
