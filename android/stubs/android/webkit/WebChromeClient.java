package android.webkit; public class WebChromeClient {
 public boolean onShowFileChooser(WebView w, ValueCallback<android.net.Uri[]> cb, FileChooserParams p){ return false; }
 public void onGeolocationPermissionsShowPrompt(String o, GeolocationPermissions.Callback cb){}
 public static abstract class FileChooserParams { public static final int MODE_OPEN_MULTIPLE = 1;
  public abstract int getMode(); public abstract String[] getAcceptTypes(); public abstract boolean isCaptureEnabled(); } }
