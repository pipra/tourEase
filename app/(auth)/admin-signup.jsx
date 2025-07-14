import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from './firebase';

const AdminSignup = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        adminKey: '', // Secret key for admin registration
    });
    const [loading, setLoading] = useState(false);

    // Secret admin key - change this to something secure
    const ADMIN_SECRET_KEY = 'TOUREASE_ADMIN_2024';

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        const { firstName, lastName, email, password, confirmPassword, adminKey } = formData;

        if (!firstName || !lastName || !email || !password || !confirmPassword || !adminKey) {
            Alert.alert('Error', 'Please fill in all fields');
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

        if (adminKey !== ADMIN_SECRET_KEY) {
            Alert.alert('Error', 'Invalid admin key. Access denied.');
            return false;
        }

        return true;
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            // Create admin account
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

            // Save admin data to Firestore
            await setDoc(doc(db, 'Users', user.uid), {
                email: user.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                userType: 'admin', // Set as admin
                createdAt: new Date(),
                role: 'Administrator',
            });

            Alert.alert(
                'Admin Account Created',
                'Admin account has been created successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            router.push('/login');
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
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>🔐 Admin Registration</Text>
                    <Text style={styles.subtitle}>Create administrator account</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="First Name *"
                            value={formData.firstName}
                            onChangeText={(value) => handleInputChange('firstName', value)}
                        />
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Last Name *"
                            value={formData.lastName}
                            onChangeText={(value) => handleInputChange('lastName', value)}
                        />
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Email Address *"
                        value={formData.email}
                        onChangeText={(value) => handleInputChange('email', value)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password *"
                        value={formData.password}
                        onChangeText={(value) => handleInputChange('password', value)}
                        secureTextEntry
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Confirm Password *"
                        value={formData.confirmPassword}
                        onChangeText={(value) => handleInputChange('confirmPassword', value)}
                        secureTextEntry
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Admin Secret Key *"
                        value={formData.adminKey}
                        onChangeText={(value) => handleInputChange('adminKey', value)}
                        secureTextEntry
                    />

                    <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>⚠️ Admin Registration</Text>
                        <Text style={styles.warningText}>
                            This form is for creating administrator accounts only. 
                            You need the secret admin key to proceed.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        <Text style={styles.submitButtonText}>
                            {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>
                            Back to Login
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    form: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    halfInput: {
        width: '48%',
    },
    warningBox: {
        backgroundColor: '#FFF3CD',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107',
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 8,
    },
    warningText: {
        fontSize: 14,
        color: '#856404',
        lineHeight: 20,
    },
    submitButton: {
        backgroundColor: '#DC3545',
        borderRadius: 12,
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

export default AdminSignup;
