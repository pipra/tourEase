import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { auth } from './firebase';

const VerifyEmailScreen = () => {
    const [user, setUser] = useState(auth.currentUser);
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        const interval = setInterval(async () => {
            // reload user to get latest emailVerified status
            if (auth.currentUser) {
                await auth.currentUser.reload();
                setUser(auth.currentUser);
                if (auth.currentUser.emailVerified) {
                    clearInterval(interval);
                    Alert.alert('Verified', 'Email verified successfully. Redirecting...');
                    router.replace('/(tabs)/home');
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const resend = async () => {
        if (!auth.currentUser) return;
        setSending(true);
        try {
            const { sendEmailVerification } = await import('firebase/auth');
            await sendEmailVerification(auth.currentUser);
            Alert.alert('Sent', 'Verification email resent.');
        } catch (_err) {
            Alert.alert('Error', 'Could not resend verification email.');
        } finally {
            setSending(false);
        }
    };

    const checkNow = async () => {
        if (!auth.currentUser) return;
        setChecking(true);
        try {
            await auth.currentUser.reload();
            setUser(auth.currentUser);
            if (auth.currentUser.emailVerified) {
                Alert.alert('Verified', 'Email verified successfully. Redirecting...');
                router.replace('/(tabs)/home');
            } else {
                Alert.alert('Not Verified', 'We still detect your email as not verified. Please check your email and click the verification link.');
            }
        } catch (_err) {
            Alert.alert('Error', 'Could not check verification status.');
        } finally {
            setChecking(false);
        }
    };

    const signOut = async () => {
        await auth.signOut();
        router.replace('/login');
    };

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Text style={styles.title}>Verify Your Email</Text>
                    <Text style={styles.subtitle}>
                        A verification link was sent to:
                    </Text>
                    <Text style={styles.email}>{user?.email}</Text>

                    <Button mode="contained" onPress={resend} disabled={sending} style={styles.button}>
                        {sending ? 'Sending...' : 'Resend Verification Email'}
                    </Button>

                    <Button mode="outlined" onPress={checkNow} disabled={checking} style={styles.button}>
                        {checking ? 'Checking...' : "I've Verified, Check Now"}
                    </Button>

                    <Button mode="text" onPress={signOut} style={styles.link}>
                        Cancel / Sign Out
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
        marginBottom: 10,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 6,
    },
    email: {
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '600',
    },
    button: {
        marginVertical: 8,
    },
    link: {
        marginTop: 6,
    }
});

export default VerifyEmailScreen;
