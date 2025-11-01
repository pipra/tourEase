import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCtcbjNbjcGAZuBH7ieNDC_eOo1nlToNCQ",
    authDomain: "tourease-4cd42.firebaseapp.com",
    databaseURL: "https://tourease-4cd42-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tourease-4cd42",
    storageBucket: "tourease-4cd42.firebasestorage.app",
    messagingSenderId: "938417742161",
    appId: "1:938417742161:web:ff9ec50cda03f44fbf7370"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export default app;
