import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="guide-signup" />
            <Stack.Screen name="admin-signup" />
            <Stack.Screen name="firebase" />
        </Stack>
    );
}
