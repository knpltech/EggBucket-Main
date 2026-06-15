#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

MODES=("user" "admin" "delivery")

for MODE in "${MODES[@]}"; do
  echo ""
  echo "=================================================="
  echo "🚀 BUILDING APP IN MODE: ${MODE}"
  echo "=================================================="
  echo ""

  # 1. Update APP_MODE in src/App.tsx (macOS compatible sed)
  sed -i '' -E 's/const APP_MODE:[[:space:]]*"user"[[:space:]]*\|[[:space:]]*"admin"[[:space:]]*\|[[:space:]]*"delivery"[[:space:]]*=[[:space:]]*"[a-z]+";/const APP_MODE: "user" | "admin" | "delivery" = "'"${MODE}"'";/' src/App.tsx

  # 2. Compile React App (clean dist first)
  echo "Compiling web assets..."
  rm -rf dist
  npm run build

  # 3. Sync web assets and plugins to the corresponding module with APP_TYPE environment variable
  echo "Syncing Capacitor assets and plugins to ${MODE} module..."
  mv "android/${MODE}" "android/app"
  APP_TYPE="${MODE}" npx cap sync android
  mv "android/app" "android/${MODE}"

  # 4. Compile the signed release APK and AAB (clean gradle task first to bypass caching)
  echo "Compiling signed release APK & AAB..."
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  cd android
  ./gradlew ":${MODE}:clean"
  ./gradlew ":${MODE}:assembleRelease"
  ./gradlew ":${MODE}:bundleRelease"
  cd ..

  echo "✅ Done building for ${MODE}!"
done

echo ""
echo "=================================================="
echo "🎉 ALL THREE APPS BUILT AND SIGNED SUCCESSFULLY!"
echo "=================================================="
echo ""
