package br.roteiro.campo;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.List;

/** Entrega aos outros apps (câmera, WhatsApp, Drive…) só os arquivos das pastas "foto" e "envio" do próprio app. */
public class Arquivos extends ContentProvider {
    @Override
    public boolean onCreate() { return true; }

    File arquivo(Uri u) throws FileNotFoundException {
        List<String> s = u.getPathSegments();
        if (s == null || s.size() != 2) throw new FileNotFoundException();
        String pasta = s.get(0), nome = s.get(1);
        if (!(pasta.equals("foto") || pasta.equals("envio")) || nome.contains("/") || nome.startsWith(".")) throw new FileNotFoundException();
        return new File(new File(getContext().getCacheDir(), pasta), nome);
    }

    @Override
    public ParcelFileDescriptor openFile(Uri u, String modo) throws FileNotFoundException {
        File f = arquivo(u);
        int m;
        if (modo != null && modo.contains("w")) {
            if (!f.getParentFile().getName().equals("foto")) throw new FileNotFoundException("somente leitura");
            f.getParentFile().mkdirs();
            m = ParcelFileDescriptor.parseMode(modo);
        } else {
            m = ParcelFileDescriptor.MODE_READ_ONLY;
        }
        return ParcelFileDescriptor.open(f, m);
    }

    @Override
    public Cursor query(Uri u, String[] proj, String sel, String[] args, String ordem) {
        File f;
        try { f = arquivo(u); } catch (FileNotFoundException e) { return null; }
        String[] cols = proj != null ? proj : new String[]{"_display_name", "_size"};
        ArrayList<String> c = new ArrayList<String>();
        ArrayList<Object> v = new ArrayList<Object>();
        for (String k : cols) {
            if ("_display_name".equals(k)) { c.add(k); v.add(f.getName()); }
            else if ("_size".equals(k)) { c.add(k); v.add(Long.valueOf(f.length())); }
        }
        MatrixCursor mc = new MatrixCursor(c.toArray(new String[0]), 1);
        mc.addRow(v.toArray());
        return mc;
    }

    @Override
    public String getType(Uri u) {
        String n = u.getLastPathSegment();
        n = n == null ? "" : n.toLowerCase();
        if (n.endsWith(".html") || n.endsWith(".htm")) return "text/html";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".zip")) return "application/zip";
        if (n.endsWith(".csv")) return "text/csv";
        if (n.endsWith(".kml")) return "application/vnd.google-earth.kml+xml";
        if (n.endsWith(".geojson")) return "application/geo+json";
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".gpx")) return "application/gpx+xml";
        return "application/octet-stream";
    }

    @Override public Uri insert(Uri u, ContentValues v) { return null; }
    @Override public int delete(Uri u, String s, String[] a) { return 0; }
    @Override public int update(Uri u, ContentValues v, String s, String[] a) { return 0; }
}
