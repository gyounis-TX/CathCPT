import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumeninnovations.cathcpt',
  appName: 'CathCPT',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow connections to Firebase for Pro mode sync
    allowNavigation: [
      'https://*.firebaseapp.com',
      'https://*.googleapis.com',
      'https://*.firebaseio.com'
    ]
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'CathCPT'
  },
  plugins: {
    Preferences: {},
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['apple.com', 'google.com']
    }
  }
};

export default config;
