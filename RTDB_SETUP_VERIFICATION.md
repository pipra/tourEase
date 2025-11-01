# Firebase Realtime Database Setup Verification

## Current Configuration

Your app is configured to use Firebase Realtime Database at:
```
https://tourease-4cd42-default-rtdb.asia-southeast1.firebasedatabase.app
```

## Why You Might Not See Data

### Issue 1: Realtime Database Not Created
If you haven't created a Realtime Database in Firebase Console, the data won't be stored.

**Solution:**
1. Go to https://console.firebase.google.com
2. Select project: **tourease-4cd42**
3. Click **"Realtime Database"** in left sidebar
4. Click **"Create Database"**
5. Choose **Asia Southeast (Singapore)**
6. Start in **Test Mode**

### Issue 2: Wrong Database Tab
Don't confuse these two:
- ❌ **Firestore Database** (Document database - for bookings, users, guides)
- ✅ **Realtime Database** (JSON tree - for notifications)

You need BOTH:
- **Firestore** = Main app data (already working)
- **Realtime Database** = Notifications only (needs to be enabled)

## How Data is Stored

### Structure in Realtime Database:
```json
{
  "guide-notifications": {
    "-NabCd123xyz": {
      "guide_uid": "user123abc",
      "type": "booking_request",
      "title": "🎯 New Booking Request",
      "message": "John wants to book you for Tokyo on 2024-01-15",
      "data": {
        "bookingId": "booking789",
        "userName": "John Doe",
        "location": "Tokyo",
        "dates": "2024-01-15, 2024-01-16",
        "guests": 2,
        "totalPrice": 200
      },
      "shown": false,
      "timestamp": 1234567890
    },
    "-NabCd456def": {
      "guide_uid": "user456xyz",
      ...
    }
  },
  "user-notifications": {
    "-NxyzAbc789": {
      "user_uid": "user789",
      "type": "booking_confirmed",
      "title": "🎉 Booking Confirmed",
      "message": "Jane has confirmed your booking...",
      "data": { ... },
      "shown": false,
      "timestamp": 1234567891
    }
  }
}
```

## Testing Steps

### 1. Enable Realtime Database
```
Firebase Console → Realtime Database → Create Database
Location: asia-southeast1 (Singapore)
Mode: Test mode (for now)
```

### 2. Add Security Rules
```json
{
  "rules": {
    "guide-notifications": {
      ".indexOn": ["guide_uid"],
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "user-notifications": {
      ".indexOn": ["user_uid"],
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 3. Test the Connection

Run the app and check console for these logs:

**When user creates booking:**
```
=== BOOKING CREATION DEBUG ===
Guide ID: abc123
=== END DEBUG ===

=== SENDING BOOKING REQUEST NOTIFICATION ===
Guide UID: abc123
RTDB instance: [object]
Created notification ref
Pushed new notification ref, Key: -NabCd123
✅ Booking request notification saved successfully to RTDB
Path: guide-notifications/-NabCd123
=== END ===
```

**If you see errors:**
```
❌ Error: PERMISSION_DENIED
→ Solution: Check RTDB rules

❌ Error: Database not found
→ Solution: Create RTDB in Firebase Console

❌ Guide UID: undefined
→ Solution: Guide document missing userId field
```

## Verification Checklist

- [ ] Firebase Console shows "Realtime Database" option (not just Firestore)
- [ ] Realtime Database is created and active
- [ ] Database URL matches: `https://tourease-4cd42-default-rtdb.asia-southeast1.firebasedatabase.app`
- [ ] Security rules are configured
- [ ] Console shows "✅ Booking request notification saved successfully"
- [ ] Firebase Console → Realtime Database → Data tab shows guide-notifications collection

## Common Mistakes

### Mistake 1: Looking in Firestore
```
Firebase Console → Firestore Database ❌
```
**Should be:**
```
Firebase Console → Realtime Database ✅
```

### Mistake 2: Wrong Region
Make sure database is in **asia-southeast1**, not us-central1

### Mistake 3: Rules Not Set
Default rules deny all access. Must set explicit rules.

## What Your Code Does

### File: `firebase.jsx`
```javascript
export const rtdb = getDatabase(app);  // Creates RTDB instance
```

### File: `realtimeNotificationService.js`
```javascript
import { rtdb } from '../app/(auth)/firebase';  // Uses RTDB instance
const notificationRef = ref(rtdb, 'guide-notifications');  // Creates reference
await set(newNotificationRef, notification);  // Writes data
```

### File: `guide.jsx`
```javascript
await sendBookingRequestToGuide(guideId, bookingData);  // Triggers save
```

## Still Not Working?

If you've enabled RTDB and still don't see data:

1. **Check Console Logs**: Look for error messages
2. **Verify Guide UID**: Must be a valid string
3. **Check Network**: App must be online
4. **Verify Auth**: User must be logged in
5. **Check Rules**: Must allow authenticated writes

## Summary

✅ **Your code is CORRECT**
✅ **RTDB export exists**
✅ **Import statement correct**
⚠️ **You need to CREATE Realtime Database in Firebase Console**

The code will work once you enable Realtime Database in your Firebase project!
