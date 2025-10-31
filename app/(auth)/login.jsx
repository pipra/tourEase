import { router } from "expo-router";
import { sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
    Alert,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Button, Card, TextInput } from "react-native-paper";
import { auth, db } from "../(auth)/firebase";
import "../../global.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error!", "Please fill in both fields");
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Force reload to get the absolute latest emailVerified status from Firebase
            await user.reload();
            const refreshedUser = auth.currentUser;
            
            console.log('Login attempt - Email verified status:', refreshedUser.emailVerified);
            console.log('User email:', refreshedUser.email);
            
            // Check user type from Firestore first
            const userDoc = await getDoc(doc(db, 'Users', refreshedUser.uid));
            
            if (!userDoc.exists()) {
                await auth.signOut();
                Alert.alert("Error", "User data not found. Please contact support.");
                return;
            }
            
            const userData = userDoc.data();
            
            console.log('User type:', userData.userType);
            
            // Handle email verification based on user type
            // Regular users (tourists) don't need email verification
            if (userData.userType !== 'user' && !refreshedUser.emailVerified) {
                // Only require email verification for admin and guide users
                try {
                    const actionCodeSettings = {
                        url: 'https://tourease-4cd42.firebaseapp.com',
                        handleCodeInApp: true,
                    };
                    await sendEmailVerification(refreshedUser, actionCodeSettings);
                    console.log('Verification email sent to:', refreshedUser.email);
                } catch (emailError) {
                    console.error('Error sending verification email:', emailError);
                }
                
                await auth.signOut();
                Alert.alert(
                    'Email Not Verified',
                    'A verification email has been sent to ' + refreshedUser.email + '. Please verify your email and try logging in again.\n\nNote: After clicking the verification link, please wait a moment before logging in again.',
                    [{ text: 'OK' }]
                );
                return;
            }
            
            // Email is verified (or user is regular tourist who doesn't need verification)
            // Update Firestore if email is verified but not marked in database
            if (refreshedUser.emailVerified && !userData.emailVerified) {
                try {
                    await updateDoc(doc(db, 'Users', refreshedUser.uid), {
                        emailVerified: true,
                    });
                    console.log('Updated Users collection - emailVerified: true');
                    
                    // If user is a guide applicant, also update guide-applications
                    if (userData.userType === 'guide') {
                        const applicationDoc = await getDoc(doc(db, 'guide-applications', refreshedUser.uid));
                        if (applicationDoc.exists() && !applicationDoc.data().emailVerified) {
                            await updateDoc(doc(db, 'guide-applications', refreshedUser.uid), {
                                emailVerified: true,
                            });
                            console.log('Updated guide-applications collection - emailVerified: true');
                        }
                    }
                } catch (updateError) {
                    console.error('Error updating Firestore verification status:', updateError);
                }
            }
            
            // Email is verified, now route based on user type
            if (userData.userType === 'admin') {
                Alert.alert("Welcome Admin!", "Redirecting to admin dashboard...");
                router.replace('/(admin)/dashboard');
            } else if (userData.userType === 'guide') {
                // Check if guide is approved by checking the guides collection
                const guideDoc = await getDoc(doc(db, 'guides', refreshedUser.uid));
                
                if (guideDoc.exists() && guideDoc.data().status === 'approved') {
                    // Guide is approved, allow login
                    Alert.alert("Welcome Guide!", "Redirecting to guide dashboard...");
                    router.replace('/(guide)/dashboard');
                } else {
                    // Check application status
                    const applicationDoc = await getDoc(doc(db, 'guide-applications', refreshedUser.uid));
                    
                    if (applicationDoc.exists()) {
                        const appData = applicationDoc.data();
                        
                        if (appData.status === 'pending') {
                            await auth.signOut();
                            Alert.alert(
                                "Application Pending",
                                "Your guide application is under review by our admin team. You will be notified once approved.",
                                [{ text: "OK" }]
                            );
                        } else if (appData.status === 'rejected') {
                            await auth.signOut();
                            Alert.alert(
                                "Application Rejected",
                                "Unfortunately, your guide application was not approved. Please contact support for more information.",
                                [{ text: "OK" }]
                            );
                        } else {
                            await auth.signOut();
                            Alert.alert(
                                "Access Denied",
                                "Your guide application is being processed. Please wait for approval.",
                                [{ text: "OK" }]
                            );
                        }
                    } else {
                        await auth.signOut();
                        Alert.alert(
                            "No Application Found",
                            "No guide application found for your account. Please apply to become a guide first.",
                            [{ text: "OK" }]
                        );
                    }
                }
            } else {
                // Regular user
                router.replace("/(tabs)/home");
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert("Error!", error.message);
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground
                source={{ uri: "https://example.com/your-background-image.jpg" }}
                style={styles.backgroundImage}
            >
                <Card style={styles.card}>
                    <Card.Content>
                        <Text style={styles.title}>Login</Text>
                        <TextInput
                            label="Email address"
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
                        <TouchableOpacity
                            onPress={() => router.push('/forgot-password')}
                            style={{ alignSelf: 'flex-end', marginTop: -10, marginBottom: 10 }}
                        >
                            <Text style={{ color: '#6200EE', fontWeight: '500', fontSize: 14 }}>Forgot Password?</Text>
                        </TouchableOpacity>
                        <Button
                            style={styles.button}
                            mode="contained"
                            onPress={handleLogin}
                        >
                            Sign In
                        </Button>
                        <View style={styles.footer}>
                            <TouchableOpacity
                                onPress={() => router.push("/signup")}
                                className="flex flex-row items-center justify-center"
                            >
                                <Text className="text-lg">Not a member? </Text>
                                <Text className="text-lg font-bold text-[#6200EE]">
                                    Sign Up
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={() => router.push("/guide-signup")}
                                className="flex flex-row items-center justify-center mt-3"
                            >
                                <Text className="text-base">Want to be a guide? </Text>
                                <Text className="text-base font-bold text-[#FF9800]">
                                    Apply Here
                                </Text>
                            </TouchableOpacity>

                            {/* <TouchableOpacity
                                onPress={() => router.push("/admin-signup")}
                                className="flex flex-row items-center justify-center mt-3"
                            >
                                <Text className="text-sm">Admin access? </Text>
                                <Text className="text-sm font-bold text-[#DC3545]">
                                    Admin Portal
                                </Text>
                            </TouchableOpacity> */}

                            {/* Admin Creation Button */}
                            {/* <TouchableOpacity
                                onPress={() => router.push('/admin-signup')}
                                className="flex flex-row items-center justify-center mt-4"
                                style={{ backgroundColor: '#DC3545', padding: 8, borderRadius: 5 }}
                            >
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                                    🔑 Create Admin Account
                                </Text>
                            </TouchableOpacity> */}

                            {/* Sign out button if already logged in */}
                            {/* {auth.currentUser && (
                                <TouchableOpacity
                                    onPress={() => {
                                        auth.signOut();
                                        Alert.alert("Signed Out", "You can now login with a different account");
                                    }}
                                    className="flex flex-row items-center justify-center mt-2 opacity-75"
                                >
                                    <Text className="text-xs text-red-600">🚪 Sign Out Current User</Text>
                                </TouchableOpacity>
                            )} */}
                        </View>
                    </Card.Content>
                </Card>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    backgroundImage: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        opacity: 0.8,
    },
    card: {
        width: "85%",
        padding: 20,
        borderRadius: 15,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
        color: "#4a4a4a",
    },
    input: {
        marginBottom: 15,
        backgroundColor: "white",
    },
    button: {
        color: "#ffffff",
        marginTop: 10,
        borderRadius: 5,
        fontWeight: "bold",
        backgroundColor: "#6200EE",
    },
    footer: {
        marginTop: 20,
        alignItems: "center",
    },
    forgotPassword: {
        color: "#6200EE",
        fontSize: 14,
        marginBottom: 5,
    },
    footerText: {
        fontSize: 14,
        color: "#666",
    },
    signUpText: {
        color: "#6200EE",
    },
});

export default Login;
