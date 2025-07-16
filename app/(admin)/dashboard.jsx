import { router } from 'expo-router';
import {
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../(auth)/firebase';

// Default places data (existing places)
const DEFAULT_PLACES = [
    {
        id: 'default-1',
        name: "Cox's Bazar",
        description: "World's longest natural sea beach with 120km of sandy coastline",
        category: 'Beach',
        attractions: ['Longest sea beach', 'Sunset views', 'Water sports', 'Fresh seafood'],
        bestTimeToVisit: 'November - March',
        averageTemperature: '25-30°C',
        language: 'Bengali',
        currency: 'BDT',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
        isDefault: true,
    },
    {
        id: 'default-2',
        name: 'Sundarbans',
        description: 'Largest mangrove forest in the world, home to Royal Bengal Tigers',
        category: 'Forest',
        attractions: ['Royal Bengal Tigers', 'Mangrove ecosystem', 'Boat safari', 'Wildlife photography'],
        bestTimeToVisit: 'October - March',
        averageTemperature: '20-28°C',
        language: 'Bengali',
        currency: 'BDT',
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=400&q=80',
        isDefault: true,
    },
    {
        id: 'default-3',
        name: 'Sylhet',
        description: 'Tea capital of Bangladesh with rolling hills and tea gardens',
        category: 'Hills',
        attractions: ['Tea gardens', 'Jaflong', 'Ratargul swamp forest', 'Seven-layer tea'],
        bestTimeToVisit: 'October - April',
        averageTemperature: '18-25°C',
        language: 'Bengali',
        currency: 'BDT',
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80',
        isDefault: true,
    },
    {
        id: 'default-4',
        name: 'Bandarban',
        description: 'Hill district with highest peaks and indigenous communities',
        category: 'Hills',
        attractions: ['Keokradong peak', 'Nilgiri', 'Tribal culture', 'Cloud watching'],
        bestTimeToVisit: 'October - March',
        averageTemperature: '15-22°C',
        language: 'Bengali',
        currency: 'BDT',
        image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80',
        isDefault: true,
    },
    {
        id: 'default-5',
        name: 'Rangamati',
        description: 'Lake city with beautiful Kaptai Lake and tribal heritage',
        category: 'Lake',
        attractions: ['Kaptai Lake', 'Hanging bridge', 'Tribal museums', 'Boat rides'],
        bestTimeToVisit: 'October - March',
        averageTemperature: '18-28°C',
        language: 'Bengali',
        currency: 'BDT',
        image: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=400&q=80',
        isDefault: true,
    },
    {
        id: 'default-6',
        name: "Saint Martin's Island",
        description: "Bangladesh's only coral island with pristine beaches",
        category: 'Island',
        attractions: ['Coral island', 'Clear blue water', 'Coconut trees', 'Marine life'],
        bestTimeToVisit: 'November - February',
        averageTemperature: '24-30°C',
        language: 'Bengali',
        currency: 'BDT',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=400&q=80',
        isDefault: true,
    },
];

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [guides, setGuides] = useState([]);
    const [guideApplications, setGuideApplications] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [locations, setLocations] = useState([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalGuides: 0,
        totalBookings: 0,
        pendingBookings: 0,
        pendingGuideApplications: 0,
    });
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationForm, setLocationForm] = useState({
        name: '',
        description: '',
        category: '',
        attractions: '',
        bestTimeToVisit: '',
        averageTemperature: '',
        language: '',
        currency: '',
        image: '',
    });

    useEffect(() => {
        checkAdminAccess();
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAdminAccess = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Access Denied', 'You must be logged in to access admin panel', [
                { text: 'OK', onPress: () => router.push('/') }
            ]);
            return;
        }

        try {
            // Check user type from Firestore instead of hardcoded email
            const userDoc = await getDoc(doc(db, 'Users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.userType !== 'admin') {
                    Alert.alert('Access Denied', 'You do not have admin privileges', [
                        { text: 'OK', onPress: () => router.push('/') }
                    ]);
                }
            } else {
                Alert.alert('Access Denied', 'User data not found', [
                    { text: 'OK', onPress: () => router.push('/') }
                ]);
            }
        } catch (_error) {
            console.error('Error checking admin access:', _error);
            Alert.alert('Error', 'Failed to verify admin access', [
                { text: 'OK', onPress: () => router.push('/') }
            ]);
        }
    }, []);

    const fetchData = async () => {
        try {
            await Promise.all([
                fetchUsers(),
                fetchGuides(),
                fetchGuideApplications(),
                fetchBookings(),
                fetchReviews(),
                fetchLocations(),
                fetchStats(),
            ]);
        } catch (_error) {
            console.error('Error fetching data:', _error);
        }
    };

    const fetchUsers = async () => {
        const q = query(collection(db, 'Users'));
        const querySnapshot = await getDocs(q);
        const usersData = [];
        querySnapshot.forEach((doc) => {
            usersData.push({ id: doc.id, ...doc.data() });
        });
        setUsers(usersData);
    };

    const fetchGuides = async () => {
        const q = query(collection(db, 'guides'));
        const querySnapshot = await getDocs(q);
        const guidesData = [];
        querySnapshot.forEach((doc) => {
            guidesData.push({ id: doc.id, ...doc.data() });
        });
        setGuides(guidesData);
    };

    const fetchGuideApplications = async () => {
        const q = query(collection(db, 'guide-applications'), orderBy('appliedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const applicationsData = [];
        querySnapshot.forEach((doc) => {
            applicationsData.push({ id: doc.id, ...doc.data() });
        });
        setGuideApplications(applicationsData);
    };

    const fetchBookings = async () => {
        const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const bookingsData = [];
        querySnapshot.forEach((doc) => {
            bookingsData.push({ id: doc.id, ...doc.data() });
        });
        setBookings(bookingsData);
    };

    const fetchReviews = async () => {
        const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const reviewsData = [];
        querySnapshot.forEach((doc) => {
            reviewsData.push({ id: doc.id, ...doc.data() });
        });
        setReviews(reviewsData);
    };

    const fetchLocations = async () => {
        try {
            const q = query(collection(db, 'locations'), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const firebaseLocations = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Transform Firebase data to match the expected format
                const transformedLocation = {
                    id: doc.id,
                    name: data.name || '',
                    description: data.description || '',
                    category: data.category || 'Other',
                    attractions: Array.isArray(data.attractions) ? data.attractions : 
                               (data.attractions ? data.attractions.split(',').map(s => s.trim()) : []),
                    bestTimeToVisit: data.bestTimeToVisit || 'Year round',
                    averageTemperature: data.averageTemperature || 'N/A',
                    language: data.language || 'Local',
                    currency: data.currency || 'Local currency',
                    image: data.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
                    isDefault: false,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                };
                firebaseLocations.push(transformedLocation);
            });

            // Combine default places with Firebase locations
            const allLocations = [...DEFAULT_PLACES, ...firebaseLocations];
            setLocations(allLocations);
        } catch (error) {
            console.error('Error fetching locations:', error);
            // If Firebase fails, still show default places
            setLocations(DEFAULT_PLACES);
        }
    };

    const fetchStats = async () => {
        try {
            const [usersSnap, guidesSnap, bookingsSnap, pendingSnap, pendingApplicationsSnap] = await Promise.all([
                getCountFromServer(collection(db, 'Users')),
                getCountFromServer(collection(db, 'guides')),
                getCountFromServer(collection(db, 'bookings')),
                getCountFromServer(query(collection(db, 'bookings'), where('status', '==', 'Pending'))),
                getCountFromServer(query(collection(db, 'guide-applications'), where('status', '==', 'pending'))),
            ]);

            setStats({
                totalUsers: usersSnap.data().count,
                totalGuides: guidesSnap.data().count,
                totalBookings: bookingsSnap.data().count,
                pendingBookings: pendingSnap.data().count,
                pendingGuideApplications: pendingApplicationsSnap.data().count,
            });
        } catch (_error) {
            console.error('Error fetching stats:', _error);
        }
    };

    const handleDeleteUser = async (userId) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this user?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'Users', userId));
                            fetchUsers();
                            Alert.alert('Success', 'User deleted successfully');
                        } catch (_error) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    },
                },
            ]
        );
    };

    const handleUpdateBookingStatus = async (bookingId, newStatus) => {
        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: newStatus,
                updatedAt: new Date(),
            });
            fetchBookings();
            fetchStats();
            Alert.alert('Success', 'Booking status updated');
        } catch (_error) {
            Alert.alert('Error', 'Failed to update booking status');
        }
    };

    const handleApproveGuideApplication = async (applicationId, applicationData) => {
        Alert.alert(
            'Approve Guide Application',
            'Are you sure you want to approve this guide application?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            // Move application to guides collection
                            await setDoc(doc(db, 'guides', applicationId), {
                                ...applicationData,
                                status: 'approved',
                                approvedAt: new Date(),
                            });

                            // Update application status
                            await updateDoc(doc(db, 'guide-applications', applicationId), {
                                status: 'approved',
                                approvedAt: new Date(),
                            });

                            fetchGuideApplications();
                            fetchGuides();
                            fetchStats();
                            Alert.alert('Success', 'Guide application approved successfully');
                        } catch (_error) {
                            Alert.alert('Error', 'Failed to approve guide application');
                        }
                    },
                },
            ]
        );
    };

    const handleRejectGuideApplication = async (applicationId) => {
        Alert.alert(
            'Reject Guide Application',
            'Are you sure you want to reject this guide application?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'guide-applications', applicationId), {
                                status: 'rejected',
                                rejectedAt: new Date(),
                            });

                            fetchGuideApplications();
                            fetchStats();
                            Alert.alert('Success', 'Guide application rejected');
                        } catch (_error) {
                            Alert.alert('Error', 'Failed to reject guide application');
                        }
                    },
                },
            ]
        );
    };

    const handleAddLocation = async () => {
        try {
            if (!locationForm.name.trim()) {
                Alert.alert('Error', 'Location name is required');
                return;
            }

            await setDoc(doc(collection(db, 'locations')), {
                ...locationForm,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            setLocationForm({
                name: '',
                description: '',
                category: '',
                attractions: '',
                bestTimeToVisit: '',
                averageTemperature: '',
                language: '',
                currency: '',
                image: '',
            });

            fetchLocations();
            setLocationModalVisible(false);
            Alert.alert('Success', 'Location added successfully');
        } catch (_error) {
            console.error('Error adding location:', _error);
            Alert.alert('Error', 'Failed to add location');
        }
    };

    const handleDeleteLocation = async (locationId) => {
        // Check if it's a default location
        const location = locations.find(loc => loc.id === locationId);
        if (location && location.isDefault) {
            Alert.alert('Cannot Delete', 'Default locations cannot be deleted');
            return;
        }

        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this location?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'locations', locationId));
                            fetchLocations();
                            Alert.alert('Success', 'Location deleted successfully');
                        } catch (_error) {
                            Alert.alert('Error', 'Failed to delete location');
                        }
                    },
                },
            ]
        );
    };

    const renderStatCard = (title, value, color) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
        </View>
    );

    const renderUserItem = ({ item }) => (
        <View style={styles.listItem}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.itemSubtitle}>{item.email}</Text>
                <Text style={styles.itemMeta}>Joined: {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</Text>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                        setSelectedItem(item);
                        setModalVisible(true);
                    }}
                >
                    <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUser(item.id)}
                >
                    <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGuideItem = ({ item }) => (
        <View style={styles.listItem}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.location}</Text>
                <Text style={styles.itemMeta}>Rating: {item.rating} | Price: ৳{item.price}/day</Text>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                        setSelectedItem(item);
                        setModalVisible(true);
                    }}
                >
                    <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderBookingItem = ({ item }) => (
        <View style={styles.listItem}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.userName} → {item.guideName}</Text>
                <Text style={styles.itemSubtitle}>{item.guideLocation}</Text>
                <Text style={styles.itemMeta}>
                    Date: {item.date} | Status: {item.status} | ৳{item.price}
                </Text>
            </View>
            <View style={styles.itemActions}>
                {item.status === 'Pending' && (
                    <>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => handleUpdateBookingStatus(item.id, 'Confirmed')}
                        >
                            <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleUpdateBookingStatus(item.id, 'Rejected')}
                        >
                            <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );

    const renderReviewItem = ({ item }) => (
        <View style={styles.listItem}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.userName} → {item.guideName}</Text>
                <Text style={styles.itemSubtitle}>{'⭐'.repeat(item.rating)} ({item.rating}/5)</Text>
                <Text style={styles.itemMeta}>{item.review}</Text>
            </View>
        </View>
    );

    const renderLocationItem = ({ item }) => (
        <View style={styles.listItem}>
            <View style={styles.itemInfo}>
                <View style={styles.locationItemHeader}>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                    {item.isDefault && (
                        <View style={styles.defaultLocationBadge}>
                            <Text style={styles.defaultLocationText}>Default</Text>
                        </View>
                    )}
                    {!item.isDefault && (
                        <View style={styles.adminLocationBadge}>
                            <Text style={styles.adminLocationText}>Admin Added</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.itemSubtitle}>{item.category} | {item.language}</Text>
                <Text style={styles.itemMeta}>
                    Best Time: {item.bestTimeToVisit} | Temp: {item.averageTemperature}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={2}>
                    {item.description}
                </Text>
                {item.attractions && item.attractions.length > 0 && (
                    <Text style={styles.attractionsText} numberOfLines={1}>
                        Attractions: {Array.isArray(item.attractions) ? item.attractions.join(', ') : item.attractions}
                    </Text>
                )}
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                        setSelectedItem(item);
                        setModalVisible(true);
                    }}
                >
                    <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
                {!item.isDefault && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteLocation(item.id)}
                    >
                        <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderGuideApplicationItem = ({ item }) => (
        <View style={styles.listItem}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.email} | {item.location}</Text>
                <Text style={styles.itemMeta}>
                    Status: {item.status} | Applied: {item.appliedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </Text>
                <Text style={styles.itemMeta}>
                    Experience: {item.experience} years | Price: ৳{item.pricePerDay}/day
                </Text>
            </View>
            <View style={styles.itemActions}>
                {item.status === 'pending' && (
                    <>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => handleApproveGuideApplication(item.id, item)}
                        >
                            <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleRejectGuideApplication(item.id)}
                        >
                            <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                    </>
                )}
                <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                        setSelectedItem(item);
                        setModalVisible(true);
                    }}
                >
                    <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTabContent = () => {
        const filteredUsers = users.filter(user =>
            user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const filteredGuides = guides.filter(guide =>
            guide.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guide.location?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const filteredGuideApplications = guideApplications.filter(application =>
            application.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            application.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            application.location?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const filteredBookings = bookings.filter(booking =>
            booking.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            booking.guideName?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        switch (activeTab) {
            case 'overview':
                return (
                    <ScrollView style={styles.tabContent}>
                        <Text style={styles.tabTitle}>Dashboard Overview</Text>
                        <View style={styles.statsContainer}>
                            {renderStatCard('Total Users', stats.totalUsers, '#4CAF50')}
                            {renderStatCard('Total Guides', stats.totalGuides, '#2196F3')}
                            {renderStatCard('Total Bookings', stats.totalBookings, '#FF9800')}
                            {renderStatCard('Pending Bookings', stats.pendingBookings, '#F44336')}
                            {renderStatCard('Pending Applications', stats.pendingGuideApplications, '#9C27B0')}
                            {renderStatCard('Total Locations', locations.length, '#795548')}
                        </View>
                        
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <View style={styles.recentActivity}>
                            <Text style={styles.activityItem}>📊 {stats.totalBookings} total bookings received</Text>
                            <Text style={styles.activityItem}>👥 {stats.totalUsers} users registered</Text>
                            <Text style={styles.activityItem}>🗺️ {stats.totalGuides} guides available</Text>
                            <Text style={styles.activityItem}>⏳ {stats.pendingBookings} bookings awaiting approval</Text>
                            <Text style={styles.activityItem}>📋 {stats.pendingGuideApplications} guide applications pending</Text>
                            <Text style={styles.activityItem}>
                                📍 {locations.length} total locations ({DEFAULT_PLACES.length} default + {locations.length - DEFAULT_PLACES.length} admin-added)
                            </Text>
                        </View>
                        
                        {/* Location Management Section */}
                        <View style={styles.locationManagementCard}>
                            <View style={styles.locationCardHeader}>
                                <Text style={styles.sectionTitle}>Location Management</Text>
                                <TouchableOpacity
                                    style={styles.addLocationButton}
                                    onPress={() => setLocationModalVisible(true)}
                                >
                                    <Text style={styles.addLocationButtonText}>+ Add Location</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.locationCardDescription}>
                                Manage all tourist destinations including default locations and custom admin-added places. Add new locations with detailed information including attractions, best visit times, and cultural details.
                            </Text>
                            <TouchableOpacity
                                style={styles.viewAllLocationsButton}
                                onPress={() => setActiveTab('locations')}
                            >
                                <Text style={styles.viewAllLocationsText}>View All Locations ({locations.length})</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                );
            case 'users':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>User Management</Text>
                        <FlatList
                            data={filteredUsers}
                            renderItem={renderUserItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                );
            case 'guides':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>Guide Management</Text>
                        <FlatList
                            data={filteredGuides}
                            renderItem={renderGuideItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                );
            case 'applications':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>Guide Applications</Text>
                        <FlatList
                            data={filteredGuideApplications}
                            renderItem={renderGuideApplicationItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <Text style={styles.emptyState}>No guide applications found</Text>
                            }
                        />
                    </View>
                );
            case 'bookings':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>Booking Management</Text>
                        <FlatList
                            data={filteredBookings}
                            renderItem={renderBookingItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                );
            case 'reviews':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabTitle}>Reviews Management</Text>
                        <FlatList
                            data={reviews}
                            renderItem={renderReviewItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                );
            case 'locations':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.locationHeader}>
                            <Text style={styles.tabTitle}>Location Management</Text>
                            <TouchableOpacity
                                style={styles.addLocationButton}
                                onPress={() => setLocationModalVisible(true)}
                            >
                                <Text style={styles.addLocationButtonText}>+ Add Location</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={locations.filter(location =>
                                location.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                location.category?.toLowerCase().includes(searchQuery.toLowerCase())
                            )}
                            renderItem={renderLocationItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <Text style={styles.emptyState}>No locations found</Text>
                            }
                        />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => {
                        auth.signOut();
                        router.push('/');
                    }}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            {activeTab !== 'overview' && (
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            )}

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                {[
                    { key: 'overview', label: 'Overview' },
                    { key: 'users', label: 'Users' },
                    { key: 'guides', label: 'Guides' },
                    { key: 'applications', label: 'Applications' },
                    { key: 'bookings', label: 'Bookings' },
                    { key: 'reviews', label: 'Reviews' },
                    { key: 'locations', label: 'Locations' },
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.tabButton,
                            activeTab === tab.key && styles.activeTabButton,
                        ]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text
                            style={[
                                styles.tabButtonText,
                                activeTab === tab.key && styles.activeTabButtonText,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tab Content */}
            {renderTabContent()}

            {/* Modal for viewing details */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Details</Text>
                        {selectedItem && (
                            <ScrollView style={styles.modalScroll}>
                                {Object.entries(selectedItem).map(([key, value]) => (
                                    <View key={key} style={styles.detailRow}>
                                        <Text style={styles.detailKey}>{key}:</Text>
                                        <Text style={styles.detailValue}>
                                            {typeof value === 'object' && value !== null
                                                ? JSON.stringify(value)
                                                : String(value)}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Location Modal */}
            <Modal
                visible={locationModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setLocationModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.locationModalContent}>
                        <Text style={styles.modalTitle}>Add New Location</Text>
                        <ScrollView style={styles.locationFormScroll}>
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Location Name *"
                                value={locationForm.name}
                                onChangeText={(text) => setLocationForm({...locationForm, name: text})}
                            />
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Category (e.g., Historical, Beach, Mountain)"
                                value={locationForm.category}
                                onChangeText={(text) => setLocationForm({...locationForm, category: text})}
                            />
                            <TextInput
                                style={[styles.locationInput, styles.textArea]}
                                placeholder="Description"
                                value={locationForm.description}
                                onChangeText={(text) => setLocationForm({...locationForm, description: text})}
                                multiline
                                numberOfLines={3}
                            />
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Main Attractions"
                                value={locationForm.attractions}
                                onChangeText={(text) => setLocationForm({...locationForm, attractions: text})}
                            />
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Best Time to Visit"
                                value={locationForm.bestTimeToVisit}
                                onChangeText={(text) => setLocationForm({...locationForm, bestTimeToVisit: text})}
                            />
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Average Temperature"
                                value={locationForm.averageTemperature}
                                onChangeText={(text) => setLocationForm({...locationForm, averageTemperature: text})}
                            />
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Local Language"
                                value={locationForm.language}
                                onChangeText={(text) => setLocationForm({...locationForm, language: text})}
                            />
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Currency"
                                value={locationForm.currency}
                                onChangeText={(text) => setLocationForm({...locationForm, currency: text})}
                            />
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Image URL"
                                value={locationForm.image}
                                onChangeText={(text) => setLocationForm({...locationForm, image: text})}
                            />
                        </ScrollView>
                        <View style={styles.locationModalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelLocationButton]}
                                onPress={() => setLocationModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.addLocationModalButton]}
                                onPress={handleAddLocation}
                            >
                                <Text style={styles.modalButtonText}>Add Location</Text>
                            </TouchableOpacity>
                        </View>
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
    header: {
        backgroundColor: '#6200EE',
        paddingHorizontal: 20,
        paddingVertical: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        elevation: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        elevation: 2,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTabButton: {
        borderBottomColor: '#6200EE',
    },
    tabButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    activeTabButtonText: {
        color: '#6200EE',
    },
    tabContent: {
        flex: 1,
        padding: 20,
    },
    tabTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 20,
        width: '48%',
        marginBottom: 15,
        borderLeftWidth: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
    },
    statTitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    recentActivity: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 20,
        elevation: 2,
    },
    activityItem: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
        paddingLeft: 10,
    },
    listItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    itemSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 3,
    },
    itemMeta: {
        fontSize: 12,
        color: '#888',
    },
    locationItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    defaultLocationBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    defaultLocationText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#1976D2',
    },
    adminLocationBadge: {
        backgroundColor: '#E8F5E8',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    adminLocationText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#2E7D2E',
    },
    attractionsText: {
        fontSize: 11,
        color: '#4CAF50',
        marginTop: 2,
        fontStyle: 'italic',
    },
    itemActions: {
        flexDirection: 'row',
        gap: 5,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    viewButton: {
        backgroundColor: '#2196F3',
    },
    deleteButton: {
        backgroundColor: '#F44336',
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#FF9800',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
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
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalScroll: {
        maxHeight: 400,
    },
    detailRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    detailKey: {
        fontWeight: 'bold',
        color: '#333',
        width: 100,
    },
    detailValue: {
        flex: 1,
        color: '#666',
    },
    modalCloseButton: {
        backgroundColor: '#6200EE',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 15,
    },
    modalCloseText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emptyState: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 50,
        fontStyle: 'italic',
    },
    
    // Location Management Styles
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    locationManagementCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#795548',
        marginTop: 30,
    },
    locationCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    locationCardDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
        lineHeight: 20,
    },
    viewAllLocationsButton: {
        backgroundColor: '#795548',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    viewAllLocationsText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    addLocationButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addLocationButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    locationModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '95%',
        maxHeight: '90%',
    },
    locationFormScroll: {
        maxHeight: 400,
        marginBottom: 20,
    },
    locationInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 15,
        backgroundColor: '#FFFFFF',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    locationModalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelLocationButton: {
        backgroundColor: '#F44336',
    },
    addLocationModalButton: {
        backgroundColor: '#4CAF50',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default AdminDashboard;
