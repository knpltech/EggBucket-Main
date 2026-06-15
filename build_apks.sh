#!/bin/bash
set -e

# Path to App.tsx
APP_TSX_PATH="src/App.tsx"
APK_OUTPUT_DIR="../apks"
mkdir -p "$APK_OUTPUT_DIR"

# Set JAVA_HOME to Android Studio's bundled JDK on macOS
if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    export PATH="$JAVA_HOME/bin:$PATH"
    echo "Using JDK from Android Studio: $JAVA_HOME"
fi

MODES=("user" "admin" "delivery")

for MODE in "${MODES[@]}"; do
    echo -e "\n--- Building APK for mode: $MODE ---"

    # Update App.tsx dynamically using Node.js via env variables to prevent shell escaping issues
    APP_TSX_PATH="$APP_TSX_PATH" MODE="$MODE" node -e '
        const fs = require("fs");
        const filePath = process.env.APP_TSX_PATH;
        const mode = process.env.MODE;
        let content = fs.readFileSync(filePath, "utf8");
        content = content.replace(/const APP_MODE:\s*"user"\s*\|\s*"admin"\s*\|\s*"delivery"\s*=\s*"[a-z]+";/, `const APP_MODE: "user" | "admin" | "delivery" = "${mode}";`);
        fs.writeFileSync(filePath, content);
    '
    echo "Updated App.tsx APP_MODE to: $MODE"

    # Set APP_TYPE for capacitor.config.ts
    export APP_TYPE="$MODE"

    # Build vite project
    echo "Running npm run build..."
    npm run build

    # Sync capacitor by temporarily renaming the module to 'app'
    echo "Syncing Capacitor assets to $MODE module..."
    if [ -d "android/app" ]; then
        rm -rf android/app
    fi

    if [ -d "android/$MODE" ]; then
        mv "android/$MODE" "android/app"
        
        # Run capacitor copy
        npx cap copy android
        
        # Rename it back
        mv "android/app" "android/$MODE"
    else
        echo "ERROR: Module folder android/$MODE not found!"
        continue
    fi

    # Build APK
    echo "Building APK for $MODE with Gradle..."
    cd android
    ./gradlew ":$MODE:assembleDebug"
    cd ..

    # Copy APK to output directory
    APK_PATH="android/$MODE/build/outputs/apk/debug/$MODE-debug.apk"
    if [ ! -f "$APK_PATH" ]; then
        # Try alternative path
        APK_PATH="android/$MODE/build/outputs/apk/debug/app-debug.apk"
    fi

    if [ -f "$APK_PATH" ]; then
        cp "$APK_PATH" "$APK_OUTPUT_DIR/EggBucket-$MODE.apk"
        echo "SUCCESS: Built EggBucket-$MODE.apk"
    else
        echo "ERROR: Failed to find APK at $APK_PATH"
        find "android/$MODE/build/outputs/apk" -name "*.apk"
    fi
done

# Reset App.tsx to user mode as a clean default state
APP_TSX_PATH="$APP_TSX_PATH" MODE="user" node -e '
    const fs = require("fs");
    const filePath = process.env.APP_TSX_PATH;
    const mode = process.env.MODE;
    let content = fs.readFileSync(filePath, "utf8");
    content = content.replace(/const APP_MODE:\s*"user"\s*\|\s*"admin"\s*\|\s*"delivery"\s*=\s*"[a-z]+";/, `const APP_MODE: "user" | "admin" | "delivery" = "${mode}";`);
    fs.writeFileSync(filePath, content);
'
echo "Reset App.tsx to user mode."
echo -e "\nAll APKs built successfully in: $APK_OUTPUT_DIR"
