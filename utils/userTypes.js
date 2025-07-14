import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from '../app/(auth)/firebase';

// Utility functions to check user types
export const getCurrentUserType = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
        const userDoc = await getDoc(doc(db, 'Users', user.uid));
        if (userDoc.exists()) {
            return userDoc.data().userType || 'user';
        }
        return 'user'; // Default to regular user
    } catch (_error) {
        console.error('Error getting user type:', _error);
        return 'user';
    }
};

export const isAdmin = async () => {
    const userType = await getCurrentUserType();
    return userType === 'admin';
};

export const isGuide = async () => {
    const userType = await getCurrentUserType();
    if (userType !== 'guide') return false;
    
    // Also check if guide is approved
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const guideDoc = await getDoc(doc(db, 'guides', user.uid));
        return guideDoc.exists();
    } catch (_error) {
        return false;
    }
};

export const isRegularUser = async () => {
    const userType = await getCurrentUserType();
    return !userType || userType === 'user';
};

// Quick check for current user in components
export const useUserType = () => {
    const [userType, setUserType] = useState(null);
    
    useEffect(() => {
        getCurrentUserType().then(setUserType);
    }, []);
    
    return userType;
};
