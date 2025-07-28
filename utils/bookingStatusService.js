import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKING_STATUS_KEY = 'lastNotifiedBookingStatuses';

/**
 * Service to track and manage booking status change notifications for users
 */
export const bookingStatusService = {
    /**
     * Check for booking status changes that haven't been notified yet
     * @param {Array} currentBookings - Array of current user bookings
     * @param {string} userId - Current user ID
     * @returns {Array} Array of bookings with status changes
     */
    async checkForStatusChanges(currentBookings, userId) {
        try {
            const storageKey = `${BOOKING_STATUS_KEY}_${userId}`;
            const lastNotifiedStatuses = await AsyncStorage.getItem(storageKey);
            const lastStatuses = lastNotifiedStatuses ? JSON.parse(lastNotifiedStatuses) : {};

            const statusChanges = [];

            for (const booking of currentBookings) {
                const lastStatus = lastStatuses[booking.id];
                const currentStatus = booking.status;

                // Only notify for status changes from pending to approved/rejected
                if (lastStatus === 'pending' && (currentStatus === 'confirmed' || currentStatus === 'accepted' || currentStatus === 'cancelled')) {
                    statusChanges.push({
                        ...booking,
                        previousStatus: lastStatus,
                        newStatus: currentStatus,
                        statusChangeType: currentStatus === 'cancelled' ? 'rejected' : 'approved'
                    });
                }
            }

            // Update the stored statuses for all current bookings
            const updatedStatuses = {};
            currentBookings.forEach(booking => {
                updatedStatuses[booking.id] = booking.status;
            });
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedStatuses));

            return statusChanges;
        } catch (error) {
            console.error('Error checking for booking status changes:', error);
            return [];
        }
    },

    /**
     * Mark booking status changes as notified
     * @param {Array} bookingIds - Array of booking IDs that have been notified
     * @param {string} userId - Current user ID
     */
    async markStatusChangesAsNotified(bookingIds, userId) {
        try {
            // This method is mainly for consistency with the guide service
            // The actual status tracking is done in checkForStatusChanges
            console.log(`Marked ${bookingIds.length} booking status changes as notified for user ${userId}`);
        } catch (error) {
            console.error('Error marking booking status changes as notified:', error);
        }
    },

    /**
     * Clear all notification history for a user (for testing purposes)
     * @param {string} userId - Current user ID
     */
    async clearNotificationHistory(userId) {
        try {
            const storageKey = `${BOOKING_STATUS_KEY}_${userId}`;
            await AsyncStorage.removeItem(storageKey);
            console.log(`Cleared booking status notification history for user ${userId}`);
        } catch (error) {
            console.error('Error clearing booking status notification history:', error);
        }
    },

    /**
     * Initialize status tracking for new bookings
     * @param {Array} bookings - Array of user bookings
     * @param {string} userId - Current user ID
     */
    async initializeStatusTracking(bookings, userId) {
        try {
            const storageKey = `${BOOKING_STATUS_KEY}_${userId}`;
            const existingData = await AsyncStorage.getItem(storageKey);
            
            if (!existingData) {
                // First time - store all current booking statuses without notifying
                const initialStatuses = {};
                bookings.forEach(booking => {
                    initialStatuses[booking.id] = booking.status;
                });
                await AsyncStorage.setItem(storageKey, JSON.stringify(initialStatuses));
                console.log(`Initialized status tracking for ${bookings.length} bookings for user ${userId}`);
            }
        } catch (error) {
            console.error('Error initializing status tracking:', error);
        }
    }
};
