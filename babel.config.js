module.exports = function(api) {
  api.cache(true);
  const isProduction = api.env('production');
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Production'da console.log'ları kaldır (error ve warn hariç)
      isProduction && [
        'transform-remove-console',
        { exclude: ['error', 'warn'] }
      ],
    ].filter(Boolean),
    env: {
      production: {
        plugins: [
          'react-native-reanimated/plugin',
          [
            'transform-remove-console',
            { exclude: ['error', 'warn'] }
          ],
        ],
      },
      development: {
        plugins: ['react-native-reanimated/plugin'],
      },
    },
  };
};
