package android.webkit; public class WebView extends android.view.View {
 public WebView(android.content.Context c){ super(c); }
 public WebSettings getSettings(){ return null; } public void addJavascriptInterface(Object o, String n){}
 public void setWebViewClient(WebViewClient c){} public void setWebChromeClient(WebChromeClient c){}
 public void loadUrl(String u){} public void destroy(){} public void evaluateJavascript(String s, ValueCallback<String> cb){}
 public boolean canGoBack(){ return false; } public void goBack(){}
 public android.print.PrintDocumentAdapter createPrintDocumentAdapter(String n){ return null; } }
