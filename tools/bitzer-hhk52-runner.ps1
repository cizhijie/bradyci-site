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

# Fail closed before any native invocation. The JS ABI metadata is the source of
# truth; this runner will only call the DLL after its complete native declaration
# has been reviewed and pinned here.
$required=@("HHK52.DLL","HHK52A.DLL","HHK52B.DLL","HHK52C.DLL")
$missing=@()
foreach($f in $required){if(!(Test-Path (Join-Path $dllDir $f))){$missing+=$f}}
if($missing.Count -gt 0){throw ("missing BITZER dependencies: "+($missing -join ", "))}

$arch=[IntPtr]::Size*8
$result=[ordered]@{
 ok=$false
 status="native_signature_not_enabled"
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
  signatureStatus="blocked_until_full_native_signature_is_verified"
 }
 message="Bridge preflight passed. Native Design() invocation remains fail-closed until the complete vendor signature is pinned."
}
$result|ConvertTo-Json -Depth 8 -Compress
