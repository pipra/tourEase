import { router } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
import { auth, db } from './firebase';

const CreateAdmin = () => {
    const [loading, setLoading] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const handleCreateAdmin = async () => {
        if (!adminEmail || !adminPassword || !confirmPassword || !firstName || !lastName) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (adminPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            
            // Set admin data in Firestore
            await setDoc(doc(db, 'Users', userCredential.user.uid), {
                email: adminEmail,
                firstName,
                lastName,
                userType: 'admin',
                createdAt: new Date(),
            });

            // Send verification email
            await sendEmailVerification(userCredential.user);

            Alert.alert(
                'Success', 
                `Admin account created! Please check your email (${adminEmail}) to verify the account before logging in.`,
                [{ 
                    text: 'OK',
                    onPress: () => router.replace('/login')
                }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Could not create admin account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Text style={styles.title}>Create Admin Account</Text>
                    <Text style={styles.subtitle}>Enter admin account details</Text>
                    
                    <TextInput
                        label="Email"
                        value={adminEmail}
                        onChangeText={setAdminEmail}
                        keyboardType="email-address"
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="email" />}
                    />
                    <TextInput
                        label="Password"
                        value={adminPassword}
                        onChangeText={setAdminPassword}
                        secureTextEntry
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="lock" />}
                    />
                    <TextInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="lock-check" />}
                    />
                    <TextInput
                        label="First Name"
                        value={firstName}
                        onChangeText={setFirstName}
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="account" />}
                    />
                    <TextInput
                        label="Last Name"
                        value={lastName}
                        onChangeText={setLastName}
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="account-outline" />}
                    />

                    <Button
                        mode="contained"
                        onPress={handleCreateAdmin}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                    >
                        Create Admin Account
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={() => router.replace('/login')}
                        style={styles.backButton}
                    >
                        Back to Login
                    </Button>
                </Card.Content>
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        elevation: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#DC3545',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    button: {
        marginTop: 10,
        backgroundColor: '#DC3545',
        paddingVertical: 8,
    },
    backButton: {
        marginTop: 10,
        borderColor: '#DC3545',
    }
});

export default CreateAdmin;