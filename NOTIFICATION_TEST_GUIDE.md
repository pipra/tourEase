# Notification Testing Guide

## Overview
A test notification button has been added to the login page to verify that push notifications are working correctly on your device.

## How to Use

### 1. Test Button Location
- Open the TourEase app
- Go to the Login page
- You'll see a "Test Notification" button below the "Sign In" button

### 2. Testing Notifications
- Click the "Test Notification" button
- The app will:
  1. Request notification permissions (if not already granted)
  2. Fetch data from the Firestore 'test' collection
  3. Send a notification to your device's notification bar
  4. Show an alert with the notification details

### 3. Expected Results
- ✅ A notification appears in your phone's notification bar
- ✅ An alert shows "Notification Sent!" with title and body
- ✅ Console logs show the notification ID

### 4. Creating Test Data in Firestore

To customize the test notification, create a collection named `test` in Firestore with a document containing:

```javascript
{
  title: "Welcome to TourEase!",
  message: "Your tour booking system is ready to use.",
  timestamp: "2025-11-01T10:00:00.000Z",
  type: "test"
}
```

**Steps to add test data:**
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click "Start collection"
4. Collection ID: `test`
5. Add a document with the fields above

### 5. Fallback Behavior
If no test collection exists, the app uses default demo data:
- Title: "Test Notification"
- Message: "This is a test notification from TourEase!"

## Troubleshooting

### Notification Not Showing?

**Check Permissions:**
- Go to your device Settings
- Find TourEase app
- Enable Notifications

**Android:**
```
Settings > Apps > TourEase > Notifications > Allow notifications
```

**iOS:**
```
Settings > TourEase > Notifications > Allow Notifications
```

### Common Issues

1. **"Notification permission not granted"**
   - Solution: Enable notifications in device settings
   - Restart the app after enabling

2. **No alert showing**
   - Check if you're on a physical device (notifications work better on real devices)
   - Emulators may have limited notification support

3. **Data not fetching from Firestore**
   - Verify Firestore security rules allow read access
   - Check internet connection
   - Review console logs for errors

## Notification Features

### What's Included:
- ✅ Permission request handling
- ✅ Local notification scheduling
- ✅ Firestore data integration
- ✅ Sound and vibration
- ✅ High priority notifications (Android)
- ✅ Badge support
- ✅ Error handling and user feedback

### What You Can Customize:
- Notification title
- Notification body/message
- Additional data payload
- Sound settings
- Priority level

## Code Implementation

### Files Modified:
1. `/app/(auth)/login.jsx` - Added test button and handler
2. `/utils/notificationService.js` - Notification utility functions

### Key Functions:
- `sendTestNotification()` - Sends immediate notification
- `scheduleLocalNotification()` - Schedules notification
- `requestNotificationPermissions()` - Handles permissions

## Next Steps

After successful testing, you can use these notification functions throughout your app for:
- Booking confirmations
- Tour reminders
- Guide assignment notifications
- Payment confirmations
- Review requests

## Example Usage in Other Components

```javascript
import { sendTestNotification } from '../utils/notificationService';

// Send a booking confirmation
await sendTestNotification(
  'Booking Confirmed!',
  'Your tour on Dec 15 has been confirmed.',
  { bookingId: '12345', type: 'booking' }
);
```
