import { router, useFocusEffect } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../(auth)/firebase';

const Place = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [places, setPlaces] = useState([]);
    const [categories, setCategories] = useState(['All']);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch locations from Firebase and combine with default places
    const fetchLocations = useCallback(async () => {
        try {
            const locationsCollection = collection(db, 'locations');
            const locationsSnapshot = await getDocs(locationsCollection);
            const firebaseLocations = [];
            
            locationsSnapshot.forEach((doc) => {
                const data = doc.data();
                // Transform Firebase data to match the expected format
                const transformedLocation = {
                    id: doc.id,
                    name: data.name || '',
                    image: data.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
                    description: data.description || '',
                    category: data.category || 'Other',
                    rating: data.rating || 0.0,
                    reviews: data.reviews || 0,
                    location: data.placeName || data.name || '',
                    placeName: data.placeName || '', // Keep original placeName field
                    bestTime: data.bestTimeToVisit || 'Year round',
                    highlights: Array.isArray(data.attractions) ? data.attractions : 
                               (data.attractions ? data.attractions.split(',').map(s => s.trim()) : []),
                    // Additional fields from Firebase
                    averageTemperature: data.averageTemperature,
                    language: data.language,
                    currency: data.currency,
                    isDefault: false,
                };
                firebaseLocations.push(transformedLocation);
            });

            // Combine default places with Firebase locations
            const allPlaces = [...firebaseLocations];
            setPlaces(allPlaces);

            // Extract unique categories from all data
            const uniqueCategories = ['All', ...new Set(allPlaces.map(place => place.category))];
            setCategories(uniqueCategories);
            
            setLoading(false);
        } catch (error) {
            console.error('Error fetching locations:', error);
            // If Firebase fails, still show default places
            // setPlaces(DEFAULT_PLACES);
            // const uniqueCategories = ['All', ...new Set(DEFAULT_PLACES.map(place => place.category))];
            // setCategories(uniqueCategories);
            // setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLocations();
    }, [fetchLocations]);

    // Refresh data when screen is focused (when admin adds new locations)
    useFocusEffect(
        useCallback(() => {
            fetchLocations();
        }, [fetchLocations])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchLocations();
        setRefreshing(false);
    };

    const filteredPlaces = places.filter(place => {
        const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            place.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || place.category === selectedCategory;
        return matchesSearch && matchesCategory;
    }).sort((a, b) => {
        // Sort by rating first (highest to lowest)
        if (b.rating !== a.rating) {
            return b.rating - a.rating;
        }
        // If ratings are equal, sort by reviews (most to least)
        return b.reviews - a.reviews;
    });

    const handlePlacePress = (place) => {
        setSelectedPlace(place);
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setSelectedPlace(null);
    };

    const handleFindGuides = (place) => {
        handleCloseModal();
        // Use the placeName for searching guides, fallback to location, then name
        const searchTerm = place.placeName || ' ';
        router.push({
            pathname: '/(tabs)/guide',
            params: { searchLocation: searchTerm }
        });
    };

    const renderCategory = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryButton,
                selectedCategory === item && styles.activeCategoryButton
            ]}
            onPress={() => setSelectedCategory(item)}
        >
            <Text style={[
                styles.categoryText,
                selectedCategory === item && styles.activeCategoryText
            ]}>
                {item}
            </Text>
        </TouchableOpacity>
    );

    const renderPlace = ({ item }) => (
        <TouchableOpacity 
            style={styles.placeCard}
            onPress={() => handlePlacePress(item)}
        >
            <Image source={{ uri: item.image }} style={styles.placeImage} />
            <View style={styles.placeContent}>
                <View style={styles.placeHeader}>
                    <Text style={styles.placeName}>{item.name}</Text>
                    <View style={styles.ratingContainer}>
                        <Text style={styles.rating}>⭐ {item.rating}</Text>
                        <Text style={styles.reviews}>({item.reviews})</Text>
                    </View>
                </View>
                
                <Text>📍 {item.location}</Text>
                <Text style={styles.placeDescription}>{item.description}</Text>
                
                <View style={styles.placeFooter}>
                    <View style={styles.categoryAndSource}>
                        <View style={styles.categoryTag}>
                            <Text style={styles.categoryTagText}>{item.category}</Text>
                        </View>
                        {!item.isDefault && (
                            <View style={styles.adminTag}>
                                <Text style={styles.adminTagText}>Admin Added</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.bestTime}>Best: {item.bestTime}</Text>
                </View>
                
                <View style={styles.highlightsContainer}>
                    <Text style={styles.highlightsTitle}>Highlights:</Text>
                    <View style={styles.highlightsList}>
                        {item.highlights.slice(0, 3).map((highlight, index) => (
                            <Text key={index} style={styles.highlight}>• {highlight}</Text>
                        ))}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore Places</Text>
                <Text style={styles.headerSubtitle}>Discover beautiful destinations in Bangladesh</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6200EE" />
                    <Text style={styles.loadingText}>Loading amazing places...</Text>
                </View>
            ) : (
                <>
                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search places or locations..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#888"
                        />
                    </View>

                    {/* Categories */}
                    <View style={styles.categoriesSection}>
                        <FlatList
                            data={categories}
                            renderItem={renderCategory}
                            keyExtractor={(item) => item}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoriesList}
                        />
                    </View>

                    {/* Places List */}
                    {filteredPlaces.length > 0 ? (
                        <FlatList
                            data={filteredPlaces}
                            renderItem={renderPlace}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.placesList}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }
                        />
                    ) : (
                        <View style={styles.noResultsContainer}>
                            <Text style={styles.noResultsText}>
                                {places.length === 0 
                                    ? "Loading places..." 
                                    : "No places found matching your search."}
                            </Text>
                            {places.length > 0 && (
                                <Text style={styles.noResultsSubtext}>
                                    Try adjusting your search or category filter.
                                </Text>
                            )}
                        </View>
                    )}
                </>
            )}

            {/* Place Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {selectedPlace && (
                            <>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity 
                                        style={styles.closeButton}
                                        onPress={handleCloseModal}
                                    >
                                        <Text style={styles.closeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <Image
                                        style={styles.modalImage}
                                        source={{ uri: selectedPlace.image }}
                                    />
                                    
                                    <View style={styles.modalDetails}>
                                        <View style={styles.modalTitleSection}>
                                            <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                                            <View style={styles.modalRatingContainer}>
                                                <Text style={styles.modalRatingText}>⭐ {selectedPlace.rating}</Text>
                                                <Text style={styles.modalReviewsText}>({selectedPlace.reviews} reviews)</Text>
                                            </View>
                                        </View>

                                        <View style={styles.modalLocationContainer}>
                                            <Text style={styles.modalLocationIcon}>📍</Text>
                                            <Text style={styles.modalLocationText}>{selectedPlace.location}</Text>
                                        </View>

                                        <View style={styles.modalCategoryContainer}>
                                            <View style={styles.modalCategoryTag}>
                                                <Text style={styles.modalCategoryText}>{selectedPlace.category}</Text>
                                            </View>
                                            <Text style={styles.modalBestTime}>Best time: {selectedPlace.bestTime}</Text>
                                        </View>

                                        <View style={styles.modalDescriptionContainer}>
                                            <Text style={styles.modalSectionTitle}>About</Text>
                                            <Text style={styles.modalDescription}>{selectedPlace.description}</Text>
                                        </View>

                                        <View style={styles.modalHighlightsContainer}>
                                            <Text style={styles.modalSectionTitle}>Highlights</Text>
                                            {selectedPlace.highlights.map((highlight, index) => (
                                                <View key={index} style={styles.modalHighlightItem}>
                                                    <Text style={styles.modalHighlightBullet}>•</Text>
                                                    <Text style={styles.modalHighlightText}>{highlight}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <TouchableOpacity 
                                            style={styles.findGuidesButton}
                                            onPress={() => handleFindGuides(selectedPlace)}
                                        >
                                            <Text style={styles.findGuidesButtonText}>
                                                Find Guides for {selectedPlace.placeName}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6200EE',
        fontWeight: '500',
    },
    noResultsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    noResultsText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: '500',
    },
    noResultsSubtext: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },
    header: {
        backgroundColor: '#6200EE',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 25,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#E8EAED',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    categoriesSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    categoriesList: {
        paddingRight: 20,
    },
    categoryButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    activeCategoryButton: {
        backgroundColor: '#6200EE',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    activeCategoryText: {
        color: '#FFFFFF',
    },
    placesList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 0,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    modalImage: {
        width: '100%',
        height: 250,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalDetails: {
        padding: 20,
    },
    modalTitleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
        marginRight: 12,
    },
    modalRatingContainer: {
        alignItems: 'flex-end',
    },
    modalRatingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F59E0B',
        marginBottom: 2,
    },
    modalReviewsText: {
        fontSize: 12,
        color: '#6B7280',
    },
    modalLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalLocationIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    modalLocationText: {
        fontSize: 16,
        color: '#6B7280',
        flex: 1,
    },
    modalCategoryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalCategoryTag: {
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    modalCategoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0369A1',
    },
    modalBestTime: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '500',
    },
    modalDescriptionContainer: {
        marginBottom: 20,
    },
    modalSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    modalDescription: {
        fontSize: 16,
        lineHeight: 24,
        color: '#4B5563',
    },
    modalHighlightsContainer: {
        marginBottom: 24,
    },
    modalHighlightItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    modalHighlightBullet: {
        fontSize: 16,
        color: '#059669',
        marginRight: 8,
        marginTop: 2,
    },
    modalHighlightText: {
        fontSize: 16,
        color: '#4B5563',
        flex: 1,
        lineHeight: 22,
    },
    findGuidesButton: {
        backgroundColor: '#059669',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    findGuidesButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    placeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    placeImage: {
        width: '100%',
        height: 200,
    },
    placeContent: {
        padding: 16,
    },
    placeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    placeName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B35',
        marginRight: 4,
    },
    reviews: {
        fontSize: 12,
        color: '#666',
    },
    placeLocation: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    placeDescription: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
        marginBottom: 12,
    },
    placeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryAndSource: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryTag: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryTagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1976D2',
    },
    adminTag: {
        backgroundColor: '#E8F5E8',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    adminTagText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#2E7D2E',
    },
    bestTime: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    highlightsContainer: {
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingTop: 12,
    },
    highlightsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    highlightsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    highlight: {
        fontSize: 12,
        color: '#666',
        marginRight: 15,
        marginBottom: 2,
    },
});

export default Place;