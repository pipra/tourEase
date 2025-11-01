# Firebase Realtime Database Setup Instructions

## Step 1: Enable Realtime Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **tourease-4cd42**
3. In the left sidebar, click **Build** → **Realtime Database**
4. Click **Create Database**
5. Choose location (recommended: same as Firestore)
6. Start in **Test Mode** (we'll secure it next)
7. Click **Enable**

## Step 2: Configure Security Rules

1. In Realtime Database, click the **Rules** tab
2. Replace the default rules with:

```json
{
  "rules": {
    "guide-notifications": {
      ".indexOn": ["guide_uid"],
      "$notificationId": {
        ".read": "auth != null && (data.child('guide_uid').val() === auth.uid || root.child('Users').child(auth.uid).child('userType').val() === 'admin')",
        ".write": "auth != null"
      }
    },
    "user-notifications": {
      ".indexOn": ["user_uid"],
      "$notificationId": {
        ".read": "auth != null && (data.child('user_uid').val() === auth.uid || root.child('Users').child(auth.uid).child('userType').val() === 'admin')",
        ".write": "auth != null"
      }
    }
  }
}
```

3. Click **Publish**

## Step 3: Verify Database URL

Your database URL should be:
```
https://tourease-4cd42-default-rtdb.firebaseio.com
```

This is already configured in `/app/(auth)/firebase.jsx`.

## Step 4: Test Connection

1. Build and run the app
2. Check the console for:
   ```
   Notification listener set up successfully
   ```

3. In Firebase Console → Realtime Database → Data tab
4. You should see collections appear when notifications are sent

## Security Rules Explanation

### guide-notifications
- **Index:** `guide_uid` - Enables fast queries for guide-specific notifications
- **Read:** Only the guide with matching UID can read their notifications (+ admins)
- **Write:** Any authenticated user can write (needed for users to send requests)

### user-notifications
- **Index:** `user_uid` - Enables fast queries for user-specific notifications
- **Read:** Only the user with matching UID can read their notifications (+ admins)
- **Write:** Any authenticated user can write (needed for guides to send responses)

## Database Structure Example

After some activity, your database will look like:

```
tourease-4cd42-default-rtdb
├── guide-notifications
│   ├── -NxYzAbC123
│   │   ├── guide_uid: "guide_user_id_123"
│   │   ├── type: "booking_request"
│   │   ├── title: "New Booking Request"
│   │   ├── message: "New booking from John Doe"
│   │   ├── data: {...}
│   │   ├── shown: true
│   │   └── timestamp: 1705401234567
│   └── -NxYzAbC456
│       └── ...
└── user-notifications
    ├── -NxYzDef789
    │   ├── user_uid: "user_id_456"
    │   ├── type: "booking_confirmed"
    │   ├── title: "Booking Confirmed"
    │   ├── message: "Your booking has been confirmed"
    │   ├── data: {...}
    │   ├── shown: true
    │   └── timestamp: 1705401567890
    └── -NxYzDef012
        └── ...
```

## Monitoring & Debugging

### Check Active Connections
Firebase Console → Realtime Database → **Usage** tab shows:
- Concurrent connections
- Data downloaded
- Data stored

### View Real-time Data
Firebase Console → Realtime Database → **Data** tab:
- See notifications as they're created
- Check `shown` flag status
- Verify timestamps and data

### Debug Queries
In your console logs, look for:
```
Notification listener set up successfully
New booking request notification received: {...}
Booking request notification sent to guide
```

## Performance Optimization

### Indexing
The `.indexOn` rules enable efficient queries:
```javascript
// This query is optimized with index:
query(ref(rtdb, 'guide-notifications'), 
      orderByChild('guide_uid'), 
      equalTo(guideUid))
```

Without indexing, Firebase would scan all notifications (slow).

### Data Cleanup (Optional)

To prevent database growth, add a cleanup function:

```javascript
// Clean old shown notifications (older than 30 days)
export async function cleanupOldNotifications() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  // Clean guide notifications
  const guideNotifs = await get(ref(rtdb, 'guide-notifications'));
  guideNotifs.forEach((snap) => {
    const notif = snap.val();
    if (notif.shown && notif.timestamp < thirtyDaysAgo) {
      remove(ref(rtdb, `guide-notifications/${snap.key}`));
    }
  });
  
  // Clean user notifications
  const userNotifs = await get(ref(rtdb, 'user-notifications'));
  userNotifs.forEach((snap) => {
    const notif = snap.val();
    if (notif.shown && notif.timestamp < thirtyDaysAgo) {
      remove(ref(rtdb, `user-notifications/${snap.key}`));
    }
  });
}
```

Run this periodically via Cloud Functions or manually.

## Troubleshooting

### "Permission Denied" Errors

**Symptom:** 
```
Error: PERMISSION_DENIED: Permission denied
```

**Solution:**
1. Check that user is authenticated: `auth.currentUser !== null`
2. Verify security rules are published
3. Check that UID in notification matches authenticated user

### "Index Not Defined" Warnings

**Symptom:**
```
Warning: Using an unspecified index. Consider adding ".indexOn"
```

**Solution:**
Already fixed with `.indexOn` rules above. Make sure rules are published.

### Notifications Not Appearing

**Check:**
1. Database URL correct in firebase.jsx
2. Realtime Database enabled in Firebase Console
3. Security rules allow read/write
4. Console logs show listener setup success
5. User has granted notification permissions

## Cost Considerations

Firebase Realtime Database pricing (as of 2024):

**Spark (Free) Plan:**
- 1 GB stored
- 10 GB/month downloaded
- 100 simultaneous connections

**Blaze (Pay-as-you-go):**
- $5/GB stored
- $1/GB downloaded
- No connection limit

For TourEase with moderate usage:
- ~1000 notifications/month
- ~1 MB per notification
- **Estimated cost:** FREE (well within Spark limits)

## Backup Strategy

Firebase Realtime Database can be backed up:

1. **Automated Backups** (Blaze plan):
   - Firebase Console → Realtime Database → Backups
   - Schedule daily backups

2. **Manual Export**:
   ```javascript
   // Export all notifications
   const snapshot = await get(ref(rtdb, '/'));
   const backup = snapshot.val();
   // Save to file or cloud storage
   ```

## Migration Notes

If you need to migrate from test mode to production:

1. Update security rules (already done above)
2. No data migration needed - rules update in place
3. Test with new rules before publishing
4. Monitor logs for permission errors

## Summary

✅ Database URL configured: `https://tourease-4cd42-default-rtdb.firebaseio.com`
✅ Security rules defined with proper indexing
✅ Read access restricted to notification owners
✅ Write access restricted to authenticated users
✅ Indexes optimize query performance
✅ Ready for production use

Next: Build development APK and test notifications!
