import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
    collection,
    doc,
    getDocs,
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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../(auth)/firebase';

const GuideDashboard = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [bookings, setBookings] = useState([]);
    const [guideData, setGuideData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [customerDetailsModalVisible, setCustomerDetailsModalVisible] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
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
                );
            setBookings(bookingsData);

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

    const renderBookingItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.bookingCard}
            onPress={() => handleShowCustomerDetails(item)}
            activeOpacity={0.7}
        >
            <View style={styles.bookingHeader}>
                <Text style={styles.bookingTitle}>{item.userName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>
            
            <Text style={styles.bookingDetail}>📅 {item.date}</Text>
            <Text style={styles.bookingDetail}>👥 {item.guests} guests</Text>
            <Text style={styles.bookingDetail}>💰 ৳{item.totalPrice}</Text>
            <Text style={styles.bookingDetail}>📧 {item.userEmail}</Text>
            
            {item.status === 'pending' && (
                <View style={styles.bookingActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleBookingStatusUpdate(item.id, 'confirmed');
                        }}
                    >
                        <Text style={styles.actionButtonText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleBookingStatusUpdate(item.id, 'cancelled');
                        }}
                    >
                        <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderProfileTab = () => (
        <View style={styles.profileContainer}>
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
        </View>
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
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
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
                    <FlatList
                        data={bookings}
                        renderItem={renderBookingItem}
                        keyExtractor={(item) => item.id}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
                        }
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.bookingsList}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No bookings found</Text>
                        }
                    />
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
                                            <Text style={styles.customerInfoLabel}>Booking Date</Text>
                                            <Text style={styles.customerInfoValue}>{selectedBooking.date}</Text>
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
                                </View>

                                {selectedBooking.status === 'pending' && (
                                    <View style={styles.customerModalActions}>
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
                                    </View>
                                )}
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
});

export default GuideDashboard;
