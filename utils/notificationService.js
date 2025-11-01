import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Request notification permissions
export async function requestNotificationPermissions() {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            console.log('Notification permission not granted');
            return false;
        }
        
        console.log('Notification permission granted');
        return true;
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
}

// Schedule a local notification
export async function scheduleLocalNotification(title, body, data = {}) {
    try {
        const hasPermission = await requestNotificationPermissions();
        
        if (!hasPermission) {
            throw new Error('Notification permission not granted');
        }
        
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                data: data,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null, // Show immediately
        });
        
        console.log('Notification scheduled:', notificationId);
        return notificationId;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        throw error;
    }
}

// Send an immediate notification
export async function sendTestNotification(title, body, data = {}) {
    try {
        const notificationId = await scheduleLocalNotification(title, body, data);
        return {
            success: true,
            notificationId: notificationId,
            message: 'Notification sent successfully'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: 'Failed to send notification'
        };
    }
}

// Get notification response listener
export function addNotificationResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

// Get notification received listener (when app is in foreground)
export function addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
}
