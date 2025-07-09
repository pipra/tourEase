import { useEffect, useState } from 'react';
import { SafeAreaView, Text } from 'react-native';
import { auth, db } from '../(auth)/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';

export default function Profile() {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const fetchUserDetails = async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    const docRef = doc(db, "Users", user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    }
                } catch (err) {
                    console.log("Error fetching user data:", err.message);
                }
            }
        };

        fetchUserDetails();
    }, []);

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/');
    };

    return (
        <SafeAreaView className="flex-1 justify-center items-center">
            {userData ? (
                <>
                    <Text>Welcome, </Text>
                    <Text style={{ color: '#6200EE', fontSize: 20, fontWeight: 'bold' }}>
                        {auth.currentUser?.displayName}
                    </Text>
                </>
            ) : (
                <Text className='text-lg font-semibold'>Loading...</Text>
            )}

            <Text
                onPress={handleLogout}
                style={{ fontSize: 20, fontWeight: 'bold', marginTop: 20 }}
            >
                Logout
            </Text>
        </SafeAreaView>
    );
}
