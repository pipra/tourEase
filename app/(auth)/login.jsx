import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

    // No state needed for admin creation as it's moved to separate page

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error!", "Please fill in both fields");
            return;
        }

        try {
            // Sign in the user
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Prevent access if email not verified
            if (!user.emailVerified) {
                // Try to resend verification email (best-effort) then sign out to block access
                try {
                    const { sendEmailVerification } = await import('firebase/auth');
                    await sendEmailVerification(user);
                } catch (_err) {
                    // ignore send failures
                }

                // Sign out immediately so the unverified user cannot access the app
                await auth.signOut();

                Alert.alert(
                    'Email Not Verified',
                    'Your email is not verified. A verification email has been sent. Please verify your email before logging in.'
                );
                return;
            }

            // Check user type from Firestore
            const userDoc = await getDoc(doc(db, 'Users', user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Route based on user type
                if (userData.userType === 'admin') {
                    Alert.alert("Welcome Admin!", "Redirecting to admin dashboard...");
                    router.replace('/(admin)/dashboard');
                } else if (userData.userType === 'guide') {
                    // Check if guide is approved
                    const guideDoc = await getDoc(doc(db, 'guides', user.uid));
                    if (guideDoc.exists()) {
                        Alert.alert("Welcome Guide!", "Redirecting to guide dashboard...");
                        router.replace('/(guide)/dashboard');
                    } else {
                        // Guide not approved yet
                        Alert.alert(
                            "Application Pending", 
                            "Your guide application is still under review. Please wait for approval.",
                            [
                                {
                                    text: "OK",
                                    onPress: async () => {
                                        await auth.signOut();
                                    }
                                }
                            ]
                        );
                    }
                } else {
                    // Regular user
                    Alert.alert("Welcome!", "Enjoy exploring amazing places...");
                    router.replace("/(tabs)/home");
                }
            } else {
                // No user document found, treat as regular user
                Alert.alert("Welcome!", "Enjoy exploring amazing places...");
                router.replace("/(tabs)/home");
            }
        } catch (error) {
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
                            <TouchableOpacity
                                onPress={() => router.push('/admin-signup')}
                                className="flex flex-row items-center justify-center mt-4"
                                style={{ backgroundColor: '#DC3545', padding: 8, borderRadius: 5 }}
                            >
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                                    🔑 Create Admin Account
                                </Text>
                            </TouchableOpacity>

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
