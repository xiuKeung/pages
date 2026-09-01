import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shenzhenhome.toolbox',
  appName: '安家笔记',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    cleartext: false
  }
};

export default config;
