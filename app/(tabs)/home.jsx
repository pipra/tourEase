import { router } from "expo-router";
import { collection, getDocs, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../(auth)/firebase";

const Home = () => {
    const [searchLocation, setSearchLocation] = useState("");
    const [guides, setGuides] = useState([]);
    const [places, setPlaces] = useState([]);
    const [filteredGuides, setFilteredGuides] = useState([]);
    const [filteredPlaces, setFilteredPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Modal states
    const [placeModalVisible, setPlaceModalVisible] = useState(false);
    const [guideModalVisible, setGuideModalVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [selectedGuide, setSelectedGuide] = useState(null);

    useEffect(() => {
        fetchGuides();
        fetchPlaces();
    }, []);

    const fetchPlaces = async () => {
        try {
            // Fetch from Firebase locations only
            const locationsQuery = query(collection(db, "locations"));
            const locationsSnapshot = await getDocs(locationsQuery);
            const firebaseLocations = [];
            
            locationsSnapshot.forEach((doc) => {
                const data = doc.data();
                // Transform Firebase data to match the expected format
                const transformedLocation = {
                    id: doc.id,
                    name: data.name || '',
                    placeName: data.placeName || '',
                    image: data.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
                    description: data.description || '',
                    rating: parseFloat(data.rating) || 0,
                    reviews: parseInt(data.reviews) || 0,
                };
                firebaseLocations.push(transformedLocation);
            });

            // Sort by rating first (highest to lowest), then by reviews (most to least)
            const sortedPlaces = firebaseLocations.sort((a, b) => {
                // First sort by rating (highest first)
                if (b.rating !== a.rating) {
                    return b.rating - a.rating;
                }
                // If ratings are same, sort by number of reviews (most reviews first)
                return b.reviews - a.reviews;
            });

            // Take top 5 places with highest rating
            const topPlaces = sortedPlaces.slice(0, 5);
            setPlaces(topPlaces);
            setFilteredPlaces(topPlaces);
            
        } catch (_error) {
            // console.error("Error fetching places:", _error);
            // If Firebase fails, show empty array
            setPlaces([]);
            setFilteredPlaces([]);
        }
    };

    const fetchGuides = async () => {
        try {
            const q = query(collection(db, "guides"));
            const querySnapshot = await getDocs(q);
            const guidesData = [];
            querySnapshot.forEach((doc) => {
                guidesData.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort guides by rating first, then by reviews
            const sortedGuides = guidesData.sort((a, b) => {
                const ratingA = parseFloat(a.rating) || 0;
                const ratingB = parseFloat(b.rating) || 0;
                const reviewsA = parseInt(a.reviews) || 0;
                const reviewsB = parseInt(b.reviews) || 0;
                
                // First sort by rating (highest first)
                if (ratingB !== ratingA) {
                    return ratingB - ratingA;
                }
                
                // If ratings are same, sort by number of reviews (most reviews first)
                return reviewsB - reviewsA;
            });
            
            setGuides(sortedGuides);
            // Initially show top 3 guides (already sorted by rating/reviews)
            setFilteredGuides(sortedGuides.slice(0, 3));
            setLoading(false);
        } catch (_error) {
            // console.error("Error fetching guides:", _error);
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchGuides();
        await fetchPlaces();
        setRefreshing(false);
    };

    const handleLocationSearch = (location) => {
        setSearchLocation(location);
        
        if (location.trim() === "") {
            // Reset to show all data when search is empty, sorted by rating
            setFilteredPlaces(places);
            const sortedGuides = [...guides].sort((a, b) => {
                const ratingA = parseFloat(a.rating) || 0;
                const ratingB = parseFloat(b.rating) || 0;
                const reviewsA = parseInt(a.reviews) || 0;
                const reviewsB = parseInt(b.reviews) || 0;
                
                // First sort by rating (highest first)
                if (ratingB !== ratingA) {
                    return ratingB - ratingA;
                }
                
                // If ratings are same, sort by number of reviews (most reviews first)
                return reviewsB - reviewsA;
            });
            setFilteredGuides(sortedGuides.slice(0, 3));
        } else {
            // Filter popular places by location and placeName, maintain rating-based sorting
            const filteredPopularPlaces = places
                .filter(place =>
                    place.name.toLowerCase().includes(location.toLowerCase()) ||
                    (place.placeName && place.placeName.toLowerCase().includes(location.toLowerCase()))
                )
                .sort((a, b) => {
                    // First sort by rating (highest to lowest)
                    if (b.rating !== a.rating) {
                        return b.rating - a.rating;
                    }
                    // If ratings are same, sort by number of reviews (most reviews first)
                    return b.reviews - a.reviews;
                });
            setFilteredPlaces(filteredPopularPlaces);
            
            // Filter guides by location and sort by rating/reviews
            const filteredGuidesData = guides
                .filter(guide =>
                    guide.location && guide.location.toLowerCase().includes(location.toLowerCase())
                )
                .sort((a, b) => {
                    const ratingA = parseFloat(a.rating) || 0;
                    const ratingB = parseFloat(b.rating) || 0;
                    const reviewsA = parseInt(a.reviews) || 0;
                    const reviewsB = parseInt(b.reviews) || 0;
                    
                    // First sort by rating (highest first)
                    if (ratingB !== ratingA) {
                        return ratingB - ratingA;
                    }
                    
                    // If ratings are same, sort by number of reviews (most reviews first)
                    return reviewsB - reviewsA;
                });
            setFilteredGuides(filteredGuidesData.slice(0, 3));
        }
    };

    const handleSearch = () => {
        if (searchLocation.trim()) {
            router.push({
                pathname: "/guide",
                params: { searchLocation: searchLocation },
            });
        }
    };

    const handlePlacePress = (place) => {
        setSelectedPlace(place);
        setPlaceModalVisible(true);
    };

    const handleGuidePress = (guide) => {
        setSelectedGuide(guide);
        setGuideModalVisible(true);
    };

    const closePlaceModal = () => {
        setPlaceModalVisible(false);
        setSelectedPlace(null);
    };

    const closeGuideModal = () => {
        setGuideModalVisible(false);
        setSelectedGuide(null);
    };

    const renderPopularPlace = ({ item }) => (
        <TouchableOpacity
            style={styles.placeCard}
            onPress={() => handlePlacePress(item)}
        >
            <Image source={{ uri: item.image }} style={styles.placeImage} />
            <View style={styles.placeOverlay}>
                <Text style={styles.placeName}>{item.name}</Text>
                {item.placeName && (
                    <Text style={styles.placeNameText}>{item.placeName}</Text>
                )}
                <Text style={styles.placeDescription} numberOfLines={2} ellipsizeMode="tail">
                    {item.description}
                </Text>
                <View style={styles.placeRatingContainer}>
                    <Text style={styles.placeRating}>⭐ {item.rating}</Text>
                    <Text style={styles.placeReviews}>({item.reviews} reviews)</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderGuide = ({ item }) => (
        <TouchableOpacity
            style={styles.guideCard}
            onPress={() => handleGuidePress(item)}
        >
            <Image source={{ uri: item.image }} style={styles.guideImage} />
            <View style={styles.guideInfo}>
                <Text style={styles.guideName}>{item.name}</Text>
                <Text style={styles.guideLocation}>{item.location}</Text>
                <View style={styles.ratingContainer}>
                    <View style={styles.ratingInfo}>
                        <Text style={styles.rating}>⭐ {item.rating || 0}</Text>
                        <Text style={styles.ratingCount}>({item.reviews || 0} reviews)</Text>
                    </View>
                    <Text style={styles.price}>৳{item.pricePerDay}/day</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.welcomeText}>Welcome to</Text>
                    <Text style={styles.titleText}>TourEase</Text>
                    <Text style={styles.subtitleText}>
                        Your Smart Travel Solution
                    </Text>
                </View>

                {/* Search Section */}
                <View style={styles.searchSection}>
                    <Text style={styles.sectionTitle}>Search by Location</Text>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Enter city, place or location..."
                            value={searchLocation}
                            onChangeText={handleLocationSearch}
                            placeholderTextColor="#888"
                        />
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={handleSearch}
                        >
                            <Text style={styles.searchButtonText}>Search</Text>
                        </TouchableOpacity>
                    </View>
                    {searchLocation.trim() !== "" && (
                        <Text style={styles.searchResultText}>
                            Showing results for &ldquo;{searchLocation}&rdquo;
                        </Text>
                    )}
                </View>

                {/* Popular Places */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            {searchLocation.trim() !== "" ? "Places Matching Your Search" : "Most Popular Places"}
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/place")}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {filteredPlaces.length > 0 ? (
                        <FlatList
                            data={filteredPlaces}
                            renderItem={renderPopularPlace}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                        />
                    ) : (
                        <Text style={styles.noResultsText}>
                            No places found for &ldquo;{searchLocation}&rdquo;
                        </Text>
                    )}
                </View>

                {/* Available Guides */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            {searchLocation.trim() !== "" ? "Guides in Your Area" : "Available Guides"}
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/guide")}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <Text style={styles.loadingText}>Loading guides...</Text>
                    ) : filteredGuides.length > 0 ? (
                        <FlatList
                            data={filteredGuides}
                            renderItem={renderGuide}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                        />
                    ) : (
                        <Text style={styles.noResultsText}>
                            {searchLocation.trim() !== "" 
                                ? `No guides found in &ldquo;${searchLocation}&rdquo;`
                                : "No guides available"
                            }
                        </Text>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push("/guide")}
                        >
                            <Text style={styles.actionIcon}>🗺️</Text>
                            <Text style={styles.actionText}>Find Guide</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push("/place")}
                        >
                            <Text style={styles.actionIcon}>📍</Text>
                            <Text style={styles.actionText}>Explore Places</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push("/profile")}
                        >
                            <Text style={styles.actionIcon}>👤</Text>
                            <Text style={styles.actionText}>My Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Place Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={placeModalVisible}
                onRequestClose={closePlaceModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {selectedPlace && (
                            <>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity 
                                        style={styles.closeButton}
                                        onPress={closePlaceModal}
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
                                        <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                                        
                                        <View style={styles.modalRatingSection}>
                                            <Text style={styles.modalRating}>⭐ {selectedPlace.rating}</Text>
                                            <Text style={styles.modalReviews}>({selectedPlace.reviews} reviews)</Text>
                                        </View>
                                        
                                        <Text style={styles.modalSectionTitle}>Description</Text>
                                        <Text style={styles.modalDescription}>{selectedPlace.description}</Text>
                                        
                                        <TouchableOpacity 
                                            style={styles.exploreButton}
                                            onPress={() => {
                                                closePlaceModal();
                                                router.push({
                                                    pathname: "/place",
                                                    params: { placeName: selectedPlace.name },
                                                });
                                            }}
                                        >
                                            <Text style={styles.exploreButtonText}>Explore More</Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Guide Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={guideModalVisible}
                onRequestClose={closeGuideModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {selectedGuide && (
                            <>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity 
                                        style={styles.closeButton}
                                        onPress={closeGuideModal}
                                    >
                                        <Text style={styles.closeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <Image
                                        style={styles.modalImage}
                                        source={{ uri: selectedGuide.image }}
                                    />
                                    
                                    <View style={styles.modalDetails}>
                                        <Text style={styles.modalTitle}>{selectedGuide.name}</Text>
                                        
                                        <View style={styles.modalRatingSection}>
                                            <View style={styles.modalRatingInfo}>
                                                <Text style={styles.modalRating}>⭐ {selectedGuide.rating || 0}</Text>
                                                <Text style={styles.modalReviews}>({selectedGuide.reviews || 0} reviews)</Text>
                                            </View>
                                            <Text style={styles.modalPrice}>৳{selectedGuide.pricePerDay}/day</Text>
                                        </View>
                                        
                                        <Text style={styles.modalSectionTitle}>Location</Text>
                                        <Text style={styles.modalLocationText}>{selectedGuide.location}</Text>
                                        
                                        {selectedGuide.experience && (
                                            <>
                                                <Text style={styles.modalSectionTitle}>Experience</Text>
                                                <Text style={styles.modalDescription}>{selectedGuide.experience}</Text>
                                            </>
                                        )}
                                        
                                        {selectedGuide.languages && (
                                            <>
                                                <Text style={styles.modalSectionTitle}>Languages</Text>
                                                <Text style={styles.modalDescription}>{selectedGuide.languages}</Text>
                                            </>
                                        )}
                                        
                                        {/* <TouchableOpacity 
                                            style={styles.contactButton}
                                            onPress={() => {
                                                closeGuideModal();
                                                router.push({
                                                    pathname: "/guide",
                                                    params: { guideId: selectedGuide.id },
                                                });
                                            }}
                                        >
                                            <Text style={styles.contactButtonText}>Contact Guide</Text>
                                        </TouchableOpacity> */}
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
        backgroundColor: "#f8f9fa",
    },
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        alignItems: "center",
        paddingVertical: 30,
        paddingHorizontal: 20,
        backgroundColor: "#6200EE",
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    welcomeText: {
        fontSize: 16,
        color: "#E8EAED",
        marginBottom: 5,
    },
    titleText: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginBottom: 8,
    },
    subtitleText: {
        fontSize: 16,
        color: "#E8EAED",
        textAlign: "center",
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingVertical: 25,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: "#333",
    },
    searchButton: {
        backgroundColor: "#6200EE",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    searchButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 16,
    },
    section: {
        paddingHorizontal: 20,
        paddingBottom: 25,
        
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    seeAllText: {
        color: "#6200EE",
        fontWeight: "600",
        fontSize: 14,
    },
    horizontalList: {
        paddingRight: 20,
    },
    placeCard: {
        width: 300,
        height: 240,
        marginRight: 15,
        borderRadius: 12,
        overflow: "hidden",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    placeImage: {
        width: "100%",
        height: "100%",
    },
    placeOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: 12,
    },
    placeName: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 2,
    },
    placeNameText: {
        color: "#FFD700",
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 4,
    },
    placeDescription: {
        color: "#E8EAED",
        fontSize: 12,
        marginBottom: 6,
        numberOfLines: 2,
        lineHeight: 16,
    },
    placeRatingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    placeRating: {
        color: "#FFD700",
        fontSize: 12,
        fontWeight: "600",
    },
    placeReviews: {
        color: "#E8EAED",
        fontSize: 10,
    },
    guideCard: {
        height: 240,
        width: 240,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginRight: 15,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: "hidden",
    },
    guideImage: {
        width: "100%",
        height: 160,
    },
    guideInfo: {
        padding: 12,
    },
    guideName: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    guideLocation: {
        fontSize: 12,
        color: "#666",
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    ratingInfo: {
        flexDirection: "column",
        alignItems: "flex-start",
    },
    rating: {
        fontSize: 12,
        color: "#FF6B35",
        fontWeight: "600",
    },
    ratingCount: {
        fontSize: 10,
        color: "#666",
        marginTop: 2,
    },
    price: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#6200EE",
    },
    quickActions: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 10,
    },
    actionButton: {
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        minWidth: 80,
    },
    actionIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#333",
        textAlign: "center",
    },
    loadingText: {
        textAlign: "center",
        color: "#666",
        fontSize: 16,
        paddingVertical: 20,
    },
    searchResultText: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
        marginTop: 8,
        textAlign: "center",
    },
    noResultsText: {
        textAlign: "center",
        color: "#999",
        fontSize: 14,
        paddingVertical: 20,
        fontStyle: "italic",
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "flex-end",
        padding: 16,
        paddingBottom: 0,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#6B7280",
    },
    modalImage: {
        width: "100%",
        height: 200,
    },
    modalDetails: {
        padding: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 12,
    },
    modalRatingSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    modalRatingInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    modalRating: {
        fontSize: 16,
        fontWeight: "600",
        color: "#F59E0B",
    },
    modalReviews: {
        fontSize: 14,
        color: "#6B7280",
    },
    modalPrice: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#6200EE",
    },
    modalSectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
        marginTop: 16,
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 16,
        lineHeight: 24,
        color: "#4B5563",
    },
    modalLocationText: {
        fontSize: 16,
        color: "#6B7280",
    },
    exploreButton: {
        backgroundColor: "#6200EE",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 24,
    },
    exploreButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    contactButton: {
        backgroundColor: "#059669",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 24,
    },
    contactButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default Home;
