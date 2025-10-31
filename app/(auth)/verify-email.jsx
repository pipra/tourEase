import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { auth, db } from './firebase';

const VerifyEmailScreen = () => {
    const [user, setUser] = useState(auth.currentUser);
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        const interval = setInterval(async () => {
            // reload user to get latest emailVerified status
            if (auth.currentUser) {
                try {
                    // Force reload to get fresh token
                    await auth.currentUser.reload();
                    // Get the refreshed user
                    const refreshedUser = auth.currentUser;
                    setUser(refreshedUser);
                    
                    console.log('Checking email verification status:', refreshedUser.emailVerified);
                    
                    if (refreshedUser.emailVerified) {
                        clearInterval(interval);
                        await handleEmailVerified();
                    }
                } catch (error) {
                    console.error('Error checking verification status:', error);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const handleEmailVerified = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Get user data to check if they're a guide applicant
            const userDoc = await getDoc(doc(db, 'Users', user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Update user document
                await updateDoc(doc(db, 'Users', user.uid), {
                    emailVerified: true,
                });

                if (userData.userType === 'guide') {
                    // Update guide application
                    const applicationDoc = await getDoc(doc(db, 'guide-applications', user.uid));
                    if (applicationDoc.exists()) {
                        await updateDoc(doc(db, 'guide-applications', user.uid), {
                            emailVerified: true,
                        });
                    }

                    Alert.alert(
                        'Email Verified!',
                        'Your email has been verified successfully. Your guide application has been submitted to admin for approval. You will be able to login once approved.',
                        [
                            {
                                text: 'OK',
                                onPress: async () => {
                                    await auth.signOut();
                                    router.replace('/login');
                                },
                            },
                        ]
                    );
                } else {
                    // Regular user
                    Alert.alert('Verified', 'Email verified successfully. Redirecting...');
                    router.replace('/(tabs)/home');
                }
            } else {
                // No user document, treat as regular user
                Alert.alert('Verified', 'Email verified successfully. Redirecting...');
                router.replace('/(tabs)/home');
            }
        } catch (error) {
            console.error('Error handling email verification:', error);
            Alert.alert('Error', 'Failed to update verification status.');
        }
    };

    const resend = async () => {
        if (!auth.currentUser) {
            Alert.alert('Error', 'No user logged in.');
            return;
        }
        
        setSending(true);
        try {
            const { sendEmailVerification } = await import('firebase/auth');
            
            // Add action code settings for better delivery
            const actionCodeSettings = {
                url: 'https://tourease-4cd42.firebaseapp.com',
                handleCodeInApp: true,
            };
            
            await sendEmailVerification(auth.currentUser, actionCodeSettings);
            console.log('Verification email sent to:', auth.currentUser.email);
            
            Alert.alert(
                'Email Sent!', 
                'A new verification email has been sent to ' + auth.currentUser.email + '. Please check your inbox and spam folder.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error resending verification email:', error);
            
            let errorMessage = 'Could not resend verification email.';
            if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setSending(false);
        }
    };

    const checkNow = async () => {
        if (!auth.currentUser) {
            Alert.alert('Error', 'No user logged in.');
            return;
        }
        
        setChecking(true);
        try {
            // Force reload the user to get fresh verification status
            await auth.currentUser.reload();
            
            // Get the refreshed user object
            const refreshedUser = auth.currentUser;
            setUser(refreshedUser);
            
            console.log('Manual check - Email verified status:', refreshedUser.emailVerified);
            
            if (refreshedUser.emailVerified) {
                await handleEmailVerified();
            } else {
                Alert.alert(
                    'Not Verified Yet', 
                    'Your email is not verified yet. Please:\n\n1. Check your email inbox (and spam folder)\n2. Click the verification link in the email\n3. Wait a moment and try again\n\nNote: It may take a few seconds for verification to register.'
                );
            }
        } catch (error) {
            console.error('Error checking verification:', error);
            Alert.alert('Error', 'Could not check verification status. Please try again.');
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
