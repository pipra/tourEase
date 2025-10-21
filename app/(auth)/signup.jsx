import { router } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
import { auth, db } from './firebase';

const SignupScreen = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSignup = async (e) => {
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            const user = auth.currentUser;
            if (user) {
                await updateProfile(user, {
                    displayName: `${firstName} ${lastName}`,
                });
                await setDoc(doc(db, "Users", user.uid), {
                    email: user.email,
                    firstName: firstName,
                    lastName: lastName,
                    userType: 'user',
                    createdAt: new Date(),
                });
            }

            // send verification email and sign out so user must verify before logging in
            if (user) {
                try {
                    await sendEmailVerification(user);
                } catch (err) {
                    console.warn('Failed to send verification email:', err);
                }
                await auth.signOut();
            }

            Alert.alert('Registered', 'A verification email has been sent. Please verify your email before logging in.');
            router.replace('/login');
        } catch (error) {
            Alert.alert("Error!", error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Text style={styles.title}>Create Account</Text>
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
                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="email" />}
                    />
                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
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
                    <Button mode="contained" onPress={handleSignup} style={styles.button}>
                        Sign Up
                    </Button>
                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={() => router.push('/login')}
                            className='flex flex-row items-center justify-center mt-10'
                        >
                            <Text className='text-lg'>Already have an account? </Text>
                            <Text className='text-lg font-bold text-[#6200EE]'>Sign In</Text>
                        </TouchableOpacity>
                    </View>
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
    },
    card: {
        width: '90%',
        padding: 20,
        borderRadius: 15,
        elevation: 5,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    nameContainer: {
        flex: 1,
        flexDirection: 'row',
        // justifyContent: 'space-between',
        gap: 10
    },
    input: {
        marginBottom: 15,
        backgroundColor: 'white',
    },
    button: {
        marginTop: 10,
        borderRadius: 5,
    },
});

export default SignupScreen;
