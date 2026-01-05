const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Axios ve React Native için resolver ayarları
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs'];

// Bundle optimizasyonları
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      keep_classnames: false,
      keep_fnames: false,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Lazy loading için kritik - kodları inline eder
    },
  }),
};

// Bundle boyutunu azaltmak için
config.serializer = {
  ...config.serializer,
  createModuleIdFactory: () => {
    let nextId = 0;
    return () => nextId++;
  },
};

module.exports = config;
