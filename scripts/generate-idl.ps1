# Generate IDL without requiring admin privileges
# This script sets the HOME environment variable (required on Windows)
# and runs anchor idl build to generate the IDL

Write-Host "Generating IDL for forge program..." -ForegroundColor Cyan

# Set HOME environment variable (Windows uses USERPROFILE)
$env:HOME = $env:USERPROFILE

# Generate IDL
anchor idl build -p forge -o target/idl/forge.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ IDL generated successfully at target/idl/forge.json" -ForegroundColor Green
    
    # Verify IDL contains all instructions
    if (Test-Path "target/idl/forge.json") {
        $idl = Get-Content "target/idl/forge.json" | ConvertFrom-Json
        $instructions = $idl.instructions.name
        Write-Host "`nFound $($instructions.Count) instructions:" -ForegroundColor Cyan
        foreach ($inst in $instructions) {
            Write-Host "  - $inst" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "`n❌ IDL generation failed" -ForegroundColor Red
    exit 1
}

