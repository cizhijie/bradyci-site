using System.Text;
namespace Brady.BitzerDesktopHost;

internal static class BitzerApiManagedPayloadScanner
{
    public static int Run(string root)
    {
        var selection=Path.GetFullPath(Path.Combine(root,"..","selection"));
        if(!Directory.Exists(selection)){Console.Error.WriteLine("selection directory not found.");return 45;}
        var markers=new[]{"CalculationHHK","<CalculateSingle>","hhkDesign_Invoke","HHKInputsDto"};
        var files=Directory.EnumerateFiles(selection,"*",SearchOption.TopDirectoryOnly)
            .Where(p=>p.EndsWith(".dll",StringComparison.OrdinalIgnoreCase)||p.EndsWith(".exe",StringComparison.OrdinalIgnoreCase)).ToArray();
        Console.WriteLine($"BITZER managed payload discovery: {files.Length} candidate(s)");
        foreach(var file in files)
        {
            byte[] data;try{data=File.ReadAllBytes(file);}catch{continue;}
            var found=markers.Where(m=>Contains(data,Encoding.ASCII.GetBytes(m))||Contains(data,Encoding.Unicode.GetBytes(m))).ToArray();
            if(found.Length>0)Console.WriteLine($"FILE {Path.GetFileName(file)} => {string.Join(", ",found)}");
        }
        Console.WriteLine("BITZER managed payload discovery: complete");
        Console.WriteLine("Safety: filenames and marker presence only; no execution, database, HTTP, config values, services, or calculation.");
        return 0;
    }
    static bool Contains(byte[] d,byte[] q)
    {
        for(int i=0;i<=d.Length-q.Length;i++){int j=0;for(;j<q.Length&&d[i+j]==q[j];j++);if(j==q.Length)return true;}return false;
    }
}
