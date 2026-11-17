package android.content; public class Intent {
 public Intent(String a){} public Intent(String a, android.net.Uri u){} public Intent(Context c, Class<?> k){}
 public static Intent parseUri(String u, int f) throws java.net.URISyntaxException { return null; }
 public static Intent createChooser(Intent t, CharSequence title){ return null; }
 public Intent addCategory(String c){ return null; } public Intent setComponent(ComponentName c){ return null; }
 public Intent setType(String t){ return null; } public Intent setDataAndType(android.net.Uri u, String t){ return null; }
 public Intent putExtra(String n, boolean v){ return null; } public Intent putExtra(String n, String v){ return null; }
 public Intent putExtra(String n, android.os.Parcelable v){ return null; }
 public Intent addFlags(int f){ return null; } public int getFlags(){ return 0; }
 public boolean getBooleanExtra(String n, boolean d){ return false; }
 public Intent putExtra(String n, android.os.Parcelable[] v){ return null; } public void setClipData(ClipData c){}
 public ClipData getClipData(){ return null; } public android.net.Uri getData(){ return null; }
 public String getAction(){ return null; } public String getType(){ return null; } }
