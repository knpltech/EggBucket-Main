$AppTsxPath = "src\App.tsx"
$BundleOutputDir = "..\bundles"
if (!(Test-Path $BundleOutputDir)) {
    New-Item -ItemType Directory -Force -Path $BundleOutputDir
}

# Set JAVA_HOME to Android Studio's bundled JDK
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Set ANDROID_HOME
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

$Modes = @("user", "admin", "delivery")

foreach ($Mode in $Modes) {
    Write-Host "`n--- Building Bundle for mode: $Mode ---"

    # Update App.tsx
    $AppTsxContent = Get-Content $AppTsxPath -Raw
    $AppTsxContent = $AppTsxContent -replace 'const APP_MODE:\s*"user"\s*\|\s*"admin"\s*\|\s*"delivery"\s*=\s*"[a-z]+";', "const APP_MODE: `"user`" | `"admin`" | `"delivery`" = `"$Mode`";"
    Set-Content -Path $AppTsxPath -Value $AppTsxContent

    # Set APP_TYPE for capacitor.config.ts
    $env:APP_TYPE = $Mode

    # Build vite project
    Write-Host "Running npm run build..."
    npm run build

    # Sync capacitor by temporarily renaming the module to 'app'
    Write-Host "Syncing Capacitor assets to $Mode module..."
    # Ensure any existing 'app' folder is removed first
    if (Test-Path "android\app") { Remove-Item -Path "android\app" -Recurse -Force }

    if (Test-Path "android\$Mode") {
        Rename-Item -Path "android\$Mode" -NewName "app"
        try {
            npx cap copy android
        } finally {
            Rename-Item -Path "android\app" -NewName "$Mode"
        }
    } else {
        Write-Host "ERROR: Module folder android\$Mode not found!"
        continue
    }

    # Build AAB
    Write-Host "Building AAB for $Mode with Gradle..."
    Push-Location android
    # Build the specific module's debug bundle
    .\gradlew ":$($Mode):bundleDebug"
    Pop-Location

    # Copy AAB to output directory
    $AabPath = "android\$Mode\build\outputs\bundle\debug\$Mode-debug.aab"
    if (!(Test-Path $AabPath)) {
        # Try alternative path
        $AabPath = "android\$Mode\build\outputs\bundle\debug\app-debug.aab"
    }

    if (Test-Path $AabPath) {
        Copy-Item -Path $AabPath -Destination "$BundleOutputDir\EggBucket-$Mode.aab" -Force
        Write-Host "SUCCESS: Built EggBucket-$Mode.aab"
    } else {
        Write-Host "ERROR: Failed to find AAB at $AabPath"
        Get-ChildItem -Path "android\$Mode\build\outputs\bundle" -Filter "*.aab" -Recurse | ForEach-Object {
            Write-Host "Found AAB at: $($_.FullName)"
        }
    }
}
