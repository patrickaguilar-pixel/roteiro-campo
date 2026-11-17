package android.net; public abstract class Uri implements android.os.Parcelable, Comparable<Uri> {
 public static Uri parse(String s){ return null; } public static String encode(String s){ return null; }
 public abstract String getHost(); public abstract String getPath(); public abstract String getScheme();
 public String getQueryParameter(String k){ return null; }
 public abstract java.util.List<String> getPathSegments(); public abstract String getLastPathSegment();
 public int compareTo(Uri o){ return 0; } }
