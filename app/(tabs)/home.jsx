import { router } from "expo-router";
import React, { useEffect } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../(auth)/firebase";
import { auth } from "../(auth)/firebase";

const Home = () => {
    return (
        <SafeAreaView className="flex-1 justify-center items-center">
            <Text style={{ color: "#6200EE", fontSize: 40, fontWeight: "bold" }}>
                TourEase
            </Text>
            <Text style={{ color: "black", fontSize: 20, marginTop: 10 }}>
                Your Smart Travel solution
            </Text>
        </SafeAreaView>
    );
};

export default Home;
