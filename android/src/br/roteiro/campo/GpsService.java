package br.roteiro.campo;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Grava a rota percorrida com a tela apagada e sem internet: serviço em primeiro plano com notificação.
 * Cada posição vira uma linha em gps.csv (lat,lon,horário em ms,precisão,velocidade); o app lê esse arquivo.
 */
public class GpsService extends Service implements LocationListener {
    static volatile boolean ativo;
    static final String CANAL = "gravacao";
    LocationManager lm;
    PowerManager.WakeLock trava;

    static File arquivo(Context c) { return new File(c.getFilesDir(), "gps.csv"); }

    @Override
    public int onStartCommand(Intent i, int flags, int id) {
        if (i != null && i.getBooleanExtra("novo", false)) arquivo(this).delete();
        Notification n = notificacao();
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(7, n, 8); else startForeground(7, n);
        } catch (Throwable t) {
            try { startForeground(7, n); } catch (Throwable t2) { stopSelf(); return START_NOT_STICKY; }
        }
        if (lm == null) {
            lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            try {
                lm.requestLocationUpdates("gps", 2000L, 5f, this, Looper.getMainLooper());
            } catch (SecurityException e) {
                stopSelf();
                return START_NOT_STICKY;
            } catch (Throwable t) { }
        }
        if (trava == null) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                trava = pm.newWakeLock(1, "roteiro:gps");
                trava.acquire(14L * 3600 * 1000);
            } catch (Throwable t) { }
        }
        ativo = true;
        return START_STICKY;
    }

    Notification notificacao() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            try { nm.createNotificationChannel(new NotificationChannel(CANAL, "Gravação da rota", 2)); } catch (Throwable t) { }
            b = new Notification.Builder(this, CANAL);
        } else {
            b = new Notification.Builder(this);
        }
        Intent abrir = new Intent(this, MainActivity.class);
        abrir.addFlags(0x20000000);
        PendingIntent pi = PendingIntent.getActivity(this, 0, abrir, 0x04000000 | 0x08000000);
        b.setContentTitle("Gravando a rota")
         .setContentText("O Roteiro de Campo está registrando o caminho, mesmo com a tela apagada.")
         .setSmallIcon(getApplicationInfo().icon)
         .setOngoing(true)
         .setContentIntent(pi);
        return b.build();
    }

    @Override
    public void onLocationChanged(Location l) {
        if (l == null) return;
        String linha = l.getLatitude() + "," + l.getLongitude() + "," + l.getTime() + "," + Math.round(l.getAccuracy()) + "," + (l.hasSpeed() ? l.getSpeed() : -1) + "\n";
        try {
            FileOutputStream o = new FileOutputStream(arquivo(this), true);
            o.write(linha.getBytes("UTF-8"));
            o.close();
        } catch (Exception e) { }
    }

    @Override public void onStatusChanged(String p, int s, Bundle b) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }

    @Override
    public void onDestroy() {
        ativo = false;
        try { if (lm != null) lm.removeUpdates(this); } catch (Throwable t) { }
        try { if (trava != null && trava.isHeld()) trava.release(); } catch (Throwable t) { }
        try { stopForeground(true); } catch (Throwable t) { }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent i) { return null; }
}
