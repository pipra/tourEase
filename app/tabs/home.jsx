import React, { useState } from 'react';
import { Button, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Mock data
const POPULAR_PLACES = [
  { id: '1', name: 'Paris', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' },
  { id: '2', name: 'Tokyo', image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80' },
  { id: '3', name: 'New York', image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80' },
  { id: '4', name: 'Rome', image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80' },
];

const GUIDES = [
  { id: 'g1', name: 'John Doe', location: 'Paris', rating: 4.8, image: 'https://randomuser.me/api/portraits/men/32.jpg', bio: 'Expert in Paris tours, 10 years experience.' },
  { id: 'g2', name: 'Jane Smith', location: 'Tokyo', rating: 4.9, image: 'https://randomuser.me/api/portraits/women/44.jpg', bio: 'Tokyo local, food and culture specialist.' },
  { id: 'g3', name: 'Carlos Rossi', location: 'Rome', rating: 4.7, image: 'https://randomuser.me/api/portraits/men/65.jpg', bio: 'Roman history buff, fluent in English and Italian.' },
];

export default function HomeTab() {
  const [search, setSearch] = useState('');
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter guides by search
  const filteredGuides = search
    ? GUIDES.filter(g => g.location.toLowerCase().includes(search.toLowerCase()))
    : GUIDES;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Find Your Next Adventure</Text>
      {/* Search Location */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Location..."
          value={search}
          onChangeText={setSearch}
        />
        <Button title="Search" onPress={() => {}} color="#6200EE" />
      </View>

      {/* Popular Places */}
      <Text style={styles.sectionTitle}>Most Popular Places</Text>
      <FlatList
        data={POPULAR_PLACES}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        renderItem={({ item }) => (
          <View style={styles.placeCard}>
            <Image source={{ uri: item.image }} style={styles.placeImage} />
            <Text style={styles.placeName}>{item.name}</Text>
          </View>
        )}
      />

      {/* Available Guides */}
      <Text style={styles.sectionTitle}>Available Guides</Text>
      {filteredGuides.map(guide => (
        <TouchableOpacity
          key={guide.id}
          style={styles.guideCard}
          onPress={() => { setSelectedGuide(guide); setModalVisible(true); }}
        >
          <Image source={{ uri: guide.image }} style={styles.guideImage} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guideName}>{guide.name}</Text>
            <Text style={styles.guideLocation}>{guide.location}</Text>
            <Text style={styles.guideRating}>⭐ {guide.rating}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Guide Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedGuide && (
              <>
                <Image source={{ uri: selectedGuide.image }} style={styles.modalImage} />
                <Text style={styles.modalName}>{selectedGuide.name}</Text>
                <Text style={styles.modalLocation}>{selectedGuide.location}</Text>
                <Text style={styles.modalBio}>{selectedGuide.bio}</Text>
                <Text style={styles.modalRating}>⭐ {selectedGuide.rating}</Text>
                <Button title="Book Guide" color="#6200EE" onPress={() => { setModalVisible(false); alert('Booking confirmed!'); }} />
                <Button title="Close" color="#aaa" onPress={() => setModalVisible(false)} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#6200EE', marginBottom: 16, textAlign: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginRight: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 10, color: '#333' },
  placeCard: { width: 120, marginRight: 12, alignItems: 'center' },
  placeImage: { width: 100, height: 70, borderRadius: 8 },
  placeName: { marginTop: 6, fontWeight: '600', color: '#444' },
  guideCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f7f7', borderRadius: 10, padding: 12, marginBottom: 12, elevation: 2 },
  guideImage: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  guideName: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  guideLocation: { color: '#666' },
  guideRating: { color: '#6200EE', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 300, alignItems: 'center', elevation: 5 },
  modalImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  modalName: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  modalLocation: { color: '#666', marginBottom: 8 },
  modalBio: { fontStyle: 'italic', marginBottom: 8, textAlign: 'center' },
  modalRating: { color: '#6200EE', fontWeight: 'bold', marginBottom: 12 },
}); 