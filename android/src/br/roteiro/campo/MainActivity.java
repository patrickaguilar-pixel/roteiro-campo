package br.roteiro.campo;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.os.PowerManager;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.util.Base64;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;

/**
 * Roteiro de Campo: o mesmo app publicado na internet (atualiza sozinho), rodando dentro do aplicativo.
 * O aplicativo acrescenta o que o navegador não consegue: gravar a rota com a tela apagada, login com Google,
 * câmera, compartilhar arquivos, imprimir e guardar o mapa de fundo para usar sem internet.
 */
public class MainActivity extends Activity {
    static final String HOST = "patrickaguilar-pixel.github.io";
    static final String INICIO = "https://" + HOST + "/roteiro-campo/";
    static final String LOGIN = INICIO + "login-app.html";
    static final String AUT = "br.roteiro.campo.arquivos";
    static final int R_ESCOLHA = 11, R_SALVAR = 12, R_PERM = 13, R_PERM_GPS = 14;
    static final String FINE = "android.permission.ACCESS_FINE_LOCATION", COARSE = "android.permission.ACCESS_COARSE_LOCATION", NOTIF = "android.permission.POST_NOTIFICATIONS";
    static final long LIMITE_MAPA = 800L * 1024 * 1024;
    static final long VALIDADE_MAPA = 60L * 24 * 3600 * 1000;
    static final int GRANT_READ = 1, GRANT_WRITE = 2;

