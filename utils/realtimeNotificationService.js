import { equalTo, onValue, orderByChild, push, query, ref, remove, set, update } from 'firebase/database';
import { rtdb } from '../app/(auth)/firebase';
import { sendTestNotification } from './notificationService';

/**
 * Test RTDB connection
 */
export async function testRTDBConnection() {
    try {
        console.log('Testing RTDB connection...');
        console.log('RTDB instance:', rtdb);
        console.log('RTDB app:', rtdb.app.name);
        
        const testRef = ref(rtdb, 'connection-test');
        await set(testRef, {
            timestamp: Date.now(),
            message: 'Connection test successful'
        });
        
        console.log('✅ RTDB connection test successful!');
        return { success: true };
    } catch (error) {
        console.error('❌ RTDB connection test failed:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        return { success: false, error: error.message };
    }
}

/**
 * Send booking request notification to guide
 * @param {string} guideUid - Guide's user ID
 * @param {object} bookingData - Booking details
 */
export async function sendBookingRequestToGuide(guideUid, bookingData) {
    try {
        console.log('=== SENDING BOOKING REQUEST NOTIFICATION ===');
        console.log('Guide UID:', guideUid);
        console.log('Guide UID type:', typeof guideUid);
        console.log('Booking Data:', bookingData);
        console.log('RTDB instance:', rtdb);
        console.log('RTDB app name:', rtdb?.app?.name);
        
        if (!guideUid) {
            throw new Error('Guide UID is undefined or null');
        }
        
        const notificationRef = ref(rtdb, 'guide-notifications');
        console.log('Created notification ref');
        
        const newNotificationRef = push(notificationRef);
        console.log('Pushed new notification ref, Key:', newNotificationRef.key);
        
        // Format dates for display
        const datesDisplay = Array.isArray(bookingData.dates) 
            ? bookingData.dates.join(', ') 
            : bookingData.dates || bookingData.date || 'Date';
        
        const notification = {
            guide_uid: guideUid,
            type: 'booking_request',
            title: '🎯 New Booking Request',
            message: `${bookingData.userName} wants to book you for ${bookingData.location} on ${datesDisplay}`,
            data: {
                bookingId: bookingData.bookingId,
                userName: bookingData.userName,
                location: bookingData.location,
                dates: datesDisplay,
                guests: bookingData.guests,
                totalPrice: bookingData.totalPrice,
            },
            shown: false,
            timestamp: Date.now(),
        };
        
        console.log('Notification Object:', JSON.stringify(notification, null, 2));
        console.log('Attempting to write to RTDB...');
        
        await set(newNotificationRef, notification);
        
        console.log('✅ Booking request notification saved successfully to RTDB');
        console.log('Notification ID:', newNotificationRef.key);
        console.log('Path: guide-notifications/' + newNotificationRef.key);
        console.log('=== END ===');
        
        return {
            success: true,
            notificationId: newNotificationRef.key
        };
    } catch (error) {
        console.error('❌ Error sending booking notification:', error);
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send booking response notification to user
 * @param {string} userUid - User's ID
 * @param {object} responseData - Response details
 */
export async function sendBookingResponseToUser(userUid, responseData) {
    try {
        console.log('=== SENDING BOOKING RESPONSE NOTIFICATION ===');
        console.log('User UID:', userUid);
        console.log('Response Data:', responseData);
        
        const notificationRef = ref(rtdb, 'user-notifications');
        const newNotificationRef = push(notificationRef);
        
        // Map status to user-friendly text
        const isConfirmed = responseData.status === 'confirmed';
        const statusEmoji = isConfirmed ? '🎉' : '❌';
        const statusText = isConfirmed ? 'Confirmed' : 'Cancelled';
        
        // Format dates for display
        const datesDisplay = Array.isArray(responseData.dates) 
            ? responseData.dates.join(', ') 
            : responseData.dates || responseData.date || 'Date';
        
        const notification = {
            user_uid: userUid,
            type: `booking_${responseData.status}`,
            title: `${statusEmoji} Booking ${statusText}`,
            message: `${responseData.guideName} has ${responseData.status} your booking for ${responseData.location} on ${datesDisplay}. Total: ৳${responseData.totalPrice}`,
            data: {
                bookingId: responseData.bookingId,
                status: responseData.status,
                guideName: responseData.guideName,
                location: responseData.location,
                dates: datesDisplay,
                totalPrice: responseData.totalPrice,
            },
            shown: false,
            timestamp: Date.now(),
        };
        
        console.log('Notification Object:', notification);
        
        await set(newNotificationRef, notification);
        
        console.log('✅ Response notification saved successfully to RTDB');
        console.log('Notification ID:', newNotificationRef.key);
        console.log('=== END ===');
        
        return {
            success: true,
            notificationId: newNotificationRef.key
        };
    } catch (error) {
        console.error('❌ Error sending response notification:', error);
        console.error('Error details:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Listen for guide notifications and show unshown ones
 * @param {string} guideUid - Guide's user ID
 * @param {function} callback - Callback function when new notification arrives
 */
export function listenForGuideNotifications(guideUid, callback) {
    try {
        const notificationsRef = ref(rtdb, 'guide-notifications');
        const guideQuery = query(notificationsRef, orderByChild('guide_uid'), equalTo(guideUid));
        
        const unsubscribe = onValue(guideQuery, async (snapshot) => {
            if (snapshot.exists()) {
                const allNotifications = [];
                const newNotifications = [];
                const updates = {};
                
                snapshot.forEach((childSnapshot) => {
                    const notification = childSnapshot.val();
                    const notificationId = childSnapshot.key;
                    
                    // Collect all notifications
                    allNotifications.push({
                        id: notificationId,
                        ...notification
                    });
                    
                    // Only process unshown notifications for push alerts
                    if (!notification.shown) {
                        newNotifications.push({
                            id: notificationId,
                            ...notification
                        });
                        
                        // Mark as shown (don't delete)
                        updates[`guide-notifications/${notificationId}/shown`] = true;
                        updates[`guide-notifications/${notificationId}/shownAt`] = new Date().toISOString();
                    }
                });
                
                // Update all notifications as shown
                if (Object.keys(updates).length > 0) {
                    await update(ref(rtdb), updates);
                }
                
                // Show push notifications for new ones only
                for (const notification of newNotifications) {
                    // Send local notification
                    await sendTestNotification(
                        notification.title,
                        notification.message,
                        notification.data
                    );
                }
                
                // Trigger callback with all notifications (for UI display)
                if (callback) {
                    // Sort by timestamp, newest first
                    allNotifications.sort((a, b) => b.timestamp - a.timestamp);
                    callback(allNotifications);
                }
            } else {
                // No notifications
                if (callback) {
                    callback([]);
                }
            }
        });
        
        return unsubscribe;
    } catch (error) {
        console.error('Error listening for guide notifications:', error);
        return null;
    }
}

/**
 * Listen for user notifications and show unshown ones
 * @param {string} userUid - User's ID
 * @param {function} callback - Callback function when new notification arrives
 */
/**
 * Listen for user notifications and show unshown ones
 * @param {string} userUid - User's ID
 * @param {function} callback - Callback function when new notification arrives
 */
export function listenForUserNotifications(userUid, callback) {
    try {
        console.log('👤 Setting up user notification listener for UID:', userUid);
        
        const notificationsRef = ref(rtdb, 'user-notifications');
        const userQuery = query(notificationsRef, orderByChild('user_uid'), equalTo(userUid));
        
        const unsubscribe = onValue(userQuery, async (snapshot) => {
            console.log('👤 User notifications snapshot received');
            
            if (snapshot.exists()) {
                const notifications = [];
                let totalCount = 0;
                let filteredCount = 0;
                
                snapshot.forEach((childSnapshot) => {
                    const notification = childSnapshot.val();
                    const notificationId = childSnapshot.key;
                    totalCount++;
                    
                    console.log('Notification found:', {
                        id: notificationId,
                        type: notification.type,
                        user_uid: notification.user_uid,
                        title: notification.title
                    });
                    
                    // STRICT FILTER: Only include notifications that are responses from guides
                    // Explicitly exclude booking_request types (those should NEVER be for users)
                    // Allow both "cancelled" and "canceled" spellings
                    const isValidUserNotification = (
                        notification.type !== 'booking_request' && 
                        notification.type?.startsWith('booking_') && (
                            notification.type === 'booking_confirmed' || 
                            notification.type === 'booking_cancelled' ||
                            notification.type === 'booking_canceled' ||
                            notification.type === 'booking_rejected'
                        )
                    );
                    
                    if (isValidUserNotification) {
                        filteredCount++;
                        console.log('✅ Valid user notification accepted:', notification.type);
                        // Collect all notifications (shown and unshown)
                        notifications.push({
                            id: notificationId,
                            ...notification
                        });
                    } else {
                        console.log('❌ Filtered out notification with type:', notification.type);
                    }
                });
                
                console.log(`👤 Total notifications: ${totalCount}, Filtered: ${filteredCount}`);
                
                // Sort by timestamp, newest first
                notifications.sort((a, b) => b.timestamp - a.timestamp);
                
                // Trigger callback with all notifications for UI display
                if (callback) {
                    callback(notifications);
                }
            } else {
                console.log('👤 No notifications found for user');
                // No notifications
                if (callback) {
                    callback([]);
                }
            }
        });
        
        return unsubscribe;
    } catch (error) {
        console.error('Error listening for user notifications:', error);
        return null;
    }
}

/**
 * Get all guide notifications (for display in app)
 * @param {string} guideUid - Guide's user ID
 */
export async function getGuideNotifications(guideUid) {
    try {
        const notificationsRef = ref(rtdb, 'guide-notifications');
        const guideQuery = query(notificationsRef, orderByChild('guide_uid'), equalTo(guideUid));
        
        return new Promise((resolve, reject) => {
            onValue(guideQuery, (snapshot) => {
                if (snapshot.exists()) {
                    const notifications = [];
                    snapshot.forEach((childSnapshot) => {
                        notifications.push({
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });
                    // Sort by timestamp, newest first
                    notifications.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(notifications);
                } else {
                    resolve([]);
                }
            }, { onlyOnce: true });
        });
    } catch (error) {
        console.error('Error getting guide notifications:', error);
        return [];
    }
}

/**
 * Get all user notifications (for display in app)
 * @param {string} userUid - User's ID
 */
export async function getUserNotifications(userUid) {
    try {
        const notificationsRef = ref(rtdb, 'user-notifications');
        const userQuery = query(notificationsRef, orderByChild('user_uid'), equalTo(userUid));
        
        return new Promise((resolve, reject) => {
            onValue(userQuery, (snapshot) => {
                if (snapshot.exists()) {
                    const notifications = [];
                    snapshot.forEach((childSnapshot) => {
                        notifications.push({
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });
                    // Sort by timestamp, newest first
                    notifications.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(notifications);
                } else {
                    resolve([]);
                }
            }, { onlyOnce: true });
        });
    } catch (error) {
        console.error('Error getting user notifications:', error);
        return [];
    }
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} type - 'guide' or 'user'
 */
export async function markNotificationAsRead(notificationId, type = 'user') {
    try {
        const collection = type === 'guide' ? 'guide-notifications' : 'user-notifications';
        const notificationRef = ref(rtdb, `${collection}/${notificationId}`);
        await set(notificationRef, { shown: true });
        console.log(`Notification ${notificationId} marked as read`);
        return { success: true };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} type - 'guide' or 'user'
 */
export async function deleteNotification(notificationId, type = 'user') {
    try {
        const collection = type === 'guide' ? 'guide-notifications' : 'user-notifications';
        const notificationRef = ref(rtdb, `${collection}/${notificationId}`);
        await remove(notificationRef);
        console.log(`Notification ${notificationId} deleted`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error: error.message };
    }
}
