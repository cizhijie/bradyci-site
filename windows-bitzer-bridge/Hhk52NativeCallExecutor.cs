using System.Runtime.InteropServices;

namespace Brady.BitzerBridge;

internal sealed record Hhk52NativeCallResult(
    int VendorCode,
    string Type1,
    string Type2,
    Hhk52DesignData Data,
    int Hint1,
    int Hint2,
    string Error
);

internal static class Hhk52NativeCallExecutor
{
    internal static Hhk52NativeCallResult Execute(
        Hhk52CopyDesignAbi.CopyDesign copyDesign,
        Hhk52CopyDesignInputs input)
    {
        var type1 = Marshal.AllocHGlobal(Hhk52CopyDesignAbi.TypeBufferChars);
        var type2 = Marshal.AllocHGlobal(Hhk52CopyDesignAbi.TypeBufferChars);
        var error = Marshal.AllocHGlobal(Hhk52CopyDesignAbi.ErrorBufferChars);

        try
        {
            Zero(type1, Hhk52CopyDesignAbi.TypeBufferChars);
            Zero(type2, Hhk52CopyDesignAbi.TypeBufferChars);
            Zero(error, Hhk52CopyDesignAbi.ErrorBufferChars);

            var sizeType1 = Hhk52CopyDesignAbi.TypeBufferChars;
            var sizeType2 = Hhk52CopyDesignAbi.TypeBufferChars;
            var sizeError = Hhk52CopyDesignAbi.ErrorBufferChars;
            var data = new Hhk52DesignData();
            var hint1 = 0;
            var hint2 = 0;

            var code = copyDesign(
                input.RefrigerantPath,
                input.NotePath,
                input.Flags,
                input.Series,
                input.Mode,
                input.Type,
                input.Cc,
                input.Refrigerant,
                input.RequiredCapacity,
                input.EvaporatingTempC,
                input.CondensingTempC,
                input.SuctionOrSuperheat,
                input.LiquidOrSubcooling,
                input.UsefulSuperheatK,
                input.Net,
                input.Ds,
                input.OperatingVoltageV,
                input.FrequencyInverter,
                input.FrequencyHz,
                input.InverterSupplyVoltageV,
                input.InverterSupplyFrequencyHz,
                input.ReservedMaxOutputVoltage,
                input.OperatingMode,
                input.CapacityControlPercent,
                type1, ref sizeType1,
                type2, ref sizeType2,
                ref data,
                ref hint1, ref hint2,
                error, ref sizeError);

            return new(
                code,
                ReadAnsi(type1, Hhk52CopyDesignAbi.TypeBufferChars),
                ReadAnsi(type2, Hhk52CopyDesignAbi.TypeBufferChars),
                data,
                hint1,
                hint2,
                ReadAnsi(error, Hhk52CopyDesignAbi.ErrorBufferChars));
        }
        finally
        {
            Marshal.FreeHGlobal(type1);
            Marshal.FreeHGlobal(type2);
            Marshal.FreeHGlobal(error);
        }
    }

    private static void Zero(IntPtr pointer, int length)
    {
        for (var i = 0; i < length; i++)
            Marshal.WriteByte(pointer, i, 0);
    }

    private static string ReadAnsi(IntPtr pointer, int capacity)
    {
        var bytes = new byte[capacity];
        Marshal.Copy(pointer, bytes, 0, capacity);
        var length = Array.IndexOf(bytes, (byte)0);
        if (length < 0) length = capacity;
        return System.Text.Encoding.Default.GetString(bytes, 0, length).Trim();
    }
}
