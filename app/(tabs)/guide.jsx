import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../(auth)/firebase';

const Guide = () => {
    const [guides, setGuides] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [bookingForm, setBookingForm] = useState({
        date: '',
        guests: '1',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [bookedDates, setBookedDates] = useState([]);
    const [showCustomCalendar, setShowCustomCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    const filteredGuides = guides
        .filter(guide => guide.location.toLowerCase().includes(searchQuery.toLowerCase()))
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

    const getGuides = async () => {
        try {
            const q = query(collection(db, "guides"));
            const res = await getDocs(q);
            
            const guidesData = [];
            res.forEach((item) => {
                guidesData.push({ id: item.id, ...item.data() });
            });
            setGuides(guidesData);
        } catch (error) {
            console.error('Error fetching guides:', error);
            Alert.alert('Error', 'Failed to load guides');
        }
    };

    const getBookedDates = async (guideId) => {
        try {
            const q = query(
                collection(db, "bookings"),
                where("guideId", "==", guideId),
                where("status", "==", "confirmed")
            );
            const res = await getDocs(q);
            
            const dates = [];
            res.forEach((doc) => {
                const booking = doc.data();
                if (booking.date) {
                    dates.push(booking.date);
                }
            });
            setBookedDates(dates);
        } catch (error) {
            console.error('Error fetching booked dates:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await getGuides();
        setRefreshing(false);
    };

    useEffect(() => {
        getGuides();
    }, []);

    const handleBookButtonClick = async (guide) => {
        setSelectedGuide(guide);
        // Fetch booked dates for this guide
        const guideId = guide.userId || guide.id;
        await getBookedDates(guideId);
        setIsModalVisible(true);
    };

    const handleGuideDetailsClick = (guide) => {
        setSelectedGuide(guide);
        setIsDetailsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setBookingForm({
            date: '',
            guests: '1',
            message: ''
        });
        setShowCustomCalendar(false);
        setBookedDates([]); // Reset booked dates
    };

    const handleCloseDetailsModal = () => {
        setIsDetailsModalVisible(false);
        setSelectedGuide(null);
    };

    const handleDateSelect = () => {
        setShowCustomCalendar(true);
    };

    const handleConfirmBooking = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Error', 'Please login to book a guide');
            return;
        }

        if (!bookingForm.date) {
            Alert.alert('Error', 'Please select a date for your booking');
            return;
        }

        if (!bookingForm.guests || parseInt(bookingForm.guests) < 1) {
            Alert.alert('Error', 'Please enter a valid number of guests');
            return;
        }

        // Double-check if the selected date is available
        if (bookedDates.includes(bookingForm.date)) {
            Alert.alert('Error', 'This date is no longer available. Please select a different date.');
            return;
        }

        setLoading(true);
        try {
            const totalPrice = selectedGuide.pricePerDay * parseInt(bookingForm.guests);
            
            // Use userId if available (for approved guides), otherwise fall back to document ID
            const guideId = selectedGuide.userId || selectedGuide.id;
            
            await addDoc(collection(db, 'bookings'), {
                userId: user.uid,
                userName: user.displayName || user.email,
                userEmail: user.email,
                guideId: guideId,
                guideName: selectedGuide.name,
                guideLocation: selectedGuide.location,
                date: bookingForm.date,
                guests: parseInt(bookingForm.guests),
                totalPrice: totalPrice,
                pricePerDay: selectedGuide.pricePerDay,
                message: bookingForm.message,
                status: 'pending',
                createdAt: new Date(),
            });

            Alert.alert('Success', 'Booking request sent successfully! The guide will review your request.');
            handleCloseModal();
        } catch (error) {
            console.error('Error creating booking:', error);
            Alert.alert('Error', 'Failed to create booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const generateCalendarDays = (month, year) => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const days = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        
        return days;
    };

    const isDateBooked = (day, month, year) => {
        if (!day) return false;
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return bookedDates.includes(dateString);
    };

    const isDatePast = (day, month, year) => {
        if (!day) return false;
        const date = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const handleDateSelection = (day, month, year) => {
        if (!day) return;
        
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (isDateBooked(day, month, year)) {
            Alert.alert(
                'Date Unavailable',
                'This date is already booked by another customer. Please select a different date.',
                [{ text: 'OK' }]
            );
            return;
        }
        
        if (isDatePast(day, month, year)) {
            Alert.alert(
                'Invalid Date',
                'Please select a future date.',
                [{ text: 'OK' }]
            );
            return;
        }
        
        setBookingForm({...bookingForm, date: dateString});
        setShowCustomCalendar(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Section */}
            <View style={styles.headerSection}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Find Your Guide</Text>
                    <Text style={styles.headerSubtitle}>Discover amazing local guides for your next adventure</Text>
                </View>
                
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by location, city or place..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                <Text style={styles.clearIcon}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Guides Section */}
            <View style={styles.guidesSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {searchQuery ? `Results for "${searchQuery}"` : 'Available Guides'}
                    </Text>
                    <Text style={styles.resultsCount}>
                        {filteredGuides.length} guide{filteredGuides.length !== 1 ? 's' : ''} found
                    </Text>
                </View>

                {guides.length > 0 ? ( 
                    <FlatList
                        data={filteredGuides}
                        keyExtractor={(item) => item.id}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.guideCard}
                                onPress={() => handleGuideDetailsClick(item)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardContent}>
                                    <Image
                                        style={styles.guideImage}
                                        source={{ uri: item.image }}
                                    />
                                    <View style={styles.guideDetails}>
                                        <View style={styles.guideHeader}>
                                            <Text style={styles.guideName}>{item.name}</Text>
                                            <View style={styles.ratingContainer}>
                                                <Text style={styles.ratingText}>⭐ {item.rating || 0}</Text>
                                                <Text style={styles.reviewsText}>({item.reviews || 0})</Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.locationContainer}>
                                            <Text style={styles.locationIcon}>📍</Text>
                                            <Text style={styles.locationText}>{item.location}</Text>
                                        </View>
                                        
                                        {item.specialties && (
                                            <View style={styles.specialtiesContainer}>
                                                <Text style={styles.specialtiesText}>
                                                    🎯 {item.specialties.split(',').slice(0, 2).join(', ')}
                                                </Text>
                                            </View>
                                        )}
                                        
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.priceLabel}>From</Text>
                                            <Text style={styles.priceAmount}>৳{item.pricePerDay}</Text>
                                            <Text style={styles.priceUnit}>/day</Text>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.bookButtonContainer}>
                                        <TouchableOpacity 
                                            style={styles.bookButton} 
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleBookButtonClick(item);
                                            }}
                                        >
                                            <Text style={styles.bookButtonText}>Book Now</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            searchQuery ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyIcon}>🔍</Text>
                                    <Text style={styles.emptyTitle}>No guides found</Text>
                                    <Text style={styles.emptyText}>
                                        Try searching with a different location or check your spelling
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                ) : (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6200EE" />
                        <Text style={styles.loadingText}>Discovering amazing guides...</Text>
                    </View>
                )}
            </View>

            
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Book Guide</Text>
                        
                        {selectedGuide && (
                            <>
                                <Text style={styles.guideInfo}>
                                    {selectedGuide.name} - {selectedGuide.location}
                                </Text>
                                <Text style={styles.priceInfo}>
                                    ৳{selectedGuide.pricePerDay}/day per person
                                </Text>
                                
                                {bookedDates.length > 0 && (
                                    <View style={styles.availabilityInfo}>
                                        {/* <Text style={styles.availabilityText}>
                                            ⚠️ {bookedDates.length} date{bookedDates.length !== 1 ? 's' : ''} already booked
                                        </Text> */}
                                        <Text style={styles.availabilitySubtext}>
                                            Please select an available date
                                        </Text>
                                    </View>
                                )}
                                
                                <TouchableOpacity 
                                    style={styles.datePickerButton}
                                    onPress={handleDateSelect}
                                >
                                    <Text style={styles.datePickerText}>
                                        {bookingForm.date ? `Selected Date: ${bookingForm.date}` : 'Select Date'}
                                    </Text>
                                </TouchableOpacity>
                                
                                {showCustomCalendar && (
                                    <View style={styles.calendarContainer}>
                                        <View style={styles.calendarHeader}>
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    if (currentMonth === 0) {
                                                        setCurrentMonth(11);
                                                        setCurrentYear(currentYear - 1);
                                                    } else {
                                                        setCurrentMonth(currentMonth - 1);
                                                    }
                                                }}
                                                style={styles.navButton}
                                            >
                                                <Text style={styles.navButtonText}>‹</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.monthYearText}>
                                                {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                            </Text>
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    if (currentMonth === 11) {
                                                        setCurrentMonth(0);
                                                        setCurrentYear(currentYear + 1);
                                                    } else {
                                                        setCurrentMonth(currentMonth + 1);
                                                    }
                                                }}
                                                style={styles.navButton}
                                            >
                                                <Text style={styles.navButtonText}>›</Text>
                                            </TouchableOpacity>
                                        </View>
                                        
                                        <View style={styles.weekDaysHeader}>
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                                <Text key={day} style={styles.weekDayText}>{day}</Text>
                                            ))}
                                        </View>
                                        
                                        <View style={styles.calendarDays}>
                                            {generateCalendarDays(currentMonth, currentYear).map((day, index) => {
                                                const isBooked = isDateBooked(day, currentMonth, currentYear);
                                                const isPast = isDatePast(day, currentMonth, currentYear);
                                                const isSelected = bookingForm.date === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                
                                                return (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={[
                                                            styles.dayButton,
                                                            !day && styles.emptyDay,
                                                            isBooked && styles.bookedDay,
                                                            isPast && styles.pastDay,
                                                            isSelected && styles.selectedDay
                                                        ]}
                                                        onPress={() => handleDateSelection(day, currentMonth, currentYear)}
                                                        disabled={!day || isBooked || isPast}
                                                    >
                                                        <Text style={[
                                                            styles.dayText,
                                                            isBooked && styles.bookedDayText,
                                                            isPast && styles.pastDayText,
                                                            isSelected && styles.selectedDayText
                                                        ]}>
                                                            {day}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                        
                                        <TouchableOpacity 
                                            style={styles.closeCalendarButton}
                                            onPress={() => setShowCustomCalendar(false)}
                                        >
                                            <Text style={styles.closeCalendarText}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                
                                <TextInput
                                    style={styles.input}
                                    placeholder="Number of Guests"
                                    value={bookingForm.guests}
                                    onChangeText={(text) => setBookingForm({...bookingForm, guests: text})}
                                    keyboardType="numeric"
                                />
                                
                                <TextInput
                                    style={[styles.input, styles.messageInput]}
                                    placeholder="Special requests or message (optional)"
                                    value={bookingForm.message}
                                    onChangeText={(text) => setBookingForm({...bookingForm, message: text})}
                                    multiline
                                    numberOfLines={3}
                                />
                                
                                {bookingForm.guests && selectedGuide.pricePerDay && (
                                    <Text style={styles.totalPrice}>
                                        Total: ৳{selectedGuide.pricePerDay * parseInt(bookingForm.guests || 1)}
                                    </Text>
                                )}
                            </>
                        )}
                        
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity 
                                style={[styles.payButton, loading && styles.disabledButton]} 
                                onPress={handleConfirmBooking}
                                disabled={loading}
                            >
                                <Text style={styles.payButtonText}>
                                    {loading ? 'Sending...' : 'Confirm Request'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Guide Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isDetailsModalVisible}
                onRequestClose={handleCloseDetailsModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.detailsModalContent}>
                        {selectedGuide && (
                            <>
                                <View style={styles.detailsHeader}>
                                    <TouchableOpacity 
                                        style={styles.closeButton}
                                        onPress={handleCloseDetailsModal}
                                    >
                                        <Text style={styles.closeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <Image
                                    style={styles.detailsImage}
                                    source={{ uri: selectedGuide.image }}
                                />
                                
                                <View style={styles.detailsContent}>
                                    <View style={styles.detailsNameSection}>
                                        <Text style={styles.detailsName}>{selectedGuide.name}</Text>
                                        <View style={styles.detailsRatingContainer}>
                                            <Text style={styles.detailsRatingText}>⭐ {selectedGuide.rating || 0}</Text>
                                            <Text style={styles.detailsReviewsText}>({selectedGuide.reviews || 0} reviews)</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailsLocationContainer}>
                                        <Text style={styles.detailsLocationIcon}>📍</Text>
                                        <Text style={styles.detailsLocationText}>{selectedGuide.location}</Text>
                                    </View>

                                    {selectedGuide.specialties && (
                                        <View style={styles.detailsSpecialtiesContainer}>
                                            <Text style={styles.detailsSectionTitle}>Specialties</Text>
                                            <Text style={styles.detailsSpecialtiesText}>
                                                🎯 {selectedGuide.specialties}
                                            </Text>
                                        </View>
                                    )}

                                    {selectedGuide.experience && (
                                        <View style={styles.detailsExperienceContainer}>
                                            <Text style={styles.detailsSectionTitle}>Experience</Text>
                                            <Text style={styles.detailsExperienceText}>
                                                {selectedGuide.experience} years of guiding experience
                                            </Text>
                                        </View>
                                    )}

                                    {selectedGuide.languages && (
                                        <View style={styles.detailsLanguagesContainer}>
                                            <Text style={styles.detailsSectionTitle}>Languages</Text>
                                            <Text style={styles.detailsLanguagesText}>
                                                🗣️ {selectedGuide.languages}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.detailsPriceContainer}>
                                        <Text style={styles.detailsSectionTitle}>Pricing</Text>
                                        <View style={styles.detailsPriceRow}>
                                            <Text style={styles.detailsPriceAmount}>৳{selectedGuide.pricePerDay}</Text>
                                            <Text style={styles.detailsPriceUnit}>per day</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity 
                                        style={styles.detailsBookButton}
                                        onPress={() => {
                                            handleCloseDetailsModal();
                                            handleBookButtonClick(selectedGuide);
                                        }}
                                    >
                                        <Text style={styles.detailsBookButtonText}>Book This Guide</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    headerSection: {
        backgroundColor: '#6200EE',
        paddingBottom: 30,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    headerContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 25,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#E8EAED',
        opacity: 0.9,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        paddingHorizontal: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 10,
        color: '#666',
    },
    searchInput: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: '#333',
    },
    clearButton: {
        padding: 5,
    },
    clearIcon: {
        fontSize: 16,
        color: '#999',
        fontWeight: 'bold',
    },
    guidesSection: {
        flex: 1,
        paddingTop: 20,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    resultsCount: {
        fontSize: 14,
        color: '#666',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    guideCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        overflow: 'hidden',
    },
    cardContent: {
        padding: 0,
    },
    guideImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#FFFFFF',
        resizeMode: 'contain',
    },
    guideDetails: {
        padding: 20,
    },
    guideHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    guideName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F57F17',
        marginRight: 4,
    },
    reviewsText: {
        fontSize: 12,
        color: '#F57F17',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    locationIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    locationText: {
        fontSize: 15,
        color: '#666',
        flex: 1,
    },
    specialtiesContainer: {
        marginBottom: 15,
    },
    specialtiesText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 15,
    },
    priceLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 5,
    },
    priceAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6200EE',
    },
    priceUnit: {
        fontSize: 14,
        color: '#666',
        marginLeft: 2,
    },
    bookButtonContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    bookButton: {
        backgroundColor: '#6200EE',
        borderRadius: 15,
        paddingVertical: 15,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    bookButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 20,
        opacity: 0.5,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        width: '90%',
        maxWidth: 400,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    modalHeader: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    guideInfo: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6200EE',
        textAlign: 'center',
        marginBottom: 8,
    },
    priceInfo: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
    },
    availabilityInfo: {
        backgroundColor: '#FFF3CD',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFC107',
    },
    availabilityText: {
        fontSize: 14,
        color: '#856404',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
    },
    availabilitySubtext: {
        fontSize: 12,
        color: '#856404',
        textAlign: 'center',
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6200EE',
        textAlign: 'center',
        marginVertical: 10,
    },
    datePickerButton: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingVertical: 15,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    datePickerText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 15,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#F8F9FA',
    },
    messageInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    bookingDetails: {
        fontSize: 18,
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    payButton: {
        backgroundColor: '#6200EE',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    payButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 16,
    },
    // Details Modal styles
    detailsModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '95%',
        maxWidth: 450,
        maxHeight: '90%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    detailsHeader: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
    },
    closeButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    detailsImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 3/2,
        backgroundColor: '#FFFFFF',
        resizeMode: 'cover',
    },
    detailsContent: {
        padding: 20,
    },
    detailsNameSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    detailsName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    detailsRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 15,
    },
    detailsRatingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F57F17',
        marginRight: 5,
    },
    detailsReviewsText: {
        fontSize: 12,
        color: '#F57F17',
    },
    detailsLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 12,
    },
    detailsLocationIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    detailsLocationText: {
        fontSize: 16,
        color: '#666',
        flex: 1,
    },
    detailsSpecialtiesContainer: {
        marginBottom: 20,
    },
    detailsExperienceContainer: {
        marginBottom: 20,
    },
    detailsLanguagesContainer: {
        marginBottom: 20,
    },
    detailsSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    detailsSpecialtiesText: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 12,
    },
    detailsExperienceText: {
        fontSize: 15,
        color: '#666',
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 12,
    },
    detailsLanguagesText: {
        fontSize: 15,
        color: '#666',
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 12,
    },
    detailsPriceContainer: {
        marginBottom: 25,
        backgroundColor: '#F0F4FF',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8EAED',
    },
    detailsPriceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    detailsPriceAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#6200EE',
        marginRight: 8,
    },
    detailsPriceUnit: {
        fontSize: 16,
        color: '#666',
    },
    detailsBookButton: {
        backgroundColor: '#6200EE',
        borderRadius: 15,
        paddingVertical: 18,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    detailsBookButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    
    // Calendar Styles
    calendarContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginTop: 10,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    navButton: {
        padding: 10,
        backgroundColor: '#8B5CF6',
        borderRadius: 5,
    },
    navButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    monthYearText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    weekDaysHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    weekDayText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        textAlign: 'center',
        width: 40,
    },
    calendarDays: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    dayButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 2,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
    },
    emptyDay: {
        backgroundColor: 'transparent',
    },
    bookedDay: {
        backgroundColor: '#FF8C00', // Orange color for booked dates
    },
    pastDay: {
        backgroundColor: '#e0e0e0',
    },
    selectedDay: {
        backgroundColor: '#8B5CF6',
    },
    dayText: {
        fontSize: 16,
        color: '#333',
    },
    bookedDayText: {
        color: 'white',
        fontWeight: 'bold',
    },
    pastDayText: {
        color: '#999',
    },
    selectedDayText: {
        color: 'white',
        fontWeight: 'bold',
    },
    closeCalendarButton: {
        marginTop: 15,
        backgroundColor: '#8B5CF6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeCalendarText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default Guide;
