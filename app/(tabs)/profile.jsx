import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../(auth)/firebase';
import { bookingStatusService } from '../../utils/bookingStatusService';
import { deleteNotification, listenForUserNotifications } from '../../utils/realtimeNotificationService';

export default function Profile() {
    const [userData, setUserData] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [activeTab, setActiveTab] = useState('profile');
    const [bookingFilter, setBookingFilter] = useState('pending');
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(1);
    const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
    const [editedUserData, setEditedUserData] = useState({});
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Booking status notification states
    const [statusChangeModalVisible, setStatusChangeModalVisible] = useState(false);
    const [statusChanges, setStatusChanges] = useState([]);
    const [currentStatusChangeIndex, setCurrentStatusChangeIndex] = useState(0);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    
    // User notifications from RTDB
    const [userNotifications, setUserNotifications] = useState([]);

    // Check auth state first
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthChecked(true);
            if (user) {
                fetchUserDetails();
                fetchUserBookings();
                fetchUserReviews();
            } else {
                setIsLoading(false);
                // Redirect to login if not authenticated
                router.replace('/(auth)/login');
            }
        });

        return () => unsubscribe();
    }, []);

    // Real-time listener for booking status changes
    useEffect(() => {
        let unsubscribe = null;
        
        const setupBookingStatusListener = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                // Set up real-time listener for user's bookings
                const bookingsQuery = query(
                    collection(db, 'bookings'),
                    where('userId', '==', user.uid)
                );

                unsubscribe = onSnapshot(bookingsQuery, async (snapshot) => {
                    const userBookings = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    if (!initialLoadComplete) {
                        // First load - initialize tracking without notifications
                        await bookingStatusService.initializeStatusTracking(userBookings, user.uid);
                        setInitialLoadComplete(true);
                        return;
                    }

                    // Check for status changes
                    const statusChangesList = await bookingStatusService.checkForStatusChanges(userBookings, user.uid);
                    
                    if (statusChangesList.length > 0) {
                        // console.log(`Real-time: Found ${statusChangesList.length} booking status change(s)`);
                        setStatusChanges(statusChangesList);
                        setCurrentStatusChangeIndex(0);
                        setStatusChangeModalVisible(true);
                    }
                }, (error) => {
                    // console.error('Error in booking status listener:', error);
                });

            } catch (_error) {
                // console.error('Error setting up booking status listener:', _error);
            }
        };

        setupBookingStatusListener();

        // Cleanup on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [initialLoadComplete]);

    // Set up notification listener for booking responses
    useEffect(() => {
        let unsubscribe;

        const setupNotificationListener = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser?.uid) return;

            try {
                // Listen for booking response notifications from guides
                unsubscribe = listenForUserNotifications(currentUser.uid, (notifications) => {
                    console.log('User notifications updated:', notifications.length);
                    
                    // Store notifications in state for display
                    setUserNotifications(notifications);
                    
                    // Refresh bookings to show updated status
                    fetchUserBookings();
                });

                console.log('User notification listener set up successfully');
            } catch (error) {
                console.error('Error setting up notification listener:', error);
            }
        };

        setupNotificationListener();

        // Cleanup on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    // Refresh data when the screen comes into focus (e.g., after booking a guide)
    useFocusEffect(
        useCallback(() => {
            fetchUserBookings();
        }, [])
    );

    const fetchUserDetails = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const docRef = doc(db, "Users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                } else {
                    // If user document doesn't exist, create a basic userData object
                    setUserData({
                        email: user.email,
                        service: 'Tourist',
                        location: 'N/A',
                        createdAt: new Date()
                    });
                }
            } catch (_err) {
                console.log("Error fetching user data:", _err.message);
                Alert.alert('Error', 'Failed to load user data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
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
                    
                    // Debug: Log booking data to see what fields are available
                    // console.log('Booking data:', {
                    //     id: bookingData.id,
                    //     date: bookingData.date,
                    //     dates: bookingData.dates,
                    //     bookingDate: bookingData.bookingDate,
                    //     status: bookingData.status
                    // });
                    
                    bookingData.hasReview = reviewedBookingIds.has(doc.id);
                    
                    // Categorize booking based on status and date
                    const currentDate = new Date();
                    
                    // Handle different date field possibilities
                    let bookingDate = null;
                    const dateField = bookingData.date || bookingData.dates || bookingData.bookingDate;
                    
                    if (dateField) {
                        if (Array.isArray(dateField)) {
                            // For multiple dates, use the last date to determine if booking is in the past
                            bookingDate = dateField.length > 0 ? new Date(dateField[dateField.length - 1]) : null;
                        } else {
                            bookingDate = new Date(dateField);
                        }
                    }
                    
                    const status = (bookingData.status || 'pending').toLowerCase().trim();
                    
                    // Determine category
                    if (status === 'confirmed' && bookingDate && bookingDate < currentDate) {
                        bookingData.category = 'history';
                    } else if (status === 'confirmed' || status === 'accepted') {
                        bookingData.category = 'accepted';
                    } else if (status === 'cancelled') {
                        bookingData.category = 'cancelled';
                    } else {
                        bookingData.category = 'pending';
                    }
                    
                    bookingsData.push(bookingData);
                });
                
                // Sort bookings by date (earliest first within each category)
                bookingsData.sort((a, b) => {
                    const dateA = a.date ? new Date(a.date) : new Date(0);
                    const dateB = b.date ? new Date(b.date) : new Date(0);
                    return dateA.getTime() - dateB.getTime();
                });
                
                setBookings(bookingsData);
            } catch (_err) {
                // console.log("Error fetching bookings:", _err.message);
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
            } catch (_err) {
                // console.log("Error fetching reviews:", _err.message);
            }
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchUserDetails(),
            fetchUserBookings(),
            fetchUserReviews()
        ]);
        setRefreshing(false);
    };

    // Filter bookings based on selected category
    const getFilteredBookings = () => {
        const filtered = bookings.filter(booking => booking.category === bookingFilter);
        
        // Sort filtered bookings based on category
        return filtered.sort((a, b) => {
            // Handle different date field possibilities for both items
            const getDateFromItem = (item) => {
                const dateField = item.date || item.dates || item.bookingDate;
                if (!dateField) return new Date(0);
                
                if (Array.isArray(dateField)) {
                    // For multiple dates, use the first date for sorting
                    return dateField.length > 0 ? new Date(dateField[0]) : new Date(0);
                } else {
                    return new Date(dateField);
                }
            };
            
            const dateA = getDateFromItem(a);
            const dateB = getDateFromItem(b);
            
            // For cancelled bookings, show latest dates first (big dates first)
            if (bookingFilter === 'cancelled') {
                return dateB.getTime() - dateA.getTime();
            }
            
            // For all other categories (pending, accepted, history), show earliest dates first
            return dateA.getTime() - dateB.getTime();
        });
    };

    // Get booking counts for each category
    const getBookingCounts = () => {
        const counts = {
            pending: 0,
            accepted: 0,
            cancelled: 0,
            history: 0
        };
        
        bookings.forEach(booking => {
            if (counts.hasOwnProperty(booking.category)) {
                counts[booking.category]++;
            }
        });
        
        return counts;
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
            // Check if booking is confirmed or accepted
            if (selectedBooking.status !== 'confirmed' && selectedBooking.status !== 'accepted') {
                Alert.alert('Error', 'You can only review confirmed or accepted bookings');
                return;
            }

            // Check if tour date has completed
            const dateField = selectedBooking.date || selectedBooking.dates || selectedBooking.bookingDate;
            let tourDate = null;
            
            if (dateField) {
                if (Array.isArray(dateField)) {
                    // For multiple dates, use the last date to check completion
                    tourDate = dateField.length > 0 ? new Date(dateField[dateField.length - 1]) : null;
                } else {
                    tourDate = new Date(dateField);
                }
            }
            
            const currentDate = new Date();
            if (!tourDate || tourDate >= currentDate) {
                Alert.alert('Tour Not Completed', 'You can only add a review after the tour date has passed. Please wait until after the tour is completed.');
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
            } catch (_err) {
                Alert.alert('Error', 'Failed to add review');
                // console.log("Error adding review:", _err.message);
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

        } catch (_error) {
            // console.log("Error updating guide rating:", _error);
        }
    };

    const handleEditProfile = () => {
        setEditedUserData({
            displayName: auth.currentUser?.displayName || '',
            location: userData?.location || '',
            service: userData?.service || 'Tourist',
        });
        setProfileImageUrl(userData?.profileImageUrl || '');
        setEditProfileModalVisible(true);
    };

    const saveProfile = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Update user document in Firestore
            const userRef = doc(db, "Users", user.uid);
            const updateData = {
                location: editedUserData.location,
                service: editedUserData.service,
            };

            // If a new profile image URL was provided, save it
            if (profileImageUrl.trim()) {
                updateData.profileImageUrl = profileImageUrl.trim();
            }

            await updateDoc(userRef, updateData);

            // Update display name in Firebase Auth if changed
            if (editedUserData.displayName !== auth.currentUser?.displayName) {
                await user.updateProfile({
                    displayName: editedUserData.displayName
                });
            }

            Alert.alert('Success', 'Profile updated successfully!');
            setEditProfileModalVisible(false);
            fetchUserDetails(); // Refresh user data
        } catch (_error) {
            Alert.alert('Error', 'Failed to update profile. Please try again.');
            // console.log('Error updating profile:', _error);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmed':
            case 'accepted':
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
        return (
            <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                    <View style={styles.bookingTitleContainer}>
                        <Text style={styles.bookingGuideName}>{item.guideName}</Text>
                        <View style={styles.badgeContainer}>
                            {item.hasReview && (
                                <Text style={styles.reviewBadge}>★ Reviewed</Text>
                            )}
                            <Text style={[styles.statusBadgeText, getStatusStyle(item.status)]}>
                                {(item.status || 'pending').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.bookingStatus, { 
                        backgroundColor: getStatusStyle(item.status).backgroundColor,
                        borderColor: getStatusStyle(item.status).borderColor,
                    }]}>
                        <Text style={[styles.bookingStatusText, { color: getStatusStyle(item.status).color }]}>
                            {item.status || 'Pending'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.bookingLocation}>📍 {item.location}</Text>
                <Text style={styles.bookingDate}>📅 {(() => {
                    // Handle different date field possibilities
                    const date = item.date || item.dates || item.bookingDate;
                    
                    if (!date) {
                        return 'Date TBD';
                    }
                    
                    // If it's an array of dates (multiple days booking)
                    if (Array.isArray(date)) {
                        if (date.length === 1) {
                            return date[0];
                        } else if (date.length > 1) {
                            return `${date[0]} - ${date[date.length - 1]} (${date.length} days)`;
                        } else {
                            return 'Date TBD';
                        }
                    }
                    
                    // If it's a single date string
                    return date;
                })()}</Text>
                
                {/* Enhanced pricing information */}
                <View style={styles.pricingContainer}>
                    <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>💰 Daily Rate:</Text>
                        <Text style={styles.pricingValue}>৳{item.price || item.pricePerDay || 'N/A'}</Text>
                    </View>
                    {item.guests && item.price && (
                        <View style={styles.pricingRow}>
                            <Text style={styles.pricingLabel}>👥 Guests:</Text>
                            <Text style={styles.pricingValue}>{item.guests} people</Text>
                        </View>
                    )}
                    {item.totalPrice && (
                        <View style={styles.pricingRow}>
                            <Text style={styles.totalPriceLabel}>� Total Amount:</Text>
                            <Text style={styles.totalPriceValue}>৳{item.totalPrice}</Text>
                        </View>
                    )}
                </View>
                
                <View style={styles.bookingActions}>
                    {(item.status === 'confirmed' || item.status === 'accepted') ? (
                        item.hasReview ? (
                            <View style={styles.reviewedInfo}>
                                <Text style={styles.reviewedText}>✓ Already Reviewed</Text>
                            </View>
                        ) : (() => {
                            // Check if tour date has passed
                            const dateField = item.date || item.dates || item.bookingDate;
                            let tourDate = null;
                            
                            if (dateField) {
                                if (Array.isArray(dateField)) {
                                    // For multiple dates, use the last date to check completion
                                    tourDate = dateField.length > 0 ? new Date(dateField[dateField.length - 1]) : null;
                                } else {
                                    tourDate = new Date(dateField);
                                }
                            }
                            
                            const currentDate = new Date();
                            const tourCompleted = tourDate && tourDate < currentDate;
                            
                            return tourCompleted ? (
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
                            ) : (
                                <View style={styles.statusInfo}>
                                    <Text style={styles.statusText}>
                                        Review available after tour completion ({(() => {
                                            const dateField = item.date || item.dates || item.bookingDate;
                                            if (Array.isArray(dateField)) {
                                                return dateField.length > 0 ? dateField[dateField.length - 1] : 'Date TBD';
                                            }
                                            return dateField || 'Date TBD';
                                        })()})
                                    </Text>
                                </View>
                            );
                        })()
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
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    >
                        <View style={styles.profileCard}>
                            <View style={styles.profileImageContainer}>
                                {userData?.profileImageUrl ? (
                                    <Image
                                        source={{ uri: userData.profileImageUrl }}
                                        style={styles.profileImage}
                                    />
                                ) : (
                                    <View style={styles.defaultProfileIcon}>
                                        <MaterialIcons name="account-circle" size={108} color="#6200EE" />
                                    </View>
                                )}
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
                                    <Text style={styles.detailValue}>
                                        {userData?.createdAt ? 
                                            (() => {
                                                const date = userData.createdAt.toDate ? 
                                                    userData.createdAt.toDate() : 
                                                    new Date(userData.createdAt);
                                                return date.toLocaleDateString('en-GB', { 
                                                    day: 'numeric', 
                                                    month: 'long', 
                                                    year: 'numeric' 
                                                });
                                            })() : 
                                            'Recently'
                                        }
                                    </Text>
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
                        </View>

                        {/* Profile Actions */}
                        <View style={styles.profileActions}>
                            <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
                                <Text style={styles.actionIcon}>✏️</Text>
                                <Text style={styles.actionText}>Edit Profile</Text>
                            </TouchableOpacity>
                            
                            {/* <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionIcon}>⚙️</Text>
                                <Text style={styles.actionText}>Settings</Text>
                            </TouchableOpacity> */}
                            
                            {/* <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionIcon}>❓</Text>
                                <Text style={styles.actionText}>Help & Support</Text>
                            </TouchableOpacity> */}
                        </View>

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
                const filteredBookings = getFilteredBookings();
                const bookingCounts = getBookingCounts();
                
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>My Bookings</Text>
                        
                        {/* Booking Filter Buttons */}
                        <View style={styles.filterContainer}>
                            {[
                                { key: 'pending', label: 'Pending', icon: '⏳' },
                                { key: 'accepted', label: 'Accepted', icon: '✅' },
                                { key: 'cancelled', label: 'Cancelled', icon: '❌' },
                                { key: 'history', label: 'History', icon: '📜' }
                            ].map((filter) => (
                                <TouchableOpacity
                                    key={filter.key}
                                    style={[
                                        styles.filterButton,
                                        bookingFilter === filter.key && styles.activeFilterButton
                                    ]}
                                    onPress={() => setBookingFilter(filter.key)}
                                >
                                    <Text style={styles.filterIcon}>{filter.icon}</Text>
                                    <Text style={[
                                        styles.filterText,
                                        bookingFilter === filter.key && styles.activeFilterText
                                    ]}>
                                        {filter.label}
                                    </Text>
                                    <View style={[
                                        styles.filterCount,
                                        bookingFilter === filter.key && styles.activeFilterCount
                                    ]}>
                                        <Text style={[
                                            styles.filterCountText,
                                            bookingFilter === filter.key && styles.activeFilterCountText
                                        ]}>
                                            {bookingCounts[filter.key]}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        {filteredBookings.length > 0 ? (
                            <FlatList
                                data={filteredBookings}
                                renderItem={renderBookingItem}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                style={styles.bookingsList}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                                }
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>
                                    No {bookingFilter} bookings
                                </Text>
                                {bookingFilter === 'pending' && (
                                    <TouchableOpacity 
                                        style={styles.browseButton}
                                        onPress={() => router.push('/guide')}
                                    >
                                        <Text style={styles.browseButtonText}>Browse Guides</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                );
            case 'notifications':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>My Notifications</Text>
                        {userNotifications.length > 0 ? (
                            <FlatList
                                data={userNotifications}
                                renderItem={({ item }) => (
                                    <View style={styles.notificationCard}>
                                        <View style={styles.notificationHeader}>
                                            <Text style={styles.notificationTitle}>{item.title}</Text>
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    await deleteNotification(item.id, 'user');
                                                }}
                                                style={styles.deleteButton}
                                            >
                                                <MaterialIcons name="close" size={20} color="#666" />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.notificationMessage}>{item.message}</Text>
                                        {item.data && (
                                            <View style={styles.notificationDetails}>
                                                <Text style={styles.notificationDetailText}>
                                                    📍 {item.data.location}
                                                </Text>
                                                <Text style={styles.notificationDetailText}>
                                                    📅 {item.data.dates}
                                                </Text>
                                                <Text style={styles.notificationDetailText}>
                                                    💰 ৳{item.data.totalPrice}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.notificationTime}>
                                            {new Date(item.timestamp).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </View>
                                )}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                                }
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No notifications yet</Text>
                                <Text style={styles.emptyStateSubtext}>
                                    You&apos;ll receive updates about your bookings here
                                </Text>
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
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                                }
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
            {!isLoading && userData ? (
                <>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Profile</Text>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Text style={styles.logoutText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Navigation */}
                    <View style={styles.tabContainer}>
                        {['profile', 'bookings', 'notifications', 'reviews'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tabButton,
                                    activeTab === tab && styles.activeTabButton
                                ]}
                                onPress={() => {
                                    setActiveTab(tab);
                                    // When switching to bookings tab, refresh data and show pending by default
                                    if (tab === 'bookings') {
                                        setBookingFilter('pending');
                                        fetchUserBookings();
                                    }
                                }}
                            >
                                <Text style={[
                                    styles.tabButtonText,
                                    activeTab === tab && styles.activeTabButtonText
                                ]}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    {tab === 'notifications' && userNotifications.length > 0 && (
                                        <Text style={styles.notificationBadge}> ({userNotifications.length})</Text>
                                    )}
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

                    {/* Edit Profile Modal */}
                    <Modal
                        visible={editProfileModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setEditProfileModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Edit Profile</Text>
                                
                                <TextInput
                                    style={styles.editInput}
                                    placeholder="Profile Picture URL (optional)"
                                    value={profileImageUrl}
                                    onChangeText={setProfileImageUrl}
                                    multiline={false}
                                />
                                
                                {profileImageUrl.trim() && (
                                    <View style={styles.imagePreviewContainer}>
                                        <Text style={styles.imagePreviewLabel}>Preview:</Text>
                                        <Image
                                            source={{ uri: profileImageUrl }}
                                            style={styles.imagePreview}
                                            onError={() => Alert.alert('Invalid URL', 'Please enter a valid image URL')}
                                        />
                                    </View>
                                )}
                                
                                {/* <TextInput
                                    style={styles.editInput}
                                    placeholder="Display Name"
                                    value={editedUserData.displayName}
                                    onChangeText={(text) => setEditedUserData({ ...editedUserData, displayName: text })}
                                /> */}
                                
                                <TextInput
                                    style={styles.editInput}
                                    placeholder="Location"
                                    value={editedUserData.location}
                                    onChangeText={(text) => setEditedUserData({ ...editedUserData, location: text })}
                                />
                                
                                {/* <TextInput
                                    style={styles.editInput}
                                    placeholder="Service"
                                    value={editedUserData.service}
                                    onChangeText={(text) => setEditedUserData({ ...editedUserData, service: text })}
                                /> */}
                                
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setEditProfileModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={saveProfile}
                                    >
                                        <Text style={styles.submitButtonText}>Save Changes</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* Booking Status Change Modal */}
                    <Modal
                        visible={statusChangeModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setStatusChangeModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                {statusChanges.length > 0 && (
                                    <>
                                        <View style={styles.statusChangeHeader}>
                                            <Text style={styles.modalTitle}>
                                                {statusChanges[currentStatusChangeIndex]?.statusChangeType === 'approved' ? '✅ Booking Approved!' : '❌ Booking Rejected'}
                                            </Text>
                                            {statusChanges.length > 1 && (
                                                <Text style={styles.statusChangeCounter}>
                                                    {currentStatusChangeIndex + 1} of {statusChanges.length}
                                                </Text>
                                            )}
                                        </View>

                                        <View style={styles.statusChangeContent}>
                                            <View style={styles.statusChangeInfo}>
                                                <Text style={styles.statusChangeGuide}>
                                                    Guide: {statusChanges[currentStatusChangeIndex]?.guideName}
                                                </Text>
                                                <Text style={styles.statusChangeLocation}>
                                                    📍 {statusChanges[currentStatusChangeIndex]?.location}
                                                </Text>
                                                <Text style={styles.statusChangeDate}>
                                                    📅 {(() => {
                                                        const booking = statusChanges[currentStatusChangeIndex];
                                                        const date = booking?.date || booking?.dates || booking?.bookingDate;
                                                        
                                                        if (!date) {
                                                            return 'Date TBD';
                                                        }
                                                        
                                                        // If it's an array of dates (multiple days booking)
                                                        if (Array.isArray(date)) {
                                                            if (date.length === 1) {
                                                                return date[0];
                                                            } else if (date.length > 1) {
                                                                return `${date[0]} - ${date[date.length - 1]} (${date.length} days)`;
                                                            } else {
                                                                return 'Date TBD';
                                                            }
                                                        }
                                                        
                                                        // If it's a single date string
                                                        return date;
                                                    })()}
                                                </Text>
                                                {statusChanges[currentStatusChangeIndex]?.totalPrice && (
                                                    <Text style={styles.statusChangePrice}>
                                                        💰 ৳{statusChanges[currentStatusChangeIndex]?.totalPrice}
                                                    </Text>
                                                )}
                                            </View>

                                            <View style={styles.statusChangeMessage}>
                                                <Text style={[
                                                    styles.statusMessage,
                                                    { color: statusChanges[currentStatusChangeIndex]?.statusChangeType === 'approved' ? '#2E7D2E' : '#C62828' }
                                                ]}>
                                                    {statusChanges[currentStatusChangeIndex]?.statusChangeType === 'approved' 
                                                        ? 'Your booking has been approved by the guide! You can now proceed with your tour.'
                                                        : 'Unfortunately, your booking has been rejected by the guide. You can try booking with other guides.'
                                                    }
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.statusChangeActions}>
                                            {statusChanges.length > 1 && currentStatusChangeIndex < statusChanges.length - 1 ? (
                                                <TouchableOpacity
                                                    style={styles.nextButton}
                                                    onPress={() => setCurrentStatusChangeIndex(currentStatusChangeIndex + 1)}
                                                >
                                                    <Text style={styles.nextButtonText}>Next ({statusChanges.length - currentStatusChangeIndex - 1} more)</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.okButton}
                                                    onPress={() => {
                                                        setStatusChangeModalVisible(false);
                                                        setStatusChanges([]);
                                                        setCurrentStatusChangeIndex(0);
                                                        // Refresh bookings to show updated status
                                                        fetchUserBookings();
                                                    }}
                                                >
                                                    <Text style={styles.okButtonText}>OK</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </Modal>
                </>
            ) : (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                        {!authChecked ? 'Checking authentication...' : 'Loading profile...'}
                    </Text>
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
    defaultProfileIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 15,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#6200EE',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        overflow: 'hidden',
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
        justifyContent: 'center',
        gap: 30,
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
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    filterButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 3,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    activeFilterButton: {
        backgroundColor: '#6200EE',
        borderColor: '#6200EE',
        elevation: 4,
    },
    filterIcon: {
        fontSize: 16,
        marginBottom: 4,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    activeFilterText: {
        color: '#FFFFFF',
    },
    filterCount: {
        backgroundColor: '#F0F0F0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    activeFilterCount: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    filterCountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
    },
    activeFilterCountText: {
        color: '#FFFFFF',
    },
    bookingsList: {
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
        marginRight: 8,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
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
    pricingContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#4CAF50',
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    pricingLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    pricingValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    totalPriceLabel: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        marginTop: 4,
    },
    totalPriceValue: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginTop: 4,
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
        // marginTop: 10,
    },
    logoutCardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFE5E5',
        // marginTop: 50,
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
    imagePreviewContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    imagePreviewLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '600',
    },
    imagePreview: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: '#6200EE',
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
        width: '100%',
    },
    // Booking Status Change Modal Styles
    statusChangeHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    statusChangeCounter: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    statusChangeContent: {
        marginBottom: 25,
    },
    statusChangeInfo: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
    },
    statusChangeGuide: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    statusChangeLocation: {
        fontSize: 16,
        color: '#666',
        marginBottom: 5,
    },
    statusChangeDate: {
        fontSize: 16,
        color: '#666',
        marginBottom: 5,
    },
    statusChangePrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6200EE',
    },
    statusChangeMessage: {
        backgroundColor: '#f0f8ff',
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#6200EE',
    },
    statusMessage: {
        fontSize: 16,
        lineHeight: 22,
        textAlign: 'center',
    },
    statusChangeActions: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    nextButton: {
        backgroundColor: '#6200EE',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        minWidth: 120,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    okButton: {
        backgroundColor: '#2E7D2E',
        paddingHorizontal: 40,
        paddingVertical: 12,
        borderRadius: 25,
        minWidth: 120,
    },
    okButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    // Notification Styles
    notificationCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#6200EE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    deleteButton: {
        padding: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    notificationDetails: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    notificationDetailText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    notificationBadge: {
        color: '#6200EE',
        fontWeight: 'bold',
    },
});