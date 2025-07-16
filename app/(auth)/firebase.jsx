import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCtcbjNbjcGAZuBH7ieNDC_eOo1nlToNCQ",
    authDomain: "tourease-4cd42.firebaseapp.com",
    projectId: "tourease-4cd42",
    storageBucket: "tourease-4cd42.firebasestorage.app",
    messagingSenderId: "938417742161",
    appId: "1:938417742161:web:ff9ec50cda03f44fbf7370"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth();
export const db = getFirestore();
export default app;
