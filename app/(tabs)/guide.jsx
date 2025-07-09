import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../(auth)/firebase';

const Guide = () => {
    const [guides, setGuides] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState(null);

    const filteredGuides = guides.filter(guide =>
        guide.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getGuides = async () => {
        const q = query(collection(db, "guides"));
        const res = await getDocs(q);
        
        const guidesData = [];
        res.forEach((item) => {
            guidesData.push(item.data());
        });
        setGuides(guidesData);
    };

    useEffect(() => {
        getGuides();
    }, []);

    const handleBookButtonClick = (guide) => {
        setSelectedGuide(guide);
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>GuideBook</Text>
            <TextInput
                style={styles.searchInput}
                placeholder="Search guides by location..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            <Text style={styles.availableGuides}>Available Guides</Text>
            {
                guides.length > 0 ? ( 
                    <FlatList
                        data={filteredGuides}
                        keyExtractor={(item) => item.name}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={{color: '#333'}}
                            >
                                <View style={styles.card}>
                                    <Image
                                        style={styles.image}
                                        source={{ uri: item.image }}
                                    />
                                    <View style={styles.details}>
                                        <Text style={styles.name}>{item.name}</Text>
                                        <Text style={styles.location}>{item.location}</Text>
                                        <Text style={styles.rating}>Rating: {item.rating} ({item.reviews} reviews)</Text>
                                        <Text style={styles.price}>BDT {item.price}/day</Text>
                                    </View>
                                    <TouchableOpacity style={styles.bookButton} onPress={() => handleBookButtonClick(item)}>
                                        <Text style={styles.bookText}>Book</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.listContainer}
                    />
                ) : (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fb9b33" />
                        <Text style={styles.loadingText}>Loading guides...</Text>
                    </View>
                )
            }

            
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Confirm Payment</Text>
                        <Text style={styles.bookingDetails}>
                            Booking {selectedGuide?.name} for BDT {selectedGuide?.price}
                        </Text>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.payButton}>
                                <Text style={styles.payButtonText}>Confirm Request</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    header: {
        marginTop: 10,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
    },
    searchInput: {
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 5,
        marginHorizontal: 15,
        marginBottom: 15,
        paddingLeft: 10,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    availableGuides: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        color: '#333',
    },
    listContainer: {
        paddingHorizontal: 15,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 10,
        marginBottom: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    image: {
        width: 160,
        height: 160,
        borderRadius: 150,
        marginRight: 15,
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    location: {
        color: '#555',
        marginBottom: 5,
    },
    rating: {
        color: '#777',
    },
    price: {
        fontWeight: 'bold',
        marginTop: 10,
    },
    bookButton: {
        backgroundColor: '#28a745',
        padding: 6,
        paddingHorizontal: 15,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    modalHeader: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '6200EE',
    },
    bookingDetails: {
        fontSize: 18,
        marginBottom: 20,
    },
    input: {
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        paddingLeft: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    payButton: {
        backgroundColor: '#28a745',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 5,
    },
    payButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 5,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default Guide;
