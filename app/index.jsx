import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
    Alert,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Button, Card, TextInput } from "react-native-paper";
import "../global.css";
import { auth } from "./(auth)/firebase";

const Index = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error!", "Please fill in both fields");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/home");
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

export default Index;
