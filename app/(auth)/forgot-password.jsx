import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
import { auth } from './firebase';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);

    const handleReset = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }
        setSending(true);
        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Email Sent', 'A password reset link has been sent to your email.');
            router.replace('/login');
        } catch (error) {
            Alert.alert('Error', error.message || 'Could not send password reset email.');
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>Enter the email address associated with your account.</Text>
                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="email" />}
                    />

                    <Button mode="contained" onPress={handleReset} disabled={sending} style={styles.button}>
                        {sending ? 'Sending...' : 'Send Password Reset Email'}
                    </Button>

                    <Button mode="text" onPress={() => router.replace('/login')} style={styles.link}>
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
    },
    card: {
        width: '90%',
        padding: 20,
        borderRadius: 15,
        elevation: 5,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 12,
    },
    input: {
        marginBottom: 15,
        backgroundColor: 'white',
    },
    button: {
        marginVertical: 8,
    },
    link: {
        marginTop: 6,
    }
});

export default ForgotPassword;
