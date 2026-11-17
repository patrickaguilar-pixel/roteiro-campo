package android.app; public abstract class Service extends android.content.ContextWrapper {
 public static final int START_STICKY = 1; public static final int START_NOT_STICKY = 2;
 public int onStartCommand(android.content.Intent i, int f, int id){ return 0; }
 public void onDestroy(){} public abstract android.os.IBinder onBind(android.content.Intent i);
 public final void startForeground(int id, Notification n){} public final void startForeground(int id, Notification n, int t){}
 public final void stopForeground(boolean r){} public final void stopSelf(){} }
