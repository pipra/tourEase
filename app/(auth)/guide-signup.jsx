import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from './firebase';

const GuideSignup = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        location: '',
        experience: '',
        languages: '',
        specialties: '',
        bio: '',
        pricePerDay: '',
        imageUrl: '',
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            phone,
            location,
            experience,
            pricePerDay,
        } = formData;

        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all required fields');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }

        if (!phone || !location || !experience || !pricePerDay) {
            Alert.alert('Error', 'Please fill in all guide-specific information');
            return false;
        }

        if (isNaN(pricePerDay) || parseInt(pricePerDay) <= 0) {
            Alert.alert('Error', 'Please enter a valid price per day');
            return false;
        }

        return true;
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            const user = userCredential.user;

            // Update user profile
            await updateProfile(user, {
                displayName: `${formData.firstName} ${formData.lastName}`,
            });

            // Save user data to Firestore
            await setDoc(doc(db, 'Users', user.uid), {
                email: user.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                userType: 'guide',
                createdAt: new Date(),
            });

            // Save guide-specific data
            await setDoc(doc(db, 'guide-applications', user.uid), {
                userId: user.uid,
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.phone,
                location: formData.location,
                experience: formData.experience,
                languages: formData.languages,
                specialties: formData.specialties,
                bio: formData.bio,
                pricePerDay: parseInt(formData.pricePerDay),
                status: 'pending', // Admin needs to approve
                appliedAt: new Date(),
                rating: 0,
                reviews: 0,
                image: formData.imageUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
            });

            Alert.alert(
                'Application Submitted',
                'Your guide application has been submitted for review. You will be notified once it is approved.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            auth.signOut(); // Sign out the user until approved
                            router.push('/');
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Image
                        source={{
                            uri: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80',
                        }}
                        style={styles.headerImage}
                    />
                    <Text style={styles.title}>Become a Tour Guide</Text>
                    <Text style={styles.subtitle}>
                        Join our platform and help travelers explore amazing destinations
                    </Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="First Name *"
                            placeholderTextColor={'#4f4d57'}
                            value={formData.firstName}
                            onChangeText={(value) => handleInputChange('firstName', value)}
                        />
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Last Name *"
                            placeholderTextColor={'#4f4d57'}
                            value={formData.lastName}
                            onChangeText={(value) => handleInputChange('lastName', value)}
                        />
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Email Address *"
                        placeholderTextColor={'#4f4d57'}
                        value={formData.email}
                        onChangeText={(value) => handleInputChange('email', value)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number *"
                        placeholderTextColor={'#4f4d57'}
                        value={formData.phone}
                        onChangeText={(value) => handleInputChange('phone', value)}
                        keyboardType="phone-pad"
                    />

                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Password *"
                            placeholderTextColor={'#4f4d57'}
                            value={formData.password}
                            onChangeText={(value) => handleInputChange('password', value)}
                            secureTextEntry
                        />
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Confirm Password *"
                            placeholderTextColor={'#4f4d57'}
                            value={formData.confirmPassword}
                            onChangeText={(value) => handleInputChange('confirmPassword', value)}
                            secureTextEntry
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Guide Information</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Primary Location/City *"
                        placeholderTextColor={'#4f4d57'}
                        value={formData.location}
                        onChangeText={(value) => handleInputChange('location', value)}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Years of Experience *"
                        placeholderTextColor={'#4f4d57'}
                        value={formData.experience}
                        onChangeText={(value) => handleInputChange('experience', value)}
                        keyboardType="numeric"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Languages Spoken (e.g., English, Bengali, Hindi)"
                        placeholderTextColor={'#4f4d57'}
                        value={formData.languages}
                        onChangeText={(value) => handleInputChange('languages', value)}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Specialties (e.g., Historical sites, Nature tours)"
                        placeholderTextColor={'#4f4d57'}
                        value={formData.specialties}
                        onChangeText={(value) => handleInputChange('specialties', value)}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Daily Rate (BDT) *"
                        placeholderTextColor={'#4f4d57'}
                        value={formData.pricePerDay}
                        onChangeText={(value) => handleInputChange('pricePerDay', value)}
                        keyboardType="numeric"
                    />

                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Tell us about yourself and your guiding experience..."
                        placeholderTextColor={'#4f4d57'}
                        value={formData.bio}
                        onChangeText={(value) => handleInputChange('bio', value)}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    <Text style={styles.sectionTitle}>Profile Picture</Text>
                    
                    <TextInput
                        style={styles.input}
                        placeholder="Profile Image URL (optional)"
                        placeholderTextColor={'#4f4d57'}
                        value={formData.imageUrl}
                        onChangeText={(value) => handleInputChange('imageUrl', value)}
                        autoCapitalize="none"
                    />
                    
                    {formData.imageUrl && (
                        <View style={styles.imagePreviewContainer}>
                            <Text style={styles.imagePreviewTitle}>Profile Picture Preview:</Text>
                            <Image
                                source={{ uri: formData.imageUrl }}
                                style={styles.imagePreview}
                                onError={() => {
                                    Alert.alert('Invalid Image URL', 'Please enter a valid image URL');
                                }}
                            />
                        </View>
                    )}

                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>📋 Application Process</Text>
                        <Text style={styles.infoText}>
                            • Your application will be reviewed by our team{'\n'}
                            • We may contact you for additional verification{'\n'}
                            • Approval typically takes 1-3 business days{'\n'}
                            • You&apos;ll receive an email once approved
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        <Text style={styles.submitButtonText}>
                            {loading ? 'Submitting Application...' : 'Submit Application'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>
                            Already have an account? Sign In
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
        backgroundColor: '#6200EE',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    headerImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 15,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#E8EAED',
        textAlign: 'center',
    },
    form: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        marginBottom: 15,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    halfInput: {
        width: '48%',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    imagePreviewContainer: {
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    imagePreviewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    imagePreview: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#6200EE',
        backgroundColor: '#f0f0f0',
    },
    infoBox: {
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976D2',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#1976D2',
        lineHeight: 20,
    },
    submitButton: {
        backgroundColor: '#6200EE',
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 15,
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    backButtonText: {
        color: '#6200EE',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default GuideSignup;
