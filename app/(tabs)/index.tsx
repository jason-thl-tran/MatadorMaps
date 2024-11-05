import { Image, StyleSheet, Platform, View } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN ?? null;

Mapbox.setAccessToken(process.env.RN_MAPBOX_TOKEN || '');




const App = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      let permissionStatus = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus.status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords); 
    })();
  }, []);

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        {location && (
          <Mapbox.MapView style={styles.map}>
            <Mapbox.Camera
              zoomLevel={14}
              centerCoordinate={[location.longitude, location.latitude]}
            />
          </Mapbox.MapView>
        )}
      </View>
    </View>
  );
};
export default App;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    height: '100%',
    width: '100%',
  },
  map: {
    flex: 1
  }
});