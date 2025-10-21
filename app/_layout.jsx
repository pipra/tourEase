import { router, Stack } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert } from 'react-native';
import { auth, db } from "./(auth)/firebase";

export default function RootLayout() {
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // ensure email is verified before allowing access
                try {
                    await user.reload();
                    if (!user.emailVerified) {
                        // sign out unverified users and inform them
                        await auth.signOut();
                        Alert.alert('Email Not Verified', 'Please verify your email before accessing the app.');
                        setInitializing(false);
                        router.replace('/');
                        return;
                    }
                } catch (_err) {
                    // ignore reload errors and continue
                }
                try {
                    // Check user type and route accordingly
                    const userDoc = await getDoc(doc(db, 'Users', user.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        if (userData.userType === 'admin') {
                            router.replace('/(admin)/dashboard');
                        } else if (userData.userType === 'guide') {
                            // Check if guide is approved
                            const guideDoc = await getDoc(doc(db, 'guides', user.uid));
                            if (guideDoc.exists()) {
                                router.replace('/(guide)/dashboard');
                            } else {
                                // Guide not approved yet, sign them out
                                await auth.signOut();
                                router.replace('/');
                            }
                        } 
                        // else {
                        //     // Regular user
                        //     router.replace('/(tabs)/home');
                        // }
                    } 
                    // else {
                    //     // User document doesn't exist, go to home
                    //     router.replace('/(tabs)/home');
                    // }
                } catch (_error) {
                    // console.error('Error checking user type:', _error);
                    // router.replace('/(tabs)/home');
                }
            } else {
                // User not signed in
                if (!initializing) {
                    router.replace('/');
                }
            }
            setInitializing(false);
        });
        
        return () => unsubscribe();
    }, [initializing]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(guide)" />
        </Stack>
    );
}
