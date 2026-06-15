$AppTsxPath = "src\App.tsx"
$ApkOutputDir = "..\apks"
if (!(Test-Path $ApkOutputDir)) {
    New-Item -ItemType Directory -Force -Path $ApkOutputDir
}

# Set JAVA_HOME to Android Studio's bundled JDK
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Set ANDROID_HOME
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

$Modes = @("user", "admin", "delivery")

foreach ($Mode in $Modes) {
    Write-Host "`n--- Building for mode: $Mode ---"
    
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
    if (Test-Path "android\$Mode") {
        Rename-Item -Path "android\$Mode" -NewName "app"
        try {
            npx cap copy android
            # Ensure the capacitor.plugins.json is also synced to the specific module folder
            if (Test-Path "android\app\src\main\assets\capacitor.plugins.json") {
                Write-Host "Plugins synced successfully."
            }
        } finally {
            Rename-Item -Path "android\app" -NewName "$Mode"
        }
    } else {
        Write-Host "ERROR: Module folder android\$Mode not found!"
        continue
    }
    
    # Build APK
    Write-Host "Building APK for $Mode with Gradle..."
    Push-Location android
    # Build the specific module
    .\gradlew ":$($Mode):assembleDebug"
    Pop-Location
    
    # Copy APK to output directory
    $ApkPath = "android\$Mode\build\outputs\apk\debug\$Mode-debug.apk"
    if (!(Test-Path $ApkPath)) {
        # Try alternative path
        $ApkPath = "android\$Mode\build\outputs\apk\debug\app-debug.apk"
    }

    if (Test-Path $ApkPath) {
        Copy-Item -Path $ApkPath -Destination "$ApkOutputDir\EggBucket-$Mode.apk" -Force
        Write-Host "SUCCESS: Built EggBucket-$Mode.apk"
    } else {
        Write-Host "ERROR: Failed to find APK at $ApkPath"
        Get-ChildItem -Path "android\$Mode\build\outputs\apk" -Filter "*.apk" -Recurse | ForEach-Object {
            Write-Host "Found APK at: $($_.FullName)"
        }
    }
}
