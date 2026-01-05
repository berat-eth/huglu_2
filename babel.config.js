module.exports = function(api) {
  // Cache yapılandırması - forever() kullanarak çakışmayı önle
  api.cache.forever();
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // TÜM ortamlarda console.log, console.info, console.debug kaldır
      // Sadece console.error ve console.warn kalır (kritik hatalar için)
      [
        'transform-remove-console',
        { 
          exclude: ['error', 'warn'] // Sadece error ve warn logları kalır
        }
      ],
    ],
  };
};
