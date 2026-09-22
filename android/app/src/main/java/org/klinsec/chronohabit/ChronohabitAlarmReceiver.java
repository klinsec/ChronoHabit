package org.klinsec.chronohabit;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.util.Log;

public class ChronohabitAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra("id", 1);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");

        // Intent to launch MainActivity over lock screen
        Intent fullScreenIntent = new Intent(context, MainActivity.class);
        fullScreenIntent.putExtra("isAlarm", true);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(context, id, fullScreenIntent, flags);

        // Required to have a channel, capacitor creates chronohabit-alarm-v3
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "chronohabit-alarm-v3")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true)
                .setOngoing(true);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(id, builder.build());
        } catch(SecurityException e) {
            Log.e("ChronoHabit", "Security exception posting alarm notification", e);
        }
        
        // Also explicitly start the activity just in case fullScreenIntent is ignored while screen is off but unlocked
        try {
            context.startActivity(fullScreenIntent);
        } catch (Exception e) {
            Log.e("ChronoHabit", "Error starting full screen intent", e);
        }
    }
}
