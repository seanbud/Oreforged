# Release Packaging Script
$ErrorActionPreference = "Stop"

Write-Output "Packaging OreForged Release..."

# 1. Clean & Build
Write-Output "  > Building UI..."
Push-Location ui
cmd /c pnpm install
cmd /c pnpm run build
if ($LASTEXITCODE -ne 0) { throw "UI Build failed" }
Pop-Location

Write-Output "  > Building Game..."
if (-not (Test-Path build)) { New-Item -ItemType Directory -Path build | Out-Null }
Push-Location build
cmake ..
if ($LASTEXITCODE -ne 0) { throw "CMake Configure failed" }
cmake --build . --config Release
if ($LASTEXITCODE -ne 0) { throw "Game Build failed" }
Pop-Location

# 2. Setup Release Folder
$releaseDir = "release"
if (Test-Path $releaseDir) { Remove-Item $releaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $releaseDir | Out-Null

# 3. Copy Executable
Write-Output "  > Copying executable..."
Copy-Item "build\bin\Release\OreForged.exe" -Destination $releaseDir

# 4. Copy UI
Write-Output "  > Copying UI resources..."
Copy-Item "ui\dist" -Destination "$releaseDir\ui" -Recurse

# 5. Copy WebView2 DLL (if exists)
if (Test-Path "build\bin\Release\WebView2Loader.dll") {
    Copy-Item "build\bin\Release\WebView2Loader.dll" -Destination $releaseDir
}

# 6. Create Zip (Using tar for better reliability)
Write-Output "  > Zipping..."
$zipPath = "OreForged_Windows.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

# Use tar -a to create a zip file (Windows 10+ native support)
# -a: Auto-detect compression based on extension (.zip)
# -c: Create
# -f: Filename
# -C: Change directory (so we don't include "release" parent folder)
tar -a -c -f $zipPath -C $releaseDir .

if (-not (Test-Path $zipPath)) { throw "Failed to create zip" }
Write-Output "Success! Created $zipPath"
