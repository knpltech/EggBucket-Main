import type { CapacitorConfig } from '@capacitor/cli';

const appType = process.env.APP_TYPE || 'user';

let appId = 'com.eggbucket.user';
let appName = 'Egg Bucket';

if (appType === 'admin') {
  appId = 'com.eggbucket.admin';
  appName = 'Egg Bucket Admin';
} else if (appType === 'delivery') {
  appId = 'com.eggbucket.delivery';
  appName = 'Egg Bucket Delivery';
}

const config: CapacitorConfig = {
  appId: appId,
  appName: appName,
  webDir: 'dist',
  plugins: {
    StatusBar: {
      backgroundColor: '#00000000',
      overlaysWebView: true,
    },
  },
};

export default config;
