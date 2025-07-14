import { router } from "expo-router";
import { collection, getDocs, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    FlatList,
    Image,
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

// Popular destinations data
const POPULAR_PLACES = [
    {
        id: "1",
        name: "Cox's Bazar",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80",
        description: "World's longest natural sea beach",
    },
    {
        id: "2",
        name: "Sundarbans",
        image: "https://images.unsplash.com/photo-1549068106-b024baf5062d?auto=format&fit=crop&w=400&q=80",
        description: "Largest mangrove forest",
    },
    {
        id: "3",
        name: "Sylhet",
        image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80",
        description: "Tea gardens and hills",
    },
    {
        id: "4",
        name: "Bandarban",
        image: "https://images.unsplash.com/photo-1464822759844-d150baec3657?auto=format&fit=crop&w=400&q=80",
        description: "Hill district with natural beauty",
    },
];

const Home = () => {
    const [searchLocation, setSearchLocation] = useState("");
    const [guides, setGuides] = useState([]);
    const [filteredGuides, setFilteredGuides] = useState([]);
    const [filteredPlaces, setFilteredPlaces] = useState(POPULAR_PLACES);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchGuides();
    }, []);

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
        } catch (error) {
            console.error("Error fetching guides:", error);
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchGuides();
        setRefreshing(false);
    };

    const handleLocationSearch = (location) => {
        setSearchLocation(location);
        
        if (location.trim() === "") {
            // Reset to show all data when search is empty, sorted by rating
            setFilteredPlaces(POPULAR_PLACES);
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
            // Filter popular places by location
            const filteredPopularPlaces = POPULAR_PLACES.filter(place =>
                place.name.toLowerCase().includes(location.toLowerCase())
            );
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

    const renderPopularPlace = ({ item }) => (
        <TouchableOpacity
            style={styles.placeCard}
            onPress={() =>
                router.push({
                    pathname: "/place",
                    params: { placeName: item.name },
                })
            }
        >
            <Image source={{ uri: item.image }} style={styles.placeImage} />
            <View style={styles.placeOverlay}>
                <Text style={styles.placeName}>{item.name}</Text>
                <Text style={styles.placeDescription}>{item.description}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderGuide = ({ item }) => (
        <TouchableOpacity
            style={styles.guideCard}
            onPress={() =>
                router.push({
                    pathname: "/guide",
                    params: { guideId: item.id },
                })
            }
        >
            <Image source={{ uri: item.image }} style={styles.guideImage} />
            <View style={styles.guideInfo}>
                <Text style={styles.guideName}>{item.name}</Text>
                <Text style={styles.guideLocation}>{item.location}</Text>
                <View style={styles.ratingContainer}>
                    <Text style={styles.rating}>⭐ {item.rating || 0}</Text>
                    <Text style={styles.price}>৳{item.price}/day</Text>
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
    placeDescription: {
        color: "#E8EAED",
        fontSize: 12,
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
    rating: {
        fontSize: 12,
        color: "#FF6B35",
        fontWeight: "600",
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
});

export default Home;