    WebView web;
    File dados, mapas;
    ValueCallback<Uri[]> escolha;
    Uri fotoUri;
    GeolocationPermissions.Callback geoCb;
    String geoOrigem;
    OutputStream exp;
    File expTmp, pronto;
    String ua = "RoteiroCampo/1.0";
    boolean imprimindo, pausouImprimindo, gpsPendente, gpsPendenteNovo;
    int gravados;
    String tokenPendente;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        dados = new File(getFilesDir(), "dados");
        dados.mkdirs();
        mapas = new File(getFilesDir(), "mapas");
        mapas.mkdirs();
        try { getWindow().setStatusBarColor(0xFF07523A); } catch (Throwable t) { }
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        try { ua = s.getUserAgentString() + " RoteiroCampo/1.0"; s.setUserAgentString(ua); } catch (Throwable t) { }
        web.addJavascriptInterface(new Ponte(), "AndroidApp");
        web.setWebViewClient(new Cliente());
        web.setWebChromeClient(new Cromo());
        setContentView(web);
        receber(getIntent());
        if (b != null && b.getString("foto") != null)
            aviso("O Android fechou o aplicativo enquanto a câmera estava aberta, e a foto não pôde ser anexada. Tire a foto de novo.");
        web.loadUrl(INICIO);
    }

    @Override
    protected void onSaveInstanceState(Bundle b) {
        super.onSaveInstanceState(b);
        if (fotoUri != null) b.putString("foto", fotoUri.toString());
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        receber(i);
    }

    /* volta do login no navegador: roteirocampo://login?t=TOKEN */
    void receber(Intent i) {
        if (i == null) return;
        try {
            Uri u = i.getData();
            if (u != null && "roteirocampo".equals(u.getScheme())) {
                String t = u.getQueryParameter("t");
                if (t != null && t.length() > 20) { tokenPendente = t; entregarToken(); }
            }
        } catch (Throwable t) { }
    }

    void entregarToken() {
        if (tokenPendente == null) return;
        final String t = tokenPendente.replaceAll("[^A-Za-z0-9_.\\-]", "");
        js("(window.appLoginToken ? (window.appLoginToken('" + t + "'), 1) : 0)", new ValueCallback<String>() {
            public void onReceiveValue(String v) { if ("1".equals(v)) tokenPendente = null; }
        });
    }

    void js(final String codigo) { js(codigo, null); }
    void js(final String codigo, final ValueCallback<String> cb) {
        runOnUiThread(new Runnable() { public void run() { try { web.evaluateJavascript(codigo, cb); } catch (Throwable t) { } } });
    }

    /* ---------- página, mapas de fundo e links externos ---------- */
    class Cliente extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
            Uri u = r.getUrl();
            String h = u == null ? null : u.getHost();
            if (h == null) return null;
            if ("GET".equalsIgnoreCase(r.getMethod()) && ehMapa(h)) return mapa(u.toString());
            return null;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            Uri u = r.getUrl();
            if (u == null) return false;
            String h = u.getHost();
            if (!r.isForMainFrame()) return false;
            if (HOST.equals(h) && u.getPath() != null && u.getPath().startsWith("/roteiro-campo") && !u.getPath().endsWith("login-app.html")) return false;
            if (h != null && h.endsWith(".firebaseapp.com")) return false;
            return abrirFora(u);
        }

        @Override
        public void onPageFinished(WebView v, String url) { entregarToken(); }

        @Override
        public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
            try { setContentView(new View(MainActivity.this)); } catch (Throwable t) { }
            try { v.destroy(); } catch (Throwable t) { }
            if (escolha != null) { try { escolha.onReceiveValue(null); } catch (Throwable t) { } escolha = null; }
            try { recreate(); } catch (Throwable t) { }
            return true;
        }
    }

    static boolean ehMapa(String h) {
        return h.endsWith("arcgisonline.com") || h.endsWith("opentopomap.org") || h.equals("tile.openstreetmap.org") || h.endsWith(".tile.openstreetmap.org");
    }

    static Map<String, String> cabecalho() {
        Map<String, String> m = new HashMap<String, String>();
        m.put("Access-Control-Allow-Origin", "*");
        return m;
    }

    static WebResourceResponse erro(int st) {
        if (st < 400 || st > 599) st = 404;
        return new WebResourceResponse("text/plain", "UTF-8", st, st == 404 ? "Not Found" : "Erro", cabecalho(), new ByteArrayInputStream(new byte[0]));
    }

    /** Mapa de fundo: guarda no celular cada pedaço visto com internet e usa a cópia quando não há sinal. */
    WebResourceResponse mapa(String url) {
        File f = new File(mapas, hash(url));
        boolean tem = f.length() > 0;
        if (tem && System.currentTimeMillis() - f.lastModified() < VALIDADE_MAPA) {
            WebResourceResponse r = doArquivo(f);
            if (r != null) return r;
        }
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(9000);
            c.setReadTimeout(20000);
            c.setRequestProperty("User-Agent", ua);
            c.setRequestProperty("Referer", INICIO);
            int st = c.getResponseCode();
            if (st == 200) {
                String ct = c.getContentType();
                byte[] d = lerTudo(c.getInputStream());
                if (ct != null && ct.toLowerCase().startsWith("image/") && ehImagem(d)) {
                    guardar(f, d);
                    return new WebResourceResponse(mimeImagem(d), null, 200, "OK", cabecalho(), new ByteArrayInputStream(d));
                }
                if (tem) { WebResourceResponse r = doArquivo(f); if (r != null) return r; }
                return erro(502);
            }
            if (tem) { WebResourceResponse r = doArquivo(f); if (r != null) return r; }
            return erro(st);
        } catch (Exception e) {
            if (tem) { WebResourceResponse r = doArquivo(f); if (r != null) return r; }
            return erro(504);
        } finally {
            if (c != null) try { c.disconnect(); } catch (Throwable t) { }
        }
    }

    WebResourceResponse doArquivo(File f) {
        try {
            byte[] d = lerTudo(new FileInputStream(f));
            return new WebResourceResponse(mimeImagem(d), null, 200, "OK", cabecalho(), new ByteArrayInputStream(d));
        } catch (Exception e) {
            return null;
        }
    }

    static boolean ehImagem(byte[] d) {
        if (d.length < 12) return false;
        if ((d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8) return true;
        if ((d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') return true;
        return d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F' && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P';
    }

    static String mimeImagem(byte[] d) {
        if (d.length > 2 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8) return "image/jpeg";
        if (d.length > 3 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F') return "image/webp";
        return "image/png";
    }

    void guardar(File f, byte[] d) {
        try {
            File t = new File(mapas, f.getName() + "." + Thread.currentThread().getId() + ".tmp");
            FileOutputStream o = new FileOutputStream(t);
            o.write(d);
            o.close();
            if (!t.renameTo(f)) t.delete();
        } catch (Exception e) { }
        boolean podar;
        synchronized (this) { gravados++; podar = gravados % 250 == 0; }
        if (podar) new Thread(new Runnable() { public void run() { podarMapas(); } }).start();
    }

    void podarMapas() {
        File[] fs = mapas.listFiles();
        if (fs == null) return;
        long tot = 0;
        for (File x : fs) tot += x.length();
        if (tot <= LIMITE_MAPA) return;
        final Map<File, Long> mod = new HashMap<File, Long>();
        for (File x : fs) mod.put(x, x.lastModified());
        Arrays.sort(fs, new Comparator<File>() { public int compare(File a, File b) { long x = mod.get(a), y = mod.get(b); return x < y ? -1 : x > y ? 1 : 0; } });
        for (File x : fs) {
            if (tot < LIMITE_MAPA * 8 / 10) break;
            tot -= x.length();
            x.delete();
        }
    }

    static String hash(String s) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-1").digest(s.getBytes("UTF-8"));
            StringBuilder b = new StringBuilder();
            for (byte x : h) b.append(String.format("%02x", x & 0xFF));
            return b.toString();
        } catch (Exception e) {
            return String.valueOf(s.hashCode());
        }
    }

    boolean abrirFora(Uri u) {
        if (u == null) return false;
        try {
            Intent i;
            if ("intent".equals(u.getScheme())) {
                i = Intent.parseUri(u.toString(), 1);
                i.addCategory("android.intent.category.BROWSABLE");
                i.setComponent(null);
            } else {
                i = new Intent("android.intent.action.VIEW", u);
            }
            startActivity(i);
        } catch (Exception e) {
            aviso("Nenhum aplicativo deste celular abre esse link.");
        }
        return true;
    }

    /* ---------- fotos, arquivos e localização ---------- */
    class Cromo extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (escolha != null) { try { escolha.onReceiveValue(null); } catch (Throwable t) { } }
            escolha = cb;
            fotoUri = null;
            boolean img = false;
            String[] ac = p.getAcceptTypes();
            if (ac != null) for (String t : ac) if (t != null && t.startsWith("image")) img = true;
            Intent alvo;
            if (img && p.isCaptureEnabled()) {
                File pasta = new File(getCacheDir(), "foto");
                pasta.mkdirs();
                File[] velhas = pasta.listFiles();
                if (velhas != null) for (File x : velhas) if (System.currentTimeMillis() - x.lastModified() > 86400000L) x.delete();
                fotoUri = Uri.parse("content://" + AUT + "/foto/foto_" + System.currentTimeMillis() + ".jpg");
                alvo = new Intent("android.media.action.IMAGE_CAPTURE");
                alvo.putExtra("output", fotoUri);
                alvo.setClipData(ClipData.newRawUri("foto", fotoUri));
                alvo.addFlags(GRANT_READ | GRANT_WRITE);
            } else {
                Intent g = new Intent("android.intent.action.GET_CONTENT");
                g.addCategory("android.intent.category.OPENABLE");
                g.setType(img ? "image/*" : "*/*");
                if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) g.putExtra("android.intent.extra.ALLOW_MULTIPLE", true);
                alvo = Intent.createChooser(g, img ? "Escolher fotos" : "Escolher o arquivo");
            }
            try {
                startActivityForResult(alvo, R_ESCOLHA);
            } catch (Exception e) {
                escolha = null;
                fotoUri = null;
                aviso("Nenhum aplicativo disponível para isso.");
                return false;
            }
            return true;
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origem, GeolocationPermissions.Callback cb) {
            if (temLocal()) { cb.invoke(origem, true, false); return; }
            geoCb = cb;
            geoOrigem = origem;
            try { requestPermissions(new String[]{FINE, COARSE}, R_PERM); } catch (Throwable t) { cb.invoke(origem, false, false); geoCb = null; }
        }
    }

    boolean temLocal() {
        try { return checkSelfPermission(FINE) == 0 || checkSelfPermission(COARSE) == 0; } catch (Throwable t) { return false; }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req == R_PERM && geoCb != null) {
            boolean ok = temLocal();
            try { geoCb.invoke(geoOrigem, ok, false); } catch (Throwable t) { }
            geoCb = null;
        } else if (req == R_PERM_GPS && gpsPendente) {
            gpsPendente = false;
            if (temLocal()) iniciarServico(gpsPendenteNovo);
            else { aviso("Sem permissão de localização o app não consegue gravar a rota."); js("window.appGpsNegado && window.appGpsNegado()"); }
        }
    }

    /* ---------- gravação da rota em segundo plano ---------- */
    void iniciarGps(boolean novo) {
        boolean precisa = !temLocal();
        boolean notif = false;
        try { notif = Build.VERSION.SDK_INT >= 33 && checkSelfPermission(NOTIF) != 0; } catch (Throwable t) { }
        if (precisa || notif) {
            gpsPendente = true;
            gpsPendenteNovo = novo;
            try { requestPermissions(notif ? new String[]{FINE, COARSE, NOTIF} : new String[]{FINE, COARSE}, R_PERM_GPS); } catch (Throwable t) { }
            if (!precisa) { gpsPendente = false; iniciarServico(novo); }
            return;
        }
        iniciarServico(novo);
    }

    void iniciarServico(boolean novo) {
        Intent i = new Intent(this, GpsService.class);
        i.putExtra("novo", novo);
        try {
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
        } catch (Throwable t) {
            aviso("Não foi possível iniciar a gravação em segundo plano.");
        }
        pedirBateria();
    }

    /* pede ao Android para não interromper a gravação para economizar bateria (uma vez) */
    void pedirBateria() {
        try {
            if (Build.VERSION.SDK_INT < 23) return;
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm.isIgnoringBatteryOptimizations(getPackageName())) return;
            File marca = new File(dados, "bateria.pedida");
            if (marca.exists()) return;
            new FileOutputStream(marca).close();
            Intent i = new Intent("android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", Uri.parse("package:" + getPackageName()));
            startActivity(i);
        } catch (Throwable t) { }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == R_ESCOLHA) {
            Uri[] r = null;
            if (res == RESULT_OK) {
                if (fotoUri != null) {
                    File f = new File(new File(getCacheDir(), "foto"), fotoUri.getLastPathSegment());
                    if (f.length() > 0) r = new Uri[]{fotoUri};
                } else if (data != null) {
                    ClipData cd = data.getClipData();
                    if (cd != null && cd.getItemCount() > 0) {
                        r = new Uri[cd.getItemCount()];
                        for (int i = 0; i < r.length; i++) r[i] = cd.getItemAt(i).getUri();
                    } else if (data.getData() != null) {
                        r = new Uri[]{data.getData()};
                    }
                }
            }
            if (escolha != null) { try { escolha.onReceiveValue(r); } catch (Throwable t) { } }
            escolha = null;
            fotoUri = null;
        } else if (req == R_SALVAR) {
            if (res == RESULT_OK && data != null && data.getData() != null) {
                File src = pronto;
                if (src == null || !src.exists()) {
                    File[] fs = new File(getCacheDir(), "envio").listFiles();
                    if (fs != null) for (File x : fs) if (!x.getName().startsWith(".")) src = x;
                }
                if (src == null) { aviso("O arquivo não está mais disponível. Exporte de novo."); return; }
                final File origem = src;
                final Uri alvo = data.getData();
                new Thread(new Runnable() {
                    public void run() {
                        try {
                            copiar(new FileInputStream(origem), getContentResolver().openOutputStream(alvo));
                            aviso("Arquivo salvo.");
                        } catch (Exception e) {
                            aviso("Não foi possível salvar o arquivo nesse local.");
                        }
                    }
                }).start();
            }
        }
    }

    /* ---------- ponte com a página ---------- */
    class Ponte {
        @JavascriptInterface
        public String ler(String nome) {
            File f = new File(dados, limpo(nome) + ".json");
            if (!f.exists()) return "";
            try { return new String(lerTudo(new FileInputStream(f)), "UTF-8"); } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public boolean gravar(String nome, String texto) {
            String n = limpo(nome);
            File f = new File(dados, n + ".json"), t = new File(dados, n + ".tmp");
            try {
                FileOutputStream o = new FileOutputStream(t);
                o.write(texto.getBytes("UTF-8"));
                o.getFD().sync();
                o.close();
                return t.renameTo(f);
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean temRecebido() { return false; }

        @JavascriptInterface
        public String lerRecebido() { return ""; }

        @JavascriptInterface
        public void expIniciar() throws IOException {
            synchronized (MainActivity.this) {
                fecharExp();
                File pasta = new File(getCacheDir(), "envio");
                pasta.mkdirs();
                File[] velhos = pasta.listFiles();
                if (velhos != null) for (File x : velhos) x.delete();
                expTmp = new File(pasta, ".parcial");
                exp = new BufferedOutputStream(new FileOutputStream(expTmp), 1 << 16);
            }
        }

        @JavascriptInterface
        public void expTexto(String t) throws IOException {
            synchronized (MainActivity.this) { exp.write(t.getBytes("UTF-8")); }
        }

        @JavascriptInterface
        public void expB64(String b) throws IOException {
            synchronized (MainActivity.this) { exp.write(Base64.decode(b, 0)); }
        }

        @JavascriptInterface
        public void expConcluir(String nome, final String mime) throws IOException {
            final File f;
            synchronized (MainActivity.this) {
                exp.close();
                exp = null;
                f = new File(expTmp.getParentFile(), limpoArq(nome));
                if (!expTmp.renameTo(f)) throw new IOException("renomear");
                pronto = f;
            }
            runOnUiThread(new Runnable() { public void run() { destino(f, mime); } });
        }

        @JavascriptInterface
        public void imprimir(final String titulo) {
            runOnUiThread(new Runnable() { public void run() { imprimirAgora(titulo); } });
        }

        @JavascriptInterface
        public String tamanhoMapas() {
            long t = 0;
            File[] fs = mapas.listFiles();
            if (fs != null) for (File x : fs) t += x.length();
            return String.valueOf(t / (1024 * 1024));
        }

        @JavascriptInterface
        public void limparMapas() {
            File[] fs = mapas.listFiles();
            if (fs != null) for (File x : fs) x.delete();
        }

        @JavascriptInterface
        public String versaoApp() { return "1.0"; }

        /* login com Google: acontece no navegador (o Google não permite dentro de aplicativos) e volta com o token */
        @JavascriptInterface
        public void loginGoogle() {
            runOnUiThread(new Runnable() { public void run() {
                try { startActivity(new Intent("android.intent.action.VIEW", Uri.parse(LOGIN))); }
                catch (Throwable t) { aviso("Não foi possível abrir o navegador para entrar."); }
            } });
        }

        /* gravação da rota com a tela apagada */
        @JavascriptInterface
        public void gpsIniciar(final boolean novo) {
            runOnUiThread(new Runnable() { public void run() { iniciarGps(novo); } });
        }

        @JavascriptInterface
        public void gpsParar() {
            runOnUiThread(new Runnable() { public void run() {
                try { stopService(new Intent(MainActivity.this, GpsService.class)); } catch (Throwable t) { }
            } });
        }

        @JavascriptInterface
        public boolean gpsAtivo() { return GpsService.ativo; }

        /** Posições gravadas a partir da linha "desde": [[lat,lon,ms,precisão,velocidade],...] */
        @JavascriptInterface
        public String gpsPontos(int desde) {
            File f = GpsService.arquivo(MainActivity.this);
            if (!f.exists()) return "[]";
            try {
                String[] linhas = new String(lerTudo(new FileInputStream(f)), "UTF-8").split("\n");
                StringBuilder b = new StringBuilder("[");
                int n = 0;
                for (int i = Math.max(0, desde); i < linhas.length; i++) {
                    String l = linhas[i].trim();
                    if (l.length() == 0 || l.split(",").length < 5) continue;
                    if (n++ > 0) b.append(',');
                    b.append('[').append(l).append(']');
                }
                return b.append(']').toString();
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public void gpsLimpar() { GpsService.arquivo(MainActivity.this).delete(); }
    }

    void fecharExp() {
        if (exp != null) { try { exp.close(); } catch (Exception e) { } exp = null; }
    }

    static String limpo(String s) { return s == null ? "x" : s.replaceAll("[^A-Za-z0-9_-]", "_"); }

    static String limpoArq(String s) {
        String n = s == null ? "arquivo" : s.replaceAll("[\\\\/:*?\"<>|\\x00-\\x1f]", "_").trim();
        if (n.length() == 0 || n.startsWith(".")) n = "arquivo" + n;
        return n;
    }

    static String tamanho(long b) {
        if (b < 1024 * 1024) return Math.max(1, b / 1024) + " KB";
        return String.format("%.1f MB", b / 1048576.0).replace('.', ',');
    }

    Intent semEsteApp(Intent chooser) {
        try { chooser.putExtra("android.intent.extra.EXCLUDE_COMPONENTS", new Parcelable[]{new ComponentName("br.roteiro.campo", "br.roteiro.campo.MainActivity")}); } catch (Throwable t) { }
        return chooser;
    }

    void destino(final File f, final String mime) {
        if (isFinishing()) return;
        final Uri u = Uri.parse("content://" + AUT + "/envio/" + Uri.encode(f.getName()));
        String[] op = {"Enviar (WhatsApp, e-mail, Drive…)", "Salvar numa pasta do celular", "Abrir com outro aplicativo"};
        try {
        new AlertDialog.Builder(this)
            .setTitle(f.getName() + " (" + tamanho(f.length()) + ")")
            .setItems(op, new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface d, int i) {
                    try {
                        if (i == 0) {
                            Intent s = new Intent("android.intent.action.SEND");
                            s.setType(mime);
                            s.putExtra("android.intent.extra.STREAM", u);
                            s.setClipData(ClipData.newRawUri(f.getName(), u));
                            s.addFlags(GRANT_READ);
                            startActivity(semEsteApp(Intent.createChooser(s, "Enviar " + f.getName())));
                        } else if (i == 1) {
                            Intent c = new Intent("android.intent.action.CREATE_DOCUMENT");
                            c.addCategory("android.intent.category.OPENABLE");
                            c.setType(mime);
                            c.putExtra("android.intent.extra.TITLE", f.getName());
                            startActivityForResult(c, R_SALVAR);
                        } else {
                            Intent v = new Intent("android.intent.action.VIEW");
                            v.setDataAndType(u, mime);
                            v.setClipData(ClipData.newRawUri(f.getName(), u));
                            v.addFlags(GRANT_READ);
                            startActivity(semEsteApp(Intent.createChooser(v, "Abrir " + f.getName() + " com")));
                        }
                    } catch (Exception e) {
                        aviso("Nenhum aplicativo disponível para isso.");
                    }
                }
            })
            .setNegativeButton("Cancelar", null)
            .show();
        } catch (Throwable t) { }
    }

    void imprimirAgora(String titulo) {
        try {
            PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            pm.print(titulo, web.createPrintDocumentAdapter(titulo), new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
            imprimindo = true;
        } catch (Throwable t) {
            aviso("Não foi possível abrir a impressão.");
            js("window.appFimImpressao && window.appFimImpressao()");
        }
    }

    /* ---------- ciclo de vida ---------- */
    @Override
    protected void onPause() {
        super.onPause();
        if (imprimindo) pausouImprimindo = true;
        js("window.appPausa && window.appPausa()");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pausouImprimindo) {
            pausouImprimindo = false;
            imprimindo = false;
            js("window.appFimImpressao && window.appFimImpressao()");
        }
        js("window.appVolta && window.appVolta()");
    }

    @Override
    public void onBackPressed() {
        try {
            if (web.canGoBack()) { web.goBack(); return; }
        } catch (Throwable t) { }
        moveTaskToBack(true);
    }

    void aviso(final String t) {
        runOnUiThread(new Runnable() { public void run() { Toast.makeText(MainActivity.this, t, 1).show(); } });
    }

    static byte[] lerTudo(InputStream in) throws IOException {
        try {
            ByteArrayOutputStream o = new ByteArrayOutputStream();
            byte[] b = new byte[65536];
            int n;
            while ((n = in.read(b)) > 0) o.write(b, 0, n);
            return o.toByteArray();
        } finally {
            in.close();
        }
    }

    static void copiar(InputStream in, OutputStream out) throws IOException {
        try {
            byte[] b = new byte[65536];
            int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
        } finally {
            in.close();
            out.close();
        }
    }
}
