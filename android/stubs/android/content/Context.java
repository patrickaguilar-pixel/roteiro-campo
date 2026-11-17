package android.content; public abstract class Context {
 public static final String PRINT_SERVICE = "print"; public static final String LOCATION_SERVICE = "location";
 public static final String NOTIFICATION_SERVICE = "notification"; public static final String POWER_SERVICE = "power";
 public java.io.File getFilesDir(){ return null; } public java.io.File getCacheDir(){ return null; }
 public Object getSystemService(String n){ return null; } public String getPackageName(){ return null; }
 public android.content.pm.ApplicationInfo getApplicationInfo(){ return null; }
 public ContentResolver getContentResolver(){ return null; } public int checkSelfPermission(String p){ return 0; }
 public ComponentName startService(Intent i){ return null; } public ComponentName startForegroundService(Intent i){ return null; }
 public boolean stopService(Intent i){ return false; } }
