using System.Text;
namespace Brady.BitzerDesktopHost;

internal static class BitzerApiHhkContextScanner
{
    static readonly string[] Needles={"i_CC","i_Method","i_OP","i_FCMV","CalculationHHK","hhkDesign_Invoke"};
    public static int Run(string root)
    {
        var exe=Path.GetFullPath(Path.Combine(root,"..","selection","BITZER_API.exe"));
        if(!File.Exists(exe)){Console.Error.WriteLine("BITZER_API.exe not found.");return 44;}
        var data=File.ReadAllBytes(exe);
        Console.WriteLine("BITZER API HHK context scan:");
        foreach(var n in Needles)
        {
            Console.WriteLine("TARGET "+n);
            Dump(data,Encoding.ASCII.GetBytes(n),n,false);
            Dump(data,Encoding.Unicode.GetBytes(n),n,true);
        }
        Console.WriteLine("BITZER API HHK context scan: complete");
        Console.WriteLine("Safety: read-only byte context scan; no execution, database, HTTP, services, config values, or calculation.");
        return 0;
    }
    static void Dump(byte[] d,byte[] q,string name,bool wide)
    {
        int from=0,count=0;
        while(count<12)
        {
            int at=Find(d,q,from); if(at<0)break;
            int radius=wide?240:160, a=Math.Max(0,at-radius), b=Math.Min(d.Length,at+q.Length+radius);
            var s=wide?Encoding.Unicode.GetString(d,a+(a%2),Math.Max(0,b-a-(a%2))):Encoding.ASCII.GetString(d,a,b-a);
            s=new string(s.Select(c=>char.IsControl(c)?' ':c).ToArray());
            Console.WriteLine($"  OFFSET 0x{at:X}: {s}");
            from=at+q.Length;count++;
        }
        if(count==0)Console.WriteLine("  not found in "+(wide?"UTF16":"ASCII"));
    }
    static int Find(byte[] d,byte[] q,int start)
    {
        for(int i=start;i<=d.Length-q.Length;i++){int j=0;for(;j<q.Length&&d[i+j]==q[j];j++);if(j==q.Length)return i;}return -1;
    }
}
