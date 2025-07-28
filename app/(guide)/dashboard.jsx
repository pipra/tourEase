import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
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
import { auth, db } from '../(auth)/firebase';
import newBookingService from '../../utils/newBookingService';

const GuideDashboard = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [bookings, setBookings] = useState([]);
    const [bookingCategory, setBookingCategory] = useState('pending');
    const [guideData, setGuideData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [customerDetailsModalVisible, setCustomerDetailsModalVisible] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [newBookingModalVisible, setNewBookingModalVisible] = useState(false);
    const [newBookings, setNewBookings] = useState([]);
    const [currentNewBookingIndex, setCurrentNewBookingIndex] = useState(0);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [stats, setStats] = useState({
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        totalEarnings: 0,
        averageRating: 0,
    });

    const fetchData = useCallback(async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Fetch guide data
            const guideQuery = query(
                collection(db, 'guides'),
                where('userId', '==', user.uid)
            );
            const guideSnapshot = await getDocs(guideQuery);
            
            let guideDocId = user.uid; // Default fallback
            let guideInfo = null;
            if (!guideSnapshot.empty) {
                guideInfo = guideSnapshot.docs[0].data();
                guideDocId = guideSnapshot.docs[0].id;
                setGuideData({ id: guideDocId, ...guideInfo });
                setEditForm(guideInfo);
            }

            // Fetch bookings - check both userId and document ID
            const bookingsQuery = query(collection(db, 'bookings'));
            const bookingsSnapshot = await getDocs(bookingsQuery);
            const bookingsData = bookingsSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }))
                .filter(booking => 
                    booking.guideId === user.uid || booking.guideId === guideDocId
                )
                .sort((a, b) => {
                    // Sort by creation date first (latest first), then by booking date
                    const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
                    
                    // If creation dates are different, sort by creation date (latest first)
                    if (dateA.getTime() !== dateB.getTime()) {
                        return dateB.getTime() - dateA.getTime();
                    }
                    
                    // If creation dates are same or missing, sort by booking date (latest first)
                    const bookingDateA = a.date ? new Date(a.date) : new Date(0);
                    const bookingDateB = b.date ? new Date(b.date) : new Date(0);
                    return bookingDateB.getTime() - bookingDateA.getTime();
                });
            setBookings(bookingsData);
            
            // Debug: Log booking data structure
            console.log('Fetched bookings:', bookingsData);
            if (bookingsData.length > 0) {
                console.log('First booking structure:', bookingsData[0]);
                console.log('First booking dates:', bookingsData[0].dates);
                console.log('First booking date:', bookingsData[0].date);
            }

            // Calculate stats directly here
            const totalBookings = bookingsData.length;
            const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;
            const confirmedBookings = bookingsData.filter(b => b.status === 'confirmed').length;
            const totalEarnings = bookingsData
                .filter(b => b.status === 'confirmed')
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            setStats({
                totalBookings,
                pendingBookings,
                confirmedBookings,
                totalEarnings,
                averageRating: guideInfo?.rating || 0,
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Real-time booking listener
    useEffect(() => {
        let unsubscribe = null; // Declare the variable in this scope
        
        const setupBookingListener = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                // Get guide document ID first
                const guideQuery = query(
                    collection(db, 'guides'),
                    where('userId', '==', user.uid)
                );
                const guideSnapshot = await getDocs(guideQuery);
                let guideDocId = user.uid;
                if (!guideSnapshot.empty) {
                    guideDocId = guideSnapshot.docs[0].id;
                }

                // Set up real-time listener for bookings
                const bookingsQuery = query(
                    collection(db, 'bookings'),
                    where('guideId', 'in', [user.uid, guideDocId])
                );

                unsubscribe = onSnapshot(bookingsQuery, async (snapshot) => {
                    // Skip the initial load to avoid showing existing bookings as "new"
                    if (!initialLoadComplete) {
                        setInitialLoadComplete(true);
                        return;
                    }

                    const currentBookings = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    // Check for truly new bookings
                    const newBookingsList = await newBookingService.checkForNewBookings(currentBookings, user.uid);
                    
                    if (newBookingsList.length > 0) {
                        console.log(`Real-time: Found ${newBookingsList.length} new booking(s)`);
                        setNewBookings(newBookingsList);
                        setCurrentNewBookingIndex(0);
                        setNewBookingModalVisible(true);
                    }

                    // Update the bookings state for the dashboard
                    const sortedBookings = currentBookings.sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
                        const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
                        
                        if (dateA.getTime() !== dateB.getTime()) {
                            return dateB.getTime() - dateA.getTime();
                        }
                        
                        const bookingDateA = a.date ? new Date(a.date) : new Date(0);
                        const bookingDateB = b.date ? new Date(b.date) : new Date(0);
                        return bookingDateB.getTime() - bookingDateA.getTime();
                    });

                    setBookings(sortedBookings);

                    // Update stats
                    const totalBookings = sortedBookings.length;
                    const pendingBookings = sortedBookings.filter(b => b.status === 'pending').length;
                    const confirmedBookings = sortedBookings.filter(b => b.status === 'confirmed').length;
                    const totalEarnings = sortedBookings
                        .filter(b => b.status === 'confirmed')
                        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

                    setStats(prevStats => ({
                        ...prevStats,
                        totalBookings,
                        pendingBookings,
                        confirmedBookings,
                        totalEarnings,
                    }));
                }, (error) => {
                    console.error('Error in booking listener:', error);
                });

            } catch (error) {
                console.error('Error setting up booking listener:', error);
            }
        };

        setupBookingListener();

        // Cleanup on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [initialLoadComplete]); // Include initialLoadComplete in dependencies

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const handleBookingStatusUpdate = async (bookingId, newStatus) => {
        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: newStatus,
                updatedAt: new Date(),
            });
            
            Alert.alert('Success', `Booking ${newStatus} successfully`);
            fetchData();
        } catch (error) {
            console.error('Error updating booking:', error);
            Alert.alert('Error', 'Failed to update booking status');
        }
    };

    const handleShowCustomerDetails = (booking) => {
        console.log('=== BOOKING DETAILS DEBUG ===');
        console.log('Full booking object:', JSON.stringify(booking, null, 2));
        console.log('booking.dates:', booking.dates);
        console.log('booking.date:', booking.date);
        console.log('typeof booking.dates:', typeof booking.dates);
        console.log('Array.isArray(booking.dates):', Array.isArray(booking.dates));
        console.log('booking.dates length:', booking.dates?.length);
        console.log('=== END DEBUG ===');
        setSelectedBooking(booking);
        setCustomerDetailsModalVisible(true);
    };

    const handleCloseCustomerDetails = () => {
        setCustomerDetailsModalVisible(false);
        setSelectedBooking(null);
    };

    const handleProfileUpdate = async () => {
        try {
            if (!guideData?.id) return;

            await updateDoc(doc(db, 'guides', guideData.id), {
                ...editForm,
                updatedAt: new Date(),
            });

            setGuideData({ ...guideData, ...editForm });
            setEditModalVisible(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    onPress: async () => {
                        await signOut(auth);
                        router.replace('/');
                    },
                },
            ]
        );
    };

    // Handle new booking modal actions
    const handleNewBookingResponse = async (bookingId, action) => {
        try {
            if (action === 'accept') {
                await handleBookingStatusUpdate(bookingId, 'confirmed');
            } else if (action === 'reject') {
                await handleBookingStatusUpdate(bookingId, 'cancelled');
            }
            
            // Mark this booking as notified
            const user = auth.currentUser;
            if (user) {
                await newBookingService.markBookingsAsNotified([bookingId], user.uid);
            }
            
            // Move to next booking or close modal
            if (currentNewBookingIndex < newBookings.length - 1) {
                setCurrentNewBookingIndex(currentNewBookingIndex + 1);
            } else {
                setNewBookingModalVisible(false);
                setNewBookings([]);
                setCurrentNewBookingIndex(0);
            }
        } catch (error) {
            console.error('Error handling new booking response:', error);
            Alert.alert('Error', 'Failed to process booking request');
        }
    };

    const handleViewNewBookingDetails = () => {
        const currentBooking = newBookings[currentNewBookingIndex];
        setSelectedBooking(currentBooking);
        setNewBookingModalVisible(false);
        setCustomerDetailsModalVisible(true);
    };

    const handleSkipNewBooking = async () => {
        try {
            const currentBooking = newBookings[currentNewBookingIndex];
            const user = auth.currentUser;
            if (user && currentBooking) {
                await newBookingService.markBookingsAsNotified([currentBooking.id], user.uid);
            }
            
            // Move to next booking or close modal
            if (currentNewBookingIndex < newBookings.length - 1) {
                setCurrentNewBookingIndex(currentNewBookingIndex + 1);
            } else {
                setNewBookingModalVisible(false);
                setNewBookings([]);
                setCurrentNewBookingIndex(0);
            }
        } catch (error) {
            console.error('Error skipping new booking:', error);
        }
    };

    const handleCloseNewBookingModal = async () => {
        try {
            // Mark all remaining bookings as notified
            const user = auth.currentUser;
            if (user && newBookings.length > 0) {
                const remainingBookingIds = newBookings.slice(currentNewBookingIndex).map(b => b.id);
                await newBookingService.markBookingsAsNotified(remainingBookingIds, user.uid);
            }
            
            setNewBookingModalVisible(false);
            setNewBookings([]);
            setCurrentNewBookingIndex(0);
        } catch (error) {
            console.error('Error closing new booking modal:', error);
        }
    };

    // Test function to simulate new booking (for testing)
    const testNewBookingModal = () => {
        const testBooking = {
            id: 'test-booking-' + Date.now(),
            userName: 'John Doe',
            userEmail: 'john@example.com',
            guests: 3,
            totalPrice: 2500,
            status: 'pending',
            date: '2025-08-01',
            message: 'Looking forward to exploring Dhaka with your guidance! We are interested in historical sites and local food.'
        };
        
        setNewBookings([testBooking]);
        setCurrentNewBookingIndex(0);
        setNewBookingModalVisible(true);
    };

    // Function to get filtered bookings based on category
    const getFilteredBookings = () => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        
        const filtered = bookings.filter(booking => {
            // Handle both single date and multiple dates
            let isPastDate = false;
            
            if (Array.isArray(booking.dates) && booking.dates.length > 0) {
                // For multiple dates, consider expired if all dates are past
                isPastDate = booking.dates.every(date => date < currentDate);
            } else if (booking.date) {
                isPastDate = booking.date < currentDate;
            }
            
            switch(bookingCategory) {
                case 'pending':
                    return booking.status === 'pending'; // Show all pending regardless of date
                case 'accepted':
                    return booking.status === 'confirmed' && !isPastDate;
                case 'cancelled':
                    return booking.status === 'cancelled';
                case 'history':
                    return (booking.status === 'confirmed' && isPastDate);
                default:
                    return true;
            }
        });

        // Sort bookings based on category
        return filtered.sort((a, b) => {
            // Get the primary date for comparison (first date if multiple, or single date)
            const dateA = Array.isArray(a.dates) && a.dates.length > 0 
                ? new Date(a.dates[0]) 
                : new Date(a.date);
            const dateB = Array.isArray(b.dates) && b.dates.length > 0 
                ? new Date(b.dates[0]) 
                : new Date(b.date);
            
            const now = new Date();
            const currentDate = now.toISOString().split('T')[0];
            
            // For pending bookings, prioritize current/future dates over past dates
            if (bookingCategory === 'pending') {
                const aIsPast = Array.isArray(a.dates) && a.dates.length > 0 
                    ? a.dates.every(date => date < currentDate)
                    : a.date < currentDate;
                const bIsPast = Array.isArray(b.dates) && b.dates.length > 0 
                    ? b.dates.every(date => date < currentDate)
                    : b.date < currentDate;
                
                // If one is past and other is not, prioritize the non-past one
                if (aIsPast && !bIsPast) return 1;
                if (!aIsPast && bIsPast) return -1;
                
                // If both are past or both are current/future, sort by date
                if (aIsPast && bIsPast) {
                    // For past dates, show most recent first
                    return dateB - dateA;
                } else {
                    // For current/future dates, show earliest first
                    return dateA - dateB;
                }
            }
            
            // For cancelled bookings, show latest dates first
            if (bookingCategory === 'cancelled') {
                return dateB - dateA;
            }
            // For all other categories, show earliest dates first
            return dateA - dateB;
        });
    };

    const renderBookingItem = ({ item }) => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        
        // Handle both single date and multiple dates
        let bookingDate = item.date;
        let isPastDate = false;
        
        if (Array.isArray(item.dates) && item.dates.length > 0) {
            // For multiple dates, use the earliest date to determine if expired
            bookingDate = item.dates[0];
            isPastDate = item.dates.every(date => date < currentDate);
        } else if (item.date) {
            isPastDate = bookingDate < currentDate;
        }
        
        return (
            <TouchableOpacity 
                style={[
                    styles.bookingCard,
                    isPastDate && item.status === 'pending' && styles.expiredBookingCard
                ]}
                onPress={() => handleShowCustomerDetails(item)}
                activeOpacity={0.7}
            >
                <View style={styles.bookingHeader}>
                    <Text style={styles.bookingTitle}>{item.userName}</Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                        </View>
                        {isPastDate && item.status === 'pending' && (
                            <View style={styles.expiredBadge}>
                                <Text style={styles.expiredText}>EXPIRED</Text>
                            </View>
                        )}
                    </View>
                </View>
                
                <Text style={[
                    styles.bookingDetail,
                    isPastDate && item.status === 'pending' && styles.expiredText
                ]}>
                    📅 {(() => {
                        if (Array.isArray(item.dates) && item.dates.length > 0) {
                            return item.dates.join(', ');
                        } else if (item.date) {
                            return item.date;
                        } else {
                            return 'No date specified';
                        }
                    })()} {isPastDate && item.status === 'pending' && '(Past Date)'}
                </Text>
                <Text style={styles.bookingDetail}>👥 {item.guests} guests</Text>
                <Text style={styles.bookingDetail}>💰 ৳{item.totalPrice}</Text>
                <Text style={styles.bookingDetail}>📧 {item.userEmail}</Text>
                
                {item.status === 'pending' && (
                    <View style={styles.bookingActions}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton, 
                                styles.confirmButton,
                                isPastDate && styles.disabledButton
                            ]}
                            onPress={(e) => {
                                e.stopPropagation();
                                if (!isPastDate) {
                                    handleBookingStatusUpdate(item.id, 'confirmed');
                                }
                            }}
                            disabled={isPastDate}
                        >
                            <Text style={[
                                styles.actionButtonText,
                                isPastDate && styles.disabledButtonText
                            ]}>
                                {isPastDate ? 'Expired' : 'Confirm'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleBookingStatusUpdate(item.id, 'cancelled');
                            }}
                        >
                            <Text style={styles.actionButtonText}>
                                {isPastDate ? 'Remove' : 'Reject'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderProfileTab = () => (
        <ScrollView style={styles.profileContainer} showsVerticalScrollIndicator={false}>
            {guideData && (
                <>
                    {/* Profile Header Card */}
                    <View style={styles.profileHeaderCard}>
                        <View style={styles.profileImageContainer}>
                            <Image source={{ uri: guideData.image }} style={styles.profileImage} />
                        </View>
                        
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{guideData.name}</Text>
                            <View style={styles.locationRow}>
                                <Text style={styles.locationIcon}>📍</Text>
                                <Text style={styles.profileLocation}>{guideData.location}</Text>
                            </View>
                            
                            <View style={styles.profileStats}>
                                <View style={styles.statItem}>
                                    <View style={styles.ratingBadge}>
                                        <Text style={styles.ratingText}>⭐ {guideData.rating || 0}</Text>
                                    </View>
                                    <Text style={styles.statLabel}>{guideData.reviews || 0} reviews</Text>
                                </View>
                                
                                <View style={styles.statDivider}></View>
                                
                                <View style={styles.statItem}>
                                    <Text style={styles.experienceNumber}>{guideData.experience}</Text>
                                    <Text style={styles.statLabel}>Years Experience</Text>
                                </View>
                                
                                <View style={styles.statDivider}></View>
                                
                                <View style={styles.statItem}>
                                    <Text style={styles.priceNumber}>৳{guideData.pricePerDay}</Text>
                                    <Text style={styles.statLabel}>Per Day</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Quick Stats Cards */}
                    <View style={styles.quickStatsRow}>
                        <View style={styles.quickStatCard}>
                            <Text style={styles.quickStatNumber}>{stats.totalBookings}</Text>
                            <Text style={styles.quickStatLabel}>Total Bookings</Text>
                        </View>
                        <View style={styles.quickStatCard}>
                            <Text style={styles.quickStatNumber}>{stats.confirmedBookings}</Text>
                            <Text style={styles.quickStatLabel}>Confirmed</Text>
                        </View>
                        <View style={styles.quickStatCard}>
                            <Text style={styles.quickStatNumber}>৳{stats.totalEarnings}</Text>
                            <Text style={styles.quickStatLabel}>Earnings</Text>
                        </View>
                    </View>

                    {/* Profile Details Cards */}
                    <View style={styles.detailsSection}>
                        <View style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailIcon}>🌐</Text>
                                <Text style={styles.detailTitle}>Languages</Text>
                            </View>
                            <Text style={styles.detailContent}>{guideData.languages}</Text>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailIcon}>⭐</Text>
                                <Text style={styles.detailTitle}>Specialties</Text>
                            </View>
                            <Text style={styles.detailContent}>{guideData.specialties}</Text>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailIcon}>📝</Text>
                                <Text style={styles.detailTitle}>About Me</Text>
                            </View>
                            <Text style={styles.detailContent}>{guideData.bio}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setEditModalVisible(true)}
                    >
                        <Text style={styles.editButtonIcon}>✏️</Text>
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );

    const renderStatsTab = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.totalBookings}</Text>
                    <Text style={styles.statLabel}>Total Bookings</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.pendingBookings}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.confirmedBookings}</Text>
                    <Text style={styles.statLabel}>Confirmed</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>৳{stats.totalEarnings}</Text>
                    <Text style={styles.statLabel}>Total Earnings</Text>
                </View>
            </View>
        </View>
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#FF9800';
            case 'confirmed': return '#4CAF50';
            case 'cancelled': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Guide Dashboard</Text>
                <View style={styles.headerActions}>
                    {/* <TouchableOpacity 
                        onPress={testNewBookingModal} 
                        style={[styles.logoutButton, { backgroundColor: '#FF9800', marginRight: 10 }]}
                    >
                        <Text style={styles.logoutText}>🔔</Text>
                    </TouchableOpacity> */}
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                    onPress={() => setActiveTab('profile')}
                >
                    <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
                        Profile
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
                    onPress={() => setActiveTab('bookings')}
                >
                    <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
                        Bookings
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
                    onPress={() => setActiveTab('stats')}
                >
                    <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
                        Statistics
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {activeTab === 'profile' && renderProfileTab()}
                
                {activeTab === 'bookings' && (
                    <View style={styles.bookingsContainer}>
                        {/* Category Filter Buttons */}
                        <View style={styles.categoryContainer}>
                            {[
                                { key: 'pending', label: 'Pending', icon: '⏳' },
                                { key: 'accepted', label: 'Accepted', icon: '✅' },
                                { key: 'cancelled', label: 'Cancelled', icon: '❌' },
                                { key: 'history', label: 'History', icon: '📜' }
                            ].map((category) => {
                                const count = bookings.filter(booking => {
                                    const now = new Date();
                                    const currentDate = now.toISOString().split('T')[0];
                                    
                                    // Handle both single date and multiple dates
                                    let isPastDate = false;
                                    
                                    if (Array.isArray(booking.dates) && booking.dates.length > 0) {
                                        // For multiple dates, consider expired if all dates are past
                                        isPastDate = booking.dates.every(date => date < currentDate);
                                    } else if (booking.date) {
                                        isPastDate = booking.date < currentDate;
                                    }
                                    
                                    switch(category.key) {
                                        case 'pending':
                                            return booking.status === 'pending'; // Show all pending regardless of date
                                        case 'accepted':
                                            return booking.status === 'confirmed' && !isPastDate;
                                        case 'cancelled':
                                            return booking.status === 'cancelled';
                                        case 'history':
                                            return (booking.status === 'confirmed' && isPastDate);
                                        default:
                                            return false;
                                    }
                                }).length;

                                return (
                                    <TouchableOpacity
                                        key={category.key}
                                        style={[
                                            styles.categoryButton,
                                            bookingCategory === category.key && styles.activeCategoryButton
                                        ]}
                                        onPress={() => setBookingCategory(category.key)}
                                    >
                                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                                        <Text style={[
                                            styles.categoryButtonText,
                                            bookingCategory === category.key && styles.activeCategoryButtonText
                                        ]}>
                                            {category.label}
                                        </Text>
                                        <View style={[
                                            styles.categoryCount,
                                            bookingCategory === category.key && styles.activeCategoryCount
                                        ]}>
                                            <Text style={[
                                                styles.categoryCountText,
                                                bookingCategory === category.key && styles.activeCategoryCountText
                                            ]}>
                                                {count}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Bookings List */}
                        <FlatList
                            data={getFilteredBookings()}
                            renderItem={renderBookingItem}
                            keyExtractor={(item) => item.id}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
                            }
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.bookingsList}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No {bookingCategory} bookings found</Text>
                            }
                        />
                    </View>
                )}
                
                {activeTab === 'stats' && renderStatsTab()}
            </View>

            {/* Edit Profile Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Bio"
                            value={editForm.bio}
                            onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
                            multiline
                        />
                        
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Languages"
                            value={editForm.languages}
                            onChangeText={(text) => setEditForm({ ...editForm, languages: text })}
                        />
                        
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Specialties"
                            value={editForm.specialties}
                            onChangeText={(text) => setEditForm({ ...editForm, specialties: text })}
                        />
                        
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Daily Rate"
                            value={editForm.pricePerDay?.toString()}
                            onChangeText={(text) => setEditForm({ ...editForm, pricePerDay: parseInt(text) || 0 })}
                            keyboardType="numeric"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleProfileUpdate}
                            >
                                <Text style={styles.modalButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Customer Details Modal */}
            <Modal
                visible={customerDetailsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCloseCustomerDetails}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.customerModalContent}>
                        {selectedBooking && (
                            <>
                                <View style={styles.customerModalHeader}>
                                    <Text style={styles.customerModalTitle}>Customer Details</Text>
                                    <TouchableOpacity 
                                        style={styles.closeButton}
                                        onPress={handleCloseCustomerDetails}
                                    >
                                        <Text style={styles.closeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <ScrollView 
                                    style={styles.customerInfoScrollView}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <View style={styles.customerInfoCard}>
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoIcon}>👤</Text>
                                            <View style={styles.customerInfoContent}>
                                                <Text style={styles.customerInfoLabel}>Customer Name</Text>
                                                <Text style={styles.customerInfoValue}>{selectedBooking.userName}</Text>
                                            </View>
                                        </View>

                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoIcon}>📧</Text>
                                        <View style={styles.customerInfoContent}>
                                            <Text style={styles.customerInfoLabel}>Email</Text>
                                            <Text style={styles.customerInfoValue}>{selectedBooking.userEmail}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoIcon}>📅</Text>
                                        <View style={styles.customerInfoContent}>
                                            <Text style={styles.customerInfoLabel}>
                                                {selectedBooking.dates && Array.isArray(selectedBooking.dates) && selectedBooking.dates.length > 1 
                                                    ? 'Booking Dates' 
                                                    : 'Booking Date'}
                                            </Text>
                                            <Text style={styles.customerInfoValue}>
                                                {selectedBooking.dates && Array.isArray(selectedBooking.dates) && selectedBooking.dates.length > 0 
                                                    ? selectedBooking.dates.join(', ') 
                                                    : selectedBooking.date || 'No date specified'}
                                            </Text>
                                            {Array.isArray(selectedBooking.dates) && selectedBooking.dates.length > 1 && (
                                                <Text style={styles.customerInfoSubValue}>
                                                    Total: {selectedBooking.dates.length} day{selectedBooking.dates.length !== 1 ? 's' : ''}
                                                </Text>
                                            )}
                                            {selectedBooking.pricePerDay && (
                                                <Text style={styles.customerInfoSubValue}>
                                                    Rate: ৳{selectedBooking.pricePerDay}/day
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoIcon}>👥</Text>
                                        <View style={styles.customerInfoContent}>
                                            <Text style={styles.customerInfoLabel}>Number of Guests</Text>
                                            <Text style={styles.customerInfoValue}>{selectedBooking.guests} guests</Text>
                                        </View>
                                    </View>

                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoIcon}>💰</Text>
                                        <View style={styles.customerInfoContent}>
                                            <Text style={styles.customerInfoLabel}>Total Amount</Text>
                                            <Text style={styles.customerInfoValue}>৳{selectedBooking.totalPrice}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoIcon}>📋</Text>
                                        <View style={styles.customerInfoContent}>
                                            <Text style={styles.customerInfoLabel}>Status</Text>
                                            <View style={[styles.statusBadgeModal, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
                                                <Text style={styles.statusTextModal}>{selectedBooking.status.toUpperCase()}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {selectedBooking.createdAt && (
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoIcon}>🕐</Text>
                                            <View style={styles.customerInfoContent}>
                                                <Text style={styles.customerInfoLabel}>Booking Created</Text>
                                                <Text style={styles.customerInfoValue}>
                                                    {new Date(selectedBooking.createdAt.seconds * 1000).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {selectedBooking.message && (
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoIcon}>💬</Text>
                                            <View style={styles.customerInfoContent}>
                                                <Text style={styles.customerInfoLabel}>Customer Message</Text>
                                                <Text style={styles.customerInfoValue}>
                                                    {selectedBooking.message}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                                </ScrollView>

                                {selectedBooking.status === 'pending' && (
                                    <View style={styles.customerModalActions}>
                                        {(() => {
                                            const now = new Date();
                                            const currentDate = now.toISOString().split('T')[0];
                                            
                                            // Handle both single date and multiple dates
                                            let isPastDate = false;
                                            
                                            if (Array.isArray(selectedBooking.dates) && selectedBooking.dates.length > 0) {
                                                // For multiple dates, consider expired if all dates are past
                                                isPastDate = selectedBooking.dates.every(date => date < currentDate);
                                            } else if (selectedBooking.date) {
                                                isPastDate = selectedBooking.date < currentDate;
                                            }
                                            
                                            if (isPastDate) {
                                                return (
                                                    <>
                                                        <View style={[styles.customerActionButton, styles.expiredNotice]}>
                                                            <Text style={styles.expiredNoticeText}>⚠️ This booking request has expired (past date)</Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[styles.customerActionButton, styles.customerRejectButton]}
                                                            onPress={() => {
                                                                handleBookingStatusUpdate(selectedBooking.id, 'cancelled');
                                                                handleCloseCustomerDetails();
                                                            }}
                                                        >
                                                            <Text style={styles.customerActionButtonText}>✗ Remove Request</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                );
                                            } else {
                                                return (
                                                    <>
                                                        <TouchableOpacity
                                                            style={[styles.customerActionButton, styles.customerConfirmButton]}
                                                            onPress={() => {
                                                                handleBookingStatusUpdate(selectedBooking.id, 'confirmed');
                                                                handleCloseCustomerDetails();
                                                            }}
                                                        >
                                                            <Text style={styles.customerActionButtonText}>✓ Confirm Booking</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[styles.customerActionButton, styles.customerRejectButton]}
                                                            onPress={() => {
                                                                handleBookingStatusUpdate(selectedBooking.id, 'cancelled');
                                                                handleCloseCustomerDetails();
                                                            }}
                                                        >
                                                            <Text style={styles.customerActionButtonText}>✗ Reject Booking</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                );
                                            }
                                        })()}
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* New Booking Notification Modal */}
            <Modal
                visible={newBookingModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={handleCloseNewBookingModal}
            >
                <View style={styles.newBookingModalOverlay}>
                    <View style={styles.newBookingModalContent}>
                        {newBookings.length > 0 && currentNewBookingIndex < newBookings.length && (
                            <>
                                <View style={styles.newBookingHeader}>
                                    <Text style={styles.newBookingTitle}>🎉 New Booking Request!</Text>
                                    <TouchableOpacity 
                                        style={styles.newBookingCloseButton}
                                        onPress={handleCloseNewBookingModal}
                                    >
                                        <Text style={styles.newBookingCloseText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                {newBookings.length > 1 && (
                                    <Text style={styles.newBookingCounter}>
                                        {currentNewBookingIndex + 1} of {newBookings.length} new requests
                                    </Text>
                                )}

                                <View style={styles.newBookingDetails}>
                                    <View style={styles.newBookingRow}>
                                        <Text style={styles.newBookingIcon}>👤</Text>
                                        <Text style={styles.newBookingText}>
                                            <Text style={styles.newBookingLabel}>Customer: </Text>
                                            {newBookings[currentNewBookingIndex]?.userName}
                                        </Text>
                                    </View>

                                    <View style={styles.newBookingRow}>
                                        <Text style={styles.newBookingIcon}>📅</Text>
                                        <Text style={styles.newBookingText}>
                                            <Text style={styles.newBookingLabel}>Date: </Text>
                                            {(() => {
                                                const booking = newBookings[currentNewBookingIndex];
                                                if (Array.isArray(booking?.dates) && booking.dates.length > 0) {
                                                    return booking.dates.length > 1 
                                                        ? `${booking.dates[0]} to ${booking.dates[booking.dates.length - 1]} (${booking.dates.length} days)`
                                                        : booking.dates[0];
                                                } else if (booking?.date) {
                                                    return booking.date;
                                                } else {
                                                    return 'Date TBD';
                                                }
                                            })()}
                                        </Text>
                                    </View>

                                    <View style={styles.newBookingRow}>
                                        <Text style={styles.newBookingIcon}>👥</Text>
                                        <Text style={styles.newBookingText}>
                                            <Text style={styles.newBookingLabel}>Guests: </Text>
                                            {newBookings[currentNewBookingIndex]?.guests} people
                                        </Text>
                                    </View>

                                    <View style={styles.newBookingRow}>
                                        <Text style={styles.newBookingIcon}>💰</Text>
                                        <Text style={styles.newBookingText}>
                                            <Text style={styles.newBookingLabel}>Amount: </Text>
                                            ৳{newBookings[currentNewBookingIndex]?.totalPrice}
                                        </Text>
                                    </View>

                                    {newBookings[currentNewBookingIndex]?.message && (
                                        <View style={styles.newBookingMessageContainer}>
                                            <Text style={styles.newBookingMessageLabel}>Message:</Text>
                                            <Text style={styles.newBookingMessage}>
                                                &ldquo;{newBookings[currentNewBookingIndex].message}&rdquo;
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.newBookingActions}>
                                    <TouchableOpacity
                                        style={[styles.newBookingButton, styles.acceptButton]}
                                        onPress={() => handleNewBookingResponse(newBookings[currentNewBookingIndex]?.id, 'accept')}
                                    >
                                        <Text style={styles.newBookingButtonText}>✓ Accept</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.newBookingButton, styles.newBookingRejectButton]}
                                        onPress={() => handleNewBookingResponse(newBookings[currentNewBookingIndex]?.id, 'reject')}
                                    >
                                        <Text style={styles.newBookingButtonText}>✗ Reject</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.newBookingSecondaryActions}>
                                    <TouchableOpacity
                                        style={styles.newBookingSecondaryButton}
                                        onPress={handleViewNewBookingDetails}
                                    >
                                        <Text style={styles.newBookingSecondaryButtonText}>View Full Details</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.newBookingSecondaryButton}
                                        onPress={handleSkipNewBooking}
                                    >
                                        <Text style={styles.newBookingSecondaryButtonText}>
                                            {newBookings.length > 1 ? 'Skip & Next' : 'Decide Later'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
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
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#6200EE',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoutButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    logoutText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#6200EE',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: '#6200EE',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    bookingsList: {
        padding: 20,
    },
    bookingCard: {
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
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    bookingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    expiredBookingCard: {
        backgroundColor: '#FFF8F0',
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
        opacity: 0.9,
    },
    expiredBadge: {
        backgroundColor: '#FF9800',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },
    expiredText: {
        color: '#FF9800',
        fontSize: 10,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#CCCCCC',
        opacity: 0.6,
    },
    disabledButtonText: {
        color: '#666666',
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    bookingDetail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    bookingActions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#F44336',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    profileContainer: {
        flex: 1,
    },
    profileHeaderCard: {
        backgroundColor: '#FFFFFF',
        margin: 20,
        borderRadius: 20,
        padding: 25,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#6200EE',
    },
    profileInfo: {
        alignItems: 'center',
    },
    profileName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    locationIcon: {
        fontSize: 16,
        marginRight: 5,
    },
    profileLocation: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    profileStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 10,
    },
    ratingBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 5,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF9800',
    },
    experienceNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 5,
    },
    priceNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
    quickStatsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    quickStatCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 5,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    quickStatNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 4,
    },
    quickStatLabel: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
    detailsSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    detailCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    detailContent: {
        fontSize: 16,
        color: '#555',
        lineHeight: 24,
    },
    editButton: {
        backgroundColor: '#6200EE',
        borderRadius: 15,
        paddingVertical: 15,
        paddingHorizontal: 20,
        margin: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    editButtonIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    statsContainer: {
        padding: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '48%',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 5,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 50,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#F44336',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Customer Details Modal Styles
    customerModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 0,
        width: '95%',
        maxHeight: '85%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    customerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    customerModalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
    },
    customerInfoCard: {
        padding: 20,
    },
    customerInfoScrollView: {
        maxHeight: 400,
        flexGrow: 1,
    },
    customerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    customerInfoIcon: {
        fontSize: 20,
        marginRight: 15,
        width: 25,
        textAlign: 'center',
    },
    customerInfoContent: {
        flex: 1,
    },
    customerInfoLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        fontWeight: '500',
    },
    customerInfoValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
    customerInfoSubValue: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 2,
    },
    statusBadgeModal: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        alignSelf: 'flex-start',
    },
    statusTextModal: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    customerModalActions: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 15,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    customerActionButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    customerConfirmButton: {
        backgroundColor: '#4CAF50',
    },
    customerRejectButton: {
        backgroundColor: '#F44336',
    },
    customerActionButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    expiredNotice: {
        backgroundColor: '#FFF3CD',
        borderWidth: 1,
        borderColor: '#FF9800',
        flex: 2,
        marginRight: 8,
    },
    expiredNoticeText: {
        color: '#856404',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    
    // Category Filter Styles
    bookingsContainer: {
        flex: 1,
    },
    categoryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 20,
        paddingTop: 15,
    },
    categoryButton: {
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
    activeCategoryButton: {
        backgroundColor: '#6200EE',
        borderColor: '#6200EE',
        elevation: 4,
    },
    categoryIcon: {
        fontSize: 16,
        marginBottom: 4,
    },
    categoryButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
        textAlign: 'center',
    },
    activeCategoryButtonText: {
        color: '#FFFFFF',
    },
    categoryCount: {
        backgroundColor: '#F0F0F0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    activeCategoryCount: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    categoryCountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
    },
    activeCategoryCountText: {
        color: '#FFFFFF',
    },

    // New Booking Modal Styles
    newBookingModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    newBookingModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        width: '100%',
        maxWidth: 400,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    newBookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    newBookingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    newBookingCloseButton: {
        backgroundColor: '#f0f0f0',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newBookingCloseText: {
        fontSize: 16,
        color: '#666',
        fontWeight: 'bold',
    },
    newBookingCounter: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    newBookingDetails: {
        marginBottom: 25,
    },
    newBookingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    newBookingIcon: {
        fontSize: 18,
        marginRight: 12,
        width: 25,
    },
    newBookingText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    newBookingLabel: {
        fontWeight: 'bold',
        color: '#555',
    },
    newBookingMessageContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 15,
        marginTop: 10,
    },
    newBookingMessageLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 5,
    },
    newBookingMessage: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    newBookingActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        gap: 10,
    },
    newBookingButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    newBookingRejectButton: {
        backgroundColor: '#f44336',
    },
    newBookingButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    newBookingSecondaryActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    newBookingSecondaryButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
    },
    newBookingSecondaryButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default GuideDashboard;
