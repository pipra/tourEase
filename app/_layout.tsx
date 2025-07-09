import { router, Stack } from "expo-router";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth } from "./(auth)/firebase";

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((userr) => {
      if(userr)
        router.push('/home')
    });
    return () => unsubscribe();
  }, []);


  return <Stack screenOptions={{ headerShown: false }} />;
}
