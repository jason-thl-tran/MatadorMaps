import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, SafeAreaView, Animated, ActivityIndicator, TouchableOpacity, Text, TextInput, FlatList } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';

Mapbox.setAccessToken('');

const App = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true); //relocate
  const [scaleAnim] = useState(new Animated.Value(1));
  const [toggleView, setToggleView] = useState(false);
  const [togglePitch, setTogglePitch] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Feature[]>([]);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]); 
  const [mode, setMode] = useState<'walking' | 'driving'>('walking');
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [locationInfo, setLocationInfo] = useState<any>(null);
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  
  type DirectionStep = {
    maneuver: {
      instruction: string;
    };
  };
  type Feature = {
    id: string;
    place_name: string;
    geometry: {
      coordinates: [number, number];
    };
  };
  
  const [directions, setDirections] = useState<DirectionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  const predefinedPoints = [
    { id: '1', label: 'Library', coordinates: [-101.87573926275029, 33.58154049981214] as [number, number] },
    { id: '2', label: 'Sub', coordinates: [-101.87466170693581, 33.58159072944653] as [number, number] },
    { id: '3', label: 'URec', coordinates: [-101.88453622114933, 33.58315717954141] as [number, number] },
  ];

  const getDirections = async (coordinates: [number, number]) => {
    if (!location) return;

    try {
      const response = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${mode}/${location.longitude},${location.latitude};${coordinates[0]},${coordinates[1]}`,
        {
          params: {
            access_token: '',
            geometries: 'geojson',
            steps: true, 
          },
        }
      );
      console.log('Route data:', response.data); 
      setRoute(response.data.routes[0].geometry.coordinates); 
      setDirections(response.data.routes[0].legs[0].steps);
      setDuration(response.data.routes[0].duration); 
      setCurrentStepIndex(0); 
    } catch (error) {
      console.error('Error fetching directions:', error);
    }
  };

  const handleResultPress = async (coordinates: [number, number]) => {
    console.log('Selected coordinates:', coordinates);
    setDestination({ latitude: coordinates[1], longitude: coordinates[0] });
    const info = await getLocationInfo(coordinates);
    if (info) {
      setLocationInfo(info);
      setShowLocationInfo(true);
    }
    setSearch('');
    setSearchResults([]);
  };

  //need to fix this breaks directions
  const handleSearchBlur = async () => {
    //setSearchResults([]); 
    //setDirections([]); 
    
  };

  const getLocation = async () => {
    try {
      setLoading(true); 
      const permissionStatus = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus.status !== 'granted') {
        console.error('Location access denied');
        setLoading(false);
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
      resetCamera(currentLocation.coords); 
    } catch (error) {
      console.error('Error fetching location', error);
    } finally {
      setLoading(false); 
    }
  };

  const resetCamera = (coords: { latitude: number; longitude: number }) => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [coords.longitude, coords.latitude],
        zoomLevel: 17,
        animationDuration: 1000,
      });
    }
  };

  useEffect(() => {
    const watchLocation = async () => {
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, 
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation.coords);
          if (destination) {
            getDirections([destination.longitude, destination.latitude]);
          }
        }
      );
    };

    watchLocation();
    animateMarker();
  }, []);

  //doesnt work needs fixing
  const animateMarker = () => {
    Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 5, 
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1, 
            duration: 500,
            useNativeDriver: true,
          }),
        ])
    ).start();
  };

  const switchView = () => setToggleView(!toggleView);
  const switchPitch = () => setTogglePitch(!togglePitch);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'walking' ? 'driving' : 'walking'));
  };

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return; 
    }
  
    if (!location) {
      console.warn('Location not available');
      return; 
    }
  
    try {
      setLoading(true); 
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        {
          params: {
            access_token: '',
            proximity: `${location.longitude},${location.latitude}`, 
            limit: 5, 
          },
        }
      );
      console.log(response.data); // debug
      const features = response.data.features; 
      if (features && features.length) {
        setSearchResults(features); 
      } else {
        console.warn('No results found.');
        setSearchResults([]); 
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < directions.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleEndNavigation = () => {
    setDirections([]); 
    setRoute([]); 
    setDestination(null); 
  };

  const getLocationInfo = async (coordinates: [number, number]) => {
    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json`,
        {
          params: {
            access_token: '',
          },
        }
      );
      console.log('Location info:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching location info:', error);
      return null;
    }
  };

  const startDirections = async () => {
    if (destination) {
      await getDirections([destination.longitude, destination.latitude]);
      setShowLocationInfo(false);
    }
  };

  const renderPredefinedButtons = () => {
    return predefinedPoints.map((point) => (
      <TouchableOpacity
        key={point.id}
        style={styles.predefinedButton}
        onPress={() => handleResultPress(point.coordinates)}
      >
        <Text style={styles.predefinedButtonText}>{point.label}</Text>
      </TouchableOpacity>
    ));
  };

  const renderToggleButton = () => (
    <TouchableOpacity style={styles.searchButton} onPress={toggleMode}>
      <Ionicons
        name={mode === 'walking' ? 'walk' : 'car'}
        size={24}
        color="white"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safearea}>
      <View style={styles.page}>
        <View style={styles.container}>
          {loading && !location ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            location && (
              <Mapbox.MapView
                ref={mapRef}
                style={styles.map}
                compassEnabled={false}
                scaleBarEnabled={false}
                styleURL={
                  toggleView
                    ? 'mapbox://styles/jasotran/cm438wtuz002301rzbdpgh59n'
                    : 'mapbox://styles/jasotran/cm3gmi95r003301qkh9ow91f7'
                }
                rotateEnabled
                pitchEnabled
              >
                <Mapbox.Camera
                  ref={cameraRef}
                  zoomLevel={togglePitch ? 17 : 19}
                  centerCoordinate={[location.longitude, location.latitude]}
                  pitch={togglePitch ? 0 : 65}
                />
                <Mapbox.PointAnnotation
                  id="userLocationMarker"
                  coordinate={[location.longitude, location.latitude]}
                >
                  <View style={styles.outerMarker}>
                    <Animated.View
                      style={[styles.innerMarker, { transform: [{ scale: scaleAnim }] }]}
                    />
                  </View>
                </Mapbox.PointAnnotation>
                {route.length > 0 && (
                  <Mapbox.ShapeSource
                    id="routeSource"
                    shape={{
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates: route,
                      },
                      properties: {},
                    }}
                  >
                    <Mapbox.LineLayer
                      id="routeOutlineLayer"
                      style={{
                        lineColor: 'white', 
                        lineWidth: 12, 
                        lineJoin: 'round', 
                        lineCap: 'round', 
                      }}
                    />
                    <Mapbox.LineLayer
                      id="routeLayer"
                      style={{
                        lineColor: 'red', 
                        lineWidth: 8, 
                        lineJoin: 'round', 
                        lineCap: 'round', 
                      }}
                    />
                  </Mapbox.ShapeSource>
                )}
              </Mapbox.MapView>
            )
          )}

          <TouchableOpacity style={styles.refreshButton} onPress={getLocation}>
            <Ionicons name="location" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.viewButton} onPress={switchView}>
            <Ionicons name="layers-outline" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.pitchButton} onPress={switchPitch}>
            <Text style={styles.pitchButtonText}>3D</Text>
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Where do you want to go?"
              value={search}
              onChangeText={handleSearch} 
              onBlur={handleSearchBlur} 
              returnKeyType="search"
            />
            {renderToggleButton()}
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResultItem}
                onPress={() => handleResultPress(item.geometry.coordinates)}
              >
                <Text style={styles.resultText}>{item.place_name}</Text>
              </TouchableOpacity>
            )}
            style={styles.resultsContainer}
          />

          <View style={styles.predefinedButtonsContainer}>
            {renderPredefinedButtons()}
          </View>

          {directions.length > 0 && (
            <View style={styles.directionsContainer}>
              <Text style={styles.directionText}>
                {directions[currentStepIndex].maneuver.instruction}
              </Text>
              <Text style={styles.etaText}>
                ETA: {duration !== null ? Math.round(duration / 60) : 'N/A'} mins
              </Text>
              <View style={styles.directionButtons}>
                <TouchableOpacity onPress={prevStep} disabled={currentStepIndex === 0}>
                  <Text style={styles.directionButtonText}>Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={nextStep} disabled={currentStepIndex === directions.length - 1}>
                  <Text style={styles.directionButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.endNavButton} onPress={handleEndNavigation}>
                <Text style={styles.endNavButtonText}>End Navigation</Text>
              </TouchableOpacity>
            </View>
          )}

          {showLocationInfo && locationInfo && (
            <View style={styles.locationInfoContainer}>
              <Text style={styles.locationInfoText}>
                {locationInfo.features[0].place_name}
              </Text>
              <TouchableOpacity style={styles.startDirectionsButton} onPress={startDirections}>
                <Text style={styles.startDirectionsButtonText}>Start Directions</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

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
    flex: 1,
  },
  safearea: {
    flex: 1,
  },
  innerMarker: {
    width: 20,
    height: 20,
    backgroundColor: 'red',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerMarker: {
    width: 25,
    height: 25,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#606060',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  viewButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#606060',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  pitchButton: {
    position: 'absolute',
    bottom: 140,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#606060',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  pitchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  searchContainer: {
    position: 'absolute', 
    top: 60, 
    left: 10,
    right: 10,
    zIndex: 10,
    padding: 5,
    borderRadius: 20,
    backgroundColor: '#606060',
    flexDirection: 'row',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    color: 'white',
    fontWeight: 'bold',
    backgroundColor: '#606060',
  },
  searchButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#fff',
  },
  resultText: {
    fontSize: 16,
    color: '#333',
  },
  resultsContainer: {
    position: 'absolute',
    top: 110,
    left: 10,
    right: 10,
    zIndex: 9,
    backgroundColor: 'white',
    borderRadius: 10,
    maxHeight: 200,
  },
  directionsContainer: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: '#606060',
    borderRadius: 15,
    padding: 10,
    zIndex: 10,
  },
  directionText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
  directionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: 'white',
  },
  directionButtonText: {
    fontSize: 16,
    color: 'white',
  },
  endNavButton: {
    marginTop: 10,
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  endNavButtonText: {
    color: 'white',
    fontSize: 16,
  },
  predefinedButtonsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    top: 120,
  },
  predefinedButton: {
    margin: 10,
    padding: 10,
    backgroundColor: '#606060',
    borderRadius: 20,
  },
  predefinedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
  locationInfoContainer: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: '#606060',
    padding: 10,
    borderRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  locationInfoText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  startDirectionsButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  startDirectionsButtonText: {
    color: 'white',
    fontSize: 16,
  },
});