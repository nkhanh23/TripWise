/**
 * Native map configuration stays in Expo config so development builds receive
 * the Android Maps SDK manifest entry without putting a server Places key in
 * the bundle. The restricted Maps SDK key is supplied only by the local/build
 * environment when configured.
 */
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    [
      'react-native-maps',
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        ? { androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY }
        : {},
    ],
  ],
});
