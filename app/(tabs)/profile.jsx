import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Image, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../(auth)/firebase';

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
        <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-5">
            {userData ? (
                <>
                    <View className="bg-white w-full max-w-md p-6 rounded-xl shadow-md mb-6">
                        <View className="flex items-center mb-6">
                            <Image
                                source={require('../../assets/images/habib.jpg')}
                                className="w-32 h-32 rounded-full border-4 border-indigo-500"
                            />
                            <Text className="text-3xl font-bold text-gray-800 mt-3">
                                {auth.currentUser?.displayName}
                            </Text>
                            <Text className="text-2xl text-gray-500">{userData.email}</Text>
                        </View>

                        
                        <View className="space-y-4">
                            <View className="flex-row justify-between mt-1">
                                <Text className="font-semibold text-2xl text-gray-700">Service:</Text>
                                <Text className="text-gray-700 text-2xl">{userData.website || 'N/A'}</Text>
                            </View>
                            <View className="flex-row justify-between mt-1">
                                <Text className="font-semibold text-2xl text-gray-700">Location:</Text>
                                <Text className="text-gray-700 text-2xl">{userData.location || 'N/A'}</Text>
                            </View>
                            <View className="flex-row justify-between mt-1">
                                <Text className="font-semibold text-2xl text-gray-700">RequestList:</Text>
                                <Text className="text-gray-700 text-2xl">{userData.requestList || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>

                
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="bg-red-500 py-2 px-6 rounded-full mt-6"
                    >
                        <Text className="text-white font-bold text-lg text-center">Logout</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <Text className="text-lg font-semibold text-gray-600">Loading...</Text>
            )}
        </SafeAreaView>
    );
}
