using System.Runtime.InteropServices;

namespace Brady.BitzerBridge;

// HHK52 result structure staging area.
// Numeric members are intentionally limited to fields already mapped from the official interface.
// Do not change packing or append guessed fields.
[StructLayout(LayoutKind.Sequential)]
internal struct Hhk52DesignData
{
    public int O_OP1, O_OP2;
    public int O_FCF1, O_FCF2;
    public int O_FCFmin1, O_FCFmin2;
    public int O_FCFmax1, O_FCFmax2;
    public double O_Q1, O_Q2;
    public double O_Qmin1, O_Qmin2;
    public double O_Qmax1, O_Qmax2;
    public double O_QU1, O_QU2;
    public double O_QN1, O_QN2;
    public double O_QC1, O_QC2;
    public double O_QH1, O_QH2;
    public double O_P1, O_P2;
    public double O_I1, O_I2;
    public double O_COS1, O_COS2;
    public double O_E1, O_E2;
    public double O_EN1, O_EN2;
    public double O_VG1, O_VG2;
    public double O_M1, O_M2;
    public double O_TH1, O_TH2;
    public double O_PC1, O_PC2;
}
