import React from 'react'
import { Tabs } from 'expo-router'
import Ionicons from "@expo/vector-icons/Ionicons";

const TabLayout = () => {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    paddingBottom: 14,
                    height: 75,
                },
                tabBarLabelStyle: { fontSize: 12, fontWeight: "bold" },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="home" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="place"
                options={{
                    title: "Place",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="location" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="guide"
                options={{
                    title: "Guide",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="search" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="person-sharp" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    )
}

export default TabLayout