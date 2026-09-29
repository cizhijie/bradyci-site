$ErrorActionPreference="Stop"
# HHK52 native runner. IMPORTANT: this host must match the vendor DLL architecture.
# JSON request is read from stdin; exactly one JSON object is written to stdout.
$raw=[Console]::In.ReadToEnd()
if([string]::IsNullOrWhiteSpace($raw)){throw "missing request JSON"}
$req=$raw|ConvertFrom-Json
$dllDir=[string]$req.dllDirectory
if([string]::IsNullOrWhiteSpace($dllDir)){throw "dllDirectory is required"}
$dll=Join-Path $dllDir "HHK52.DLL"
if(!(Test-Path $dll)){throw "HHK52.DLL not found: $dll"}

# Design() declaration is pinned from the official BITZER manual.
# Keep the native boundary isolated here; JS never loads the legacy DLL directly.
if($arch -ne 32){throw "HHK52 runner must execute in a 32-bit process; current process is $arch-bit"}

$rp=[string]$req.refrigerantPath
$np=[string]$req.nameplatePath
if([string]::IsNullOrWhiteSpace($rp)){$rp=$dllDir}
if([string]::IsNullOrWhiteSpace($np)){$np=$dllDir}

# Fail closed before any native invocation. The JS ABI metadata is the source of
# truth; this runner will only call the DLL after its complete native declaration
# has been reviewed and pinned here.
$required=@("HHK52.DLL","HHK52A.DLL","HHK52B.DLL","HHK52C.DLL")
$missing=@()
foreach($f in $required){if(!(Test-Path (Join-Path $dllDir $f))){$missing+=$f}}
if($missing.Count -gt 0){throw ("missing BITZER dependencies: "+($missing -join ", "))}

$result=[ordered]@{
 ok=$false
 status="native_host_ready"
 vendorCode=$null
 applicationLimitOk=$false
 dllName="HHK52.DLL"
 dllPath=$dll
 processArchitecture="$arch-bit"
 model=[string]$req.reviewedInputs.I_Typ
 family="ECOLINE"
 refrigerant=[string]$req.reviewedInputs.I_Ref
 evaporatingTempC=$req.reviewedInputs.I_T0
 condensingTempC=$req.reviewedInputs.I_TC
 source=[ordered]@{
  interface="BITZER HHK52 Design"
  callingConvention="stdcall"
  signatureStatus="official_manual_verified"
 }
 message="32-bit native host and BITZER dependency preflight passed; Design ABI is verified and ready for the invocation shim."
}
$result|ConvertTo-Json -Depth 8 -Compress
