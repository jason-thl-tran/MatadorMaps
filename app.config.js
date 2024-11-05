
import 'dotenv/config';

export default () => ({
  expo: {
    name: "MatadorMaps",
    slug: "MatadorMaps",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.jasotran.MatadorMaps"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-router"
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.RN_MAPBOX_TOKEN 
        }
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Show current location on map."
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "e7c55649-96e2-4c4f-be97-9e5ddb318be7"
      },
      secretKey: process.env.SECRET_KEY, 
    },
  },
});
