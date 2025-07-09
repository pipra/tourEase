import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { auth } from "./(auth)/firebase";

export default function RootLayout() {
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((userr) => {
            // router.push('/home');
            if (userr) {
                router.push("/home");
                // console.log('User is signed in:', userr);
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}
