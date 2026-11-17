package android.webkit; public abstract class WebSettings {
 public abstract void setJavaScriptEnabled(boolean b); public abstract void setDomStorageEnabled(boolean b);
 public abstract void setDatabaseEnabled(boolean b); public abstract void setGeolocationEnabled(boolean b);
 public abstract void setAllowFileAccess(boolean b); public abstract void setAllowContentAccess(boolean b);
 public abstract void setSupportZoom(boolean b); public abstract void setBuiltInZoomControls(boolean b); public abstract void setDisplayZoomControls(boolean b);
 public abstract String getUserAgentString(); public abstract void setUserAgentString(String s); }
