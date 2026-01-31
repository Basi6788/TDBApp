import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uchihas.foundation',
  appName: 'TDB App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Ye line development me kaam ati hai, production me hatani par sakti hai agar assets local hain
    // hostname: 'tdb-67.vercel.app' 
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a1a", // Dark theme background
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      overlay: true, // Content status bar ke peeche jaye
    }
  }
};

export default config;

