import { useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const guides = [
    { name: 'Habibur Rahman', location: 'Rajshahi University Campus', rating: 4.9, reviews: 151, price: 5000 },
    { name: 'Majnu Miah', location: 'Tangail', rating: 4.9, reviews: 95, price: 5000 },
    { name: 'Ifran Khan', location: 'Dhaka City Tours', rating: 4.9, reviews: 150, price: 5000 },
    { name: 'Nusrat Jahan', location: 'Cox\'s Bazar Beaches', rating: 4.6, reviews: 80, price: 1800 },
    { name: 'Rashed Miah', location: 'Chittagong Port', rating: 4.5, reviews: 50, price: 2500 },
];

const Guide = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredGuides = guides.filter(guide =>
        guide.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <SafeAreaView>
                <Text style={styles.header}>GuideBook</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search guides by name..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </SafeAreaView>
            <Text style={styles.availableGuides}>Available Guides</Text>
            <ScrollView style={styles.container}>
                <FlatList
                    data={filteredGuides}
                    keyExtractor={(item) => item.name}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Image
                                style={styles.image}
                                source={require('../../assets/images/habib.jpg')}
                            />
                            <View style={styles.details}>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.location}>{item.location}</Text>
                                <Text style={styles.rating}>Rating: {item.rating} ({item.reviews} reviews)</Text>
                                <Text style={styles.price}>BDT {item.price}/day</Text>
                            </View>
                            <TouchableOpacity style={styles.bookButton} onPress={() => alert('Booked')}>
                                <Text style={styles.bookText}>Book</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        marginTop: 10,
        width: '90%',
    },
    availableGuides: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        marginHorizontal: 15,
        color: '#333',
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
        marginTop: 80,
        marginBottom: 80,
        paddingHorizontal: 15,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default Guide;
