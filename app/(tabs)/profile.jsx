import { router } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../(auth)/firebase';

export default function Profile() {
    const [userData, setUserData] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [activeTab, setActiveTab] = useState('profile');
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(1);

    useEffect(() => {
        fetchUserDetails();
        fetchUserBookings();
        fetchUserReviews();
    }, []);

    const fetchUserDetails = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const docRef = doc(db, "Users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                }
            } catch (err) {
                console.log("Error fetching user data:", err.message);
            }
        }
    };

    const fetchUserBookings = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const q = query(
                    collection(db, "bookings"),
                    where("userId", "==", user.uid)
                );
                const querySnapshot = await getDocs(q);
                const bookingsData = [];
                
                // Get all user's reviews to check which bookings have been reviewed
                const reviewsQuery = query(
                    collection(db, "reviews"),
                    where("userId", "==", user.uid)
                );
                const reviewsSnapshot = await getDocs(reviewsQuery);
                const reviewedBookingIds = new Set();
                
                reviewsSnapshot.forEach((doc) => {
                    const reviewData = doc.data();
                    if (reviewData.bookingId) {
                        reviewedBookingIds.add(reviewData.bookingId);
                    }
                });
                
                querySnapshot.forEach((doc) => {
                    const bookingData = { id: doc.id, ...doc.data() };
                    bookingData.hasReview = reviewedBookingIds.has(doc.id);
                    bookingsData.push(bookingData);
                });
                
                setBookings(bookingsData);
            } catch (err) {
                console.log("Error fetching bookings:", err.message);
            }
        }
    };

    const fetchUserReviews = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const q = query(
                    collection(db, "reviews"),
                    where("userId", "==", user.uid)
                );
                const querySnapshot = await getDocs(q);
                const reviewsData = [];
                querySnapshot.forEach((doc) => {
                    reviewsData.push({ id: doc.id, ...doc.data() });
                });
                setReviews(reviewsData);
            } catch (err) {
                console.log("Error fetching reviews:", err.message);
            }
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            '🚪 Sign Out',
            'Are you sure you want to sign out of your account?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await auth.signOut();
                            router.replace('/');
                        } catch (_error) {
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleAddReview = async () => {
        if (!reviewText.trim()) {
            Alert.alert('Error', 'Please enter a review');
            return;
        }

        if (reviewRating < 1 || reviewRating > 5) {
            Alert.alert('Error', 'Please select a rating between 1 and 5 stars');
            return;
        }

        const user = auth.currentUser;
        if (user && selectedBooking) {
            // Check if booking is confirmed
            if (selectedBooking.status !== 'confirmed') {
                Alert.alert('Error', 'You can only review confirmed bookings');
                return;
            }

            try {
                // Check if user has already reviewed this booking
                const existingReviewQuery = query(
                    collection(db, "reviews"),
                    where("userId", "==", user.uid),
                    where("guideId", "==", selectedBooking.guideId),
                    where("bookingId", "==", selectedBooking.id)
                );
                const existingReviewSnapshot = await getDocs(existingReviewQuery);
                
                if (!existingReviewSnapshot.empty) {
                    Alert.alert('Review Already Exists', 'You have already reviewed this booking trip. Each booking can only be reviewed once.');
                    return;
                }

                // Add the review
                await addDoc(collection(db, "reviews"), {
                    userId: user.uid,
                    userName: user.displayName,
                    guideId: selectedBooking.guideId,
                    guideName: selectedBooking.guideName,
                    bookingId: selectedBooking.id,
                    rating: reviewRating,
                    review: reviewText,
                    createdAt: new Date(),
                });

                // Update guide's average rating
                await updateGuideRating(selectedBooking.guideId);

                Alert.alert('Success', 'Review added successfully!');
                setReviewModalVisible(false);
                setReviewText('');
                setReviewRating(1);
                fetchUserReviews();
                fetchUserBookings(); // Refresh bookings to update review status
            } catch (err) {
                Alert.alert('Error', 'Failed to add review');
                console.log("Error adding review:", err.message);
            }
        }
    };

    const updateGuideRating = async (guideId) => {
        try {
            // Get all reviews for this guide
            const reviewsQuery = query(
                collection(db, "reviews"),
                where("guideId", "==", guideId)
            );
            const reviewsSnapshot = await getDocs(reviewsQuery);
            
            if (reviewsSnapshot.empty) return;

            // Calculate average rating
            let totalRating = 0;
            let reviewCount = 0;
            
            reviewsSnapshot.forEach((doc) => {
                const reviewData = doc.data();
                totalRating += reviewData.rating;
                reviewCount++;
            });

            const averageRating = totalRating / reviewCount;

            // Update guide document with new average rating and review count
            const guideRef = doc(db, "guides", guideId);
            await updateDoc(guideRef, {
                rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
                reviews: reviewCount
            });

        } catch (error) {
            console.log("Error updating guide rating:", error);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmed':
                return { backgroundColor: '#E8F5E8', color: '#2E7D2E', borderColor: '#81C784' };
            case 'pending':
                return { backgroundColor: '#FFF8E1', color: '#F57F17', borderColor: '#FFE082' };
            case 'cancelled':
                return { backgroundColor: '#FFEBEE', color: '#C62828', borderColor: '#EF9A9A' };
            default:
                return { backgroundColor: '#F5F5F5', color: '#666', borderColor: '#DDD' };
        }
    };

    const renderBookingItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);
        
        return (
            <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                    <View style={styles.bookingTitleContainer}>
                        <Text style={styles.bookingGuideName}>{item.guideName}</Text>
                        {item.hasReview && (
                            <Text style={styles.reviewBadge}>★ Reviewed</Text>
                        )}
                    </View>
                    <View style={[styles.bookingStatus, { 
                        backgroundColor: statusStyle.backgroundColor,
                        borderColor: statusStyle.borderColor,
                    }]}>
                        <Text style={[styles.bookingStatusText, { color: statusStyle.color }]}>
                            {item.status || 'Pending'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.bookingLocation}>📍 {item.location}</Text>
                <Text style={styles.bookingDate}>📅 {item.date || 'Date TBD'}</Text>
                <Text style={styles.bookingPrice}>💰 ৳{item.price}/day</Text>
                
                <View style={styles.bookingActions}>
                    {item.status === 'confirmed' ? (
                        item.hasReview ? (
                            <View style={styles.reviewedInfo}>
                                <Text style={styles.reviewedText}>✓ Already Reviewed</Text>
                            </View>
                        ) : (
                            <TouchableOpacity 
                                style={styles.reviewButton}
                                onPress={() => {
                                    // Double-check if booking has been reviewed
                                    if (item.hasReview) {
                                        Alert.alert('Info', 'You have already reviewed this booking');
                                        return;
                                    }
                                    setSelectedBooking(item);
                                    setReviewModalVisible(true);
                                }}
                            >
                                <Text style={styles.reviewButtonText}>Add Review</Text>
                            </TouchableOpacity>
                        )
                    ) : (
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusText}>
                                {item.status === 'pending' ? 'Waiting for guide approval' : 
                                 item.status === 'cancelled' ? 'Booking cancelled' : 
                                 'Review available after approval'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderReviewItem = ({ item }) => (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <Text style={styles.reviewGuideName}>{item.guideName}</Text>
                <View style={styles.ratingContainer}>
                    <Text style={styles.reviewRating}>⭐ {item.rating}/5</Text>
                </View>
            </View>
            <Text style={styles.reviewText}>{item.review}</Text>
            <Text style={styles.reviewDate}>
                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recently'}
            </Text>
        </View>
    );

    const renderStarRating = () => (
        <View style={styles.starRating}>
            <Text style={styles.ratingLabel}>Rating: {reviewRating}/5</Text>
            <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => setReviewRating(star)}
                        style={styles.star}
                    >
                        <Text style={[
                            styles.starText,
                            { color: star <= reviewRating ? '#FFD700' : '#DDD' }
                        ]}>
                            ⭐
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.ratingDescription}>
                {reviewRating === 1 ? 'Poor' :
                 reviewRating === 2 ? 'Fair' :
                 reviewRating === 3 ? 'Good' :
                 reviewRating === 4 ? 'Very Good' :
                 'Excellent'}
            </Text>
        </View>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.profileContent}
                    >
                        <View style={styles.profileCard}>
                            <View style={styles.profileImageContainer}>
                                <Image
                                    source={require('../../assets/images/habib.jpg')}
                                    style={styles.profileImage}
                                />
                                <Text style={styles.profileName}>
                                    {auth.currentUser?.displayName}
                                </Text>
                                <Text style={styles.profileEmail}>{userData?.email}</Text>
                            </View>

                            <View style={styles.profileDetails}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Service:</Text>
                                    <Text style={styles.detailValue}>{userData?.service || 'Tourist'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Location:</Text>
                                    <Text style={styles.detailValue}>{userData?.location || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Member since:</Text>
                                    <Text style={styles.detailValue}>2024</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <Text style={styles.statNumber}>{bookings.length}</Text>
                                <Text style={styles.statLabel}>Bookings</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statNumber}>{reviews.length}</Text>
                                <Text style={styles.statLabel}>Reviews</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statNumber}>4.5</Text>
                                <Text style={styles.statLabel}>Rating</Text>
                            </View>
                        </View>

                        {/* Profile Actions */}
                        {/* <View style={styles.profileActions}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionIcon}>✏️</Text>
                                <Text style={styles.actionText}>Edit Profile</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionIcon}>⚙️</Text>
                                <Text style={styles.actionText}>Settings</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionIcon}>❓</Text>
                                <Text style={styles.actionText}>Help & Support</Text>
                            </TouchableOpacity>
                        </View> */}

                        {/* Logout Section */}
                        <View style={styles.logoutSection}>
                            <TouchableOpacity 
                                style={styles.logoutCardButton} 
                                onPress={handleLogout}
                            >
                                <Text style={styles.logoutIcon}>🚪</Text>
                                <Text style={styles.logoutCardText}>Sign Out</Text>
                                <Text style={styles.logoutArrow}>→</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                );
            case 'bookings':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>My Bookings</Text>
                        {bookings.length > 0 ? (
                            <FlatList
                                data={bookings}
                                renderItem={renderBookingItem}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No bookings yet</Text>
                                <TouchableOpacity 
                                    style={styles.browseButton}
                                    onPress={() => router.push('/guide')}
                                >
                                    <Text style={styles.browseButtonText}>Browse Guides</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            case 'reviews':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>My Reviews</Text>
                        {reviews.length > 0 ? (
                            <FlatList
                                data={reviews}
                                renderItem={renderReviewItem}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No reviews yet</Text>
                                <Text style={styles.emptyStateSubtext}>
                                    Book a guide and share your experience!
                                </Text>
                            </View>
                        )}
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {userData ? (
                <>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Profile</Text>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Navigation */}
                    <View style={styles.tabContainer}>
                        {['profile', 'bookings', 'reviews'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tabButton,
                                    activeTab === tab && styles.activeTabButton
                                ]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[
                                    styles.tabButtonText,
                                    activeTab === tab && styles.activeTabButtonText
                                ]}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Tab Content */}
                    <View style={styles.content}>
                        {renderTabContent()}
                    </View>

                    {/* Review Modal */}
                    <Modal
                        visible={reviewModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setReviewModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Add Review</Text>
                                
                                {selectedBooking && (
                                    <View style={styles.bookingInfo}>
                                        <Text style={styles.bookingInfoTitle}>Review for:</Text>
                                        <Text style={styles.bookingInfoGuide}>{selectedBooking.guideName}</Text>
                                        <Text style={styles.bookingInfoDate}>Date: {selectedBooking.date}</Text>
                                    </View>
                                )}
                                
                                {renderStarRating()}
                                
                                <TextInput
                                    style={styles.reviewInput}
                                    placeholder="Share your experience..."
                                    value={reviewText}
                                    onChangeText={setReviewText}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                                
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setReviewModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={handleAddReview}
                                    >
                                        <Text style={styles.submitButtonText}>Submit</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </>
            ) : (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: '#6200EE',
        paddingHorizontal: 20,
        paddingVertical: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginTop: 43,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    logoutButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    logoutText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTabButton: {
        borderBottomColor: '#6200EE',
    },
    tabButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    activeTabButtonText: {
        color: '#6200EE',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    profileContent: {
        alignItems: 'center',
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        width: '100%',
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 15,
        borderWidth: 5,
        borderColor: '#6200EE',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    profileEmail: {
        fontSize: 16,
        color: '#666',
    },
    profileDetails: {
        width: '100%',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    detailValue: {
        fontSize: 16,
        color: '#666',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        minWidth: 90,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    tabContent: {
        flex: 1,
    },
    tabTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    bookingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    bookingTitleContainer: {
        flex: 1,
        marginRight: 10,
    },
    bookingGuideName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    reviewBadge: {
        fontSize: 11,
        color: '#FFB000',
        fontWeight: '600',
        marginTop: 2,
    },
    bookingStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    bookingStatusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    bookingLocation: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    bookingDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    bookingPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 12,
    },
    bookingActions: {
        alignItems: 'flex-end',
    },
    reviewButton: {
        backgroundColor: '#6200EE',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    reviewButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    reviewedInfo: {
        padding: 8,
        backgroundColor: '#E8F5E8',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#81C784',
    },
    reviewedText: {
        color: '#2E7D2E',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    statusInfo: {
        padding: 8,
        backgroundColor: '#FFF8E1',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    statusText: {
        color: '#F57F17',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    reviewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewGuideName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    ratingContainer: {
        alignItems: 'center',
    },
    reviewRating: {
        fontSize: 14,
    },
    reviewText: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
        marginBottom: 8,
    },
    reviewDate: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 10,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#888',
        marginBottom: 20,
        textAlign: 'center',
    },
    browseButton: {
        backgroundColor: '#6200EE',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    browseButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    bookingInfo: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: '#6200EE',
    },
    bookingInfoTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    bookingInfoGuide: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    bookingInfoDate: {
        fontSize: 14,
        color: '#666',
    },
    starRating: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 20,
    },
    ratingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    stars: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    star: {
        marginRight: 5,
    },
    starText: {
        fontSize: 24,
    },
    ratingDescription: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    reviewInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        minHeight: 100,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
        textAlign: 'center',
    },
    submitButton: {
        backgroundColor: '#6200EE',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        textAlign: 'center',
    },
    profileActions: {
        width: '100%',
        marginTop: 20,
        marginBottom: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    actionIcon: {
        fontSize: 20,
        marginRight: 15,
        width: 25,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        flex: 1,
    },
    logoutSection: {
        width: '100%',
        marginTop: 10,
    },
    logoutCardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFE5E5',
        marginTop: 50,
    },
    logoutIcon: {
        fontSize: 20,
        marginRight: 15,
        width: 25,
    },
    logoutCardText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E53E3E',
        flex: 1,
    },
    logoutArrow: {
        fontSize: 18,
        color: '#E53E3E',
        fontWeight: 'bold',
    },
});
