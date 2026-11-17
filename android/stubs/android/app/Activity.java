package android.app; public class Activity extends android.view.ContextThemeWrapper {
 public static final int RESULT_OK = -1;
 protected void onCreate(android.os.Bundle b){} protected void onResume(){} protected void onPause(){}
 protected void onNewIntent(android.content.Intent i){}
 public android.content.Intent getIntent(){ return null; } public void setIntent(android.content.Intent i){}
 public void setContentView(android.view.View v){} public android.view.Window getWindow(){ return null; }
 public void startActivity(android.content.Intent i){} public void startActivityForResult(android.content.Intent i, int r){}
 protected void onActivityResult(int q, int r, android.content.Intent d){}
 public void onBackPressed(){} public void recreate(){} public boolean isFinishing(){ return false; }
 protected void onSaveInstanceState(android.os.Bundle b){} public boolean moveTaskToBack(boolean b){ return false; }
 public final void runOnUiThread(Runnable r){}
 public final void requestPermissions(String[] p, int r){}
 public void onRequestPermissionsResult(int r, String[] p, int[] g){} }
