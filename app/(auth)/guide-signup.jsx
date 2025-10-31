import { router } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
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
                emailVerified: false,
                canLogin: false, // Cannot login until admin approves
                createdAt: new Date(),
            });

            // Save guide application data (not approved yet)
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
                emailVerified: false, // Not verified yet
                appliedAt: new Date(),
                rating: 0,
                reviews: 0,
                image: formData.imageUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
            });

            // Send email verification
            const actionCodeSettings = {
                url: 'https://tourease-4cd42.firebaseapp.com',
                handleCodeInApp: true,
            };
            await sendEmailVerification(user, actionCodeSettings);

            // Sign out so user must verify before logging in
            await auth.signOut();

            Alert.alert(
                'Verify Your Email',
                'A verification email has been sent to ' + formData.email + '. Please verify your email by clicking the link in the email, then login again.\n\nAfter email verification, your application will be submitted to admin for approval.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            router.replace('/login');
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

                <View style={styles.formContainer}>
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text style={styles.sectionTitle}>Personal Information</Text>
                            
                            <View style={styles.row}>
                                <TextInput
                                    label="First Name *"
                                    style={[styles.input, styles.halfInput]}
                                    value={formData.firstName}
                                    onChangeText={(value) => handleInputChange('firstName', value)}
                                    mode="outlined"
                                    left={<TextInput.Icon icon="account" />}
                                />
                                <TextInput
                                    label="Last Name *"
                                    style={[styles.input, styles.halfInput]}
                                    value={formData.lastName}
                                    onChangeText={(value) => handleInputChange('lastName', value)}
                                    mode="outlined"
                                    left={<TextInput.Icon icon="account-outline" />}
                                />
                            </View>

                            <TextInput
                                label="Email Address *"
                                style={styles.input}
                                value={formData.email}
                                onChangeText={(value) => handleInputChange('email', value)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                mode="outlined"
                                left={<TextInput.Icon icon="email" />}
                            />

                            <TextInput
                                label="Phone Number *"
                                style={styles.input}
                                value={formData.phone}
                                onChangeText={(value) => handleInputChange('phone', value)}
                                keyboardType="phone-pad"
                                mode="outlined"
                                left={<TextInput.Icon icon="phone" />}
                            />

                            <TextInput
                                label="Password *"
                                style={styles.input}
                                value={formData.password}
                                onChangeText={(value) => handleInputChange('password', value)}
                                secureTextEntry
                                mode="outlined"
                                left={<TextInput.Icon icon="lock" />}
                            />
                            
                            <TextInput
                                label="Confirm Password *"
                                style={styles.input}
                                value={formData.confirmPassword}
                                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                                secureTextEntry
                                mode="outlined"
                                left={<TextInput.Icon icon="lock-check" />}
                            />
                        </Card.Content>
                    </Card>

                    <Card style={styles.card}>
                        <Card.Content>
                            <Text style={styles.sectionTitle}>Guide Information</Text>

                            <TextInput
                                label="Primary Location/City *"
                                style={styles.input}
                                value={formData.location}
                                onChangeText={(value) => handleInputChange('location', value)}
                                mode="outlined"
                                left={<TextInput.Icon icon="map-marker" />}
                            />

                            <TextInput
                                label="Years of Experience *"
                                style={styles.input}
                                value={formData.experience}
                                onChangeText={(value) => handleInputChange('experience', value)}
                                keyboardType="numeric"
                                mode="outlined"
                                left={<TextInput.Icon icon="briefcase" />}
                            />

                            <TextInput
                                label="Languages Spoken"
                                style={styles.input}
                                value={formData.languages}
                                onChangeText={(value) => handleInputChange('languages', value)}
                                mode="outlined"
                                left={<TextInput.Icon icon="translate" />}
                                placeholder="e.g., English, Bengali, Hindi"
                            />

                            <TextInput
                                label="Specialties"
                                style={styles.input}
                                value={formData.specialties}
                                onChangeText={(value) => handleInputChange('specialties', value)}
                                mode="outlined"
                                left={<TextInput.Icon icon="star" />}
                                placeholder="e.g., Historical sites, Nature tours"
                            />

                            <TextInput
                                label="Daily Rate (BDT) *"
                                style={styles.input}
                                value={formData.pricePerDay}
                                onChangeText={(value) => handleInputChange('pricePerDay', value)}
                                keyboardType="numeric"
                                mode="outlined"
                                left={<TextInput.Icon icon="cash" />}
                            />

                            <TextInput
                                label="Tell us about yourself"
                                style={styles.input}
                                value={formData.bio}
                                onChangeText={(value) => handleInputChange('bio', value)}
                                multiline
                                numberOfLines={4}
                                mode="outlined"
                                placeholder="Share your guiding experience and passion..."
                            />
                        </Card.Content>
                    </Card>

                    <Card style={styles.card}>
                        <Card.Content>
                            <Text style={styles.sectionTitle}>Profile Picture</Text>
                            
                            <TextInput
                                label="Profile Image URL (optional)"
                                style={styles.input}
                                value={formData.imageUrl}
                                onChangeText={(value) => handleInputChange('imageUrl', value)}
                                autoCapitalize="none"
                                mode="outlined"
                                left={<TextInput.Icon icon="image" />}
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
                        </Card.Content>
                    </Card>

                    <Card style={styles.infoCard}>
                        <Card.Content>
                            <Text style={styles.infoTitle}>📋 Application Process</Text>
                            <Text style={styles.infoText}>
                                • Your application will be reviewed by our team{'\n'}
                                • We may contact you for additional verification{'\n'}
                                • Approval typically takes 1-3 business days{'\n'}
                                • You&apos;ll receive an email once approved
                            </Text>
                        </Card.Content>
                    </Card>

                    <Button
                        mode="contained"
                        onPress={handleSignup}
                        loading={loading}
                        disabled={loading}
                        style={styles.submitButton}
                        contentStyle={styles.submitButtonContent}
                        labelStyle={styles.submitButtonText}
                    >
                        {loading ? 'Submitting Application...' : 'Submit Application'}
                    </Button>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>
                            Already have an account? <Text style={styles.signInText}>Sign In</Text>
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
        backgroundColor: '#F5F5F5',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        backgroundColor: '#6200EE',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    headerImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#E8EAED',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    formContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        marginBottom: 20,
        borderRadius: 15,
        elevation: 4,
        backgroundColor: '#FFFFFF',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#6200EE',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    input: {
        backgroundColor: '#FFFFFF',
        marginBottom: 15,
    },
    halfInput: {
        flex: 1,
    },
    imagePreviewContainer: {
        alignItems: 'center',
        marginTop: 15,
        padding: 15,
        backgroundColor: '#F8F9FA',
        borderRadius: 10,
    },
    imagePreviewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    imagePreview: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#6200EE',
        backgroundColor: '#f0f0f0',
    },
    infoCard: {
        marginBottom: 25,
        borderRadius: 15,
        elevation: 3,
        backgroundColor: '#E3F2FD',
        borderLeftWidth: 5,
        borderLeftColor: '#2196F3',
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1976D2',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#1565C0',
        lineHeight: 24,
    },
    submitButton: {
        marginBottom: 15,
        borderRadius: 10,
        elevation: 4,
    },
    submitButtonContent: {
        paddingVertical: 8,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        alignItems: 'center',
        paddingVertical: 15,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
    },
    signInText: {
        color: '#6200EE',
        fontWeight: 'bold',
    },
});

export default GuideSignup;
