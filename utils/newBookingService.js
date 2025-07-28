import AsyncStorage from '@react-native-async-storage/async-storage';

class NewBookingNotificationService {
  constructor() {
    this.STORAGE_KEY = 'new_bookings_notified';
  }

  // Check for new bookings and return them
  async checkForNewBookings(currentBookings, userId) {
    try {
      // Get previously notified booking IDs from storage
      const storageKey = `${this.STORAGE_KEY}_${userId}`;
      const notifiedBookingsJson = await AsyncStorage.getItem(storageKey);
      const notifiedBookings = notifiedBookingsJson ? JSON.parse(notifiedBookingsJson) : [];

      // Find new pending bookings that haven't been shown yet
      const newBookings = currentBookings.filter(booking => 
        booking.status === 'pending' && !notifiedBookings.includes(booking.id)
      );

      console.log('Checking for new bookings:', {
        totalBookings: currentBookings.length,
        pendingBookings: currentBookings.filter(b => b.status === 'pending').length,
        notifiedBookings: notifiedBookings.length,
        newBookings: newBookings.length
      });

      return newBookings;
    } catch (error) {
      console.error('Error checking for new bookings:', error);
      return [];
    }
  }

  // Mark bookings as notified
  async markBookingsAsNotified(bookingIds, userId) {
    try {
      const storageKey = `${this.STORAGE_KEY}_${userId}`;
      const notifiedBookingsJson = await AsyncStorage.getItem(storageKey);
      const notifiedBookings = notifiedBookingsJson ? JSON.parse(notifiedBookingsJson) : [];

      // Add new booking IDs to the notified list
      const updatedNotifiedBookings = [...new Set([...notifiedBookings, ...bookingIds])];
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedNotifiedBookings));
      console.log('Marked bookings as notified:', bookingIds);
    } catch (error) {
      console.error('Error marking bookings as notified:', error);
    }
  }

  // Clear notification history (useful for testing)
  async clearNotificationHistory(userId) {
    try {
      const storageKey = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(storageKey);
      console.log('Cleared notification history for user:', userId);
    } catch (error) {
      console.error('Error clearing notification history:', error);
    }
  }

  // Get all notified booking IDs
  async getNotifiedBookings(userId) {
    try {
      const storageKey = `${this.STORAGE_KEY}_${userId}`;
      const notifiedBookingsJson = await AsyncStorage.getItem(storageKey);
      return notifiedBookingsJson ? JSON.parse(notifiedBookingsJson) : [];
    } catch (error) {
      console.error('Error getting notified bookings:', error);
      return [];
    }
  }
}

export default new NewBookingNotificationService();
