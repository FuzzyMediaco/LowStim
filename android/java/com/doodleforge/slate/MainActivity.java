package com.doodleforge.slate;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.DataInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final String ASSET_ORIGIN = "https://slate.appassets.androidplatform.net";
    private static final int MICROPHONE = 13, MODEL_PICKER = 14;
    private static final long MAX_MODEL_BYTES = 3_000_000_000L;
    private static final ExecutorService MODEL_WORKER = Executors.newSingleThreadExecutor();
    private static final boolean NATIVE_AVAILABLE;
    static {
        boolean loaded;
        try {
            System.loadLibrary("forge");
            loaded = true;
        } catch (UnsatisfiedLinkError unavailable) {
            loaded = false;
        }
        NATIVE_AVAILABLE = loaded;
    }
    private static native String generate(String path, String prompt, String grammar);
    private static native void resetModel();

    private WebView web;
    private File model;
    private OfflineSpeech speech;
    private TextToSpeech tts;
    private boolean ttsReady;
    private boolean choosing, destroyed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setDecorFitsSystemWindows(true);
        final WindowInsetsController controller = getWindow().getInsetsController();
        if (controller != null) {
            controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsets.Type.systemBars());
        }
        model = new File(getFilesDir(), "planner.gguf");
        speech = new OfflineSpeech(this);
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.addJavascriptInterface(new DeviceBridge(), "SlateDevice");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                final Uri uri = request.getUrl();
                final String path = uri.getPath();
                if (!"https".equals(uri.getScheme()) || !"slate.appassets.androidplatform.net".equals(uri.getHost())
                        || path == null || !path.matches("/[a-z0-9-]+\\.(html|js|json|webmanifest|png)"))
                    return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
                try {
                    final String mime = path.endsWith(".html") ? "text/html" :
                            path.endsWith(".js") ? "text/javascript" :
                            path.endsWith(".png") ? "image/png" : "application/json";
                    return new WebResourceResponse(mime, path.endsWith(".png") ? null : "UTF-8",
                            getAssets().open(path.substring(1)));
                } catch (IOException absent) {
                    return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
                }
            }
        });
        setContentView(web);
        web.loadUrl(ASSET_ORIGIN + "/index.html");
        tts = new TextToSpeech(this, result -> runOnUiThread(() -> {
            if (destroyed || result != TextToSpeech.SUCCESS || tts == null || tts.getVoices() == null) return;
            tts.getVoices().stream()
                .filter(voice -> !voice.isNetworkConnectionRequired() && voice.getLocale().getLanguage().equals("en")
                    && (voice.getFeatures() == null || !voice.getFeatures().contains("notInstalled")))
                .findFirst().ifPresent(voice -> ttsReady = tts.setVoice(voice) == TextToSpeech.SUCCESS);
        }));
    }

    private void script(String code) {
        runOnUiThread(() -> { if (!destroyed && web != null) web.evaluateJavascript(code, null); });
    }

    private void voiceResult(String text, String error) {
        script("window.slateVoiceResult?.(" + JSONObject.quote(text) + "," + JSONObject.quote(error) + ")");
    }

    private void modelResult(String text) {
        script("window.slateModelResult?.(" + JSONObject.quote(text) + "," + model.isFile() + ")");
    }

    public final class DeviceBridge {
        @JavascriptInterface public boolean hasModel() { return NATIVE_AVAILABLE && model.isFile(); }
        @JavascriptInterface public void plan(int id, String prompt, String grammar) {
            if (!hasModel() || prompt.length() > 6400 || grammar.length() > 6000) {
                script("window.slatePlanResult?.(" + id + ",'')");
                return;
            }
            MODEL_WORKER.execute(() -> {
                String output = generate(model.getAbsolutePath(), prompt, grammar);
                script("window.slatePlanResult?.(" + id + "," + JSONObject.quote(output) + ")");
            });
        }
        @JavascriptInterface public void importModel() {
            runOnUiThread(() -> {
                if (choosing || destroyed) return;
                if (!NATIVE_AVAILABLE) { modelResult("This phone could not load the ARM64 model engine."); return; }
                choosing = true;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try { startActivityForResult(picker, MODEL_PICKER); }
                catch (RuntimeException failure) { choosing = false; modelResult("File picker is unavailable."); }
            });
        }
        @JavascriptInterface public void listen() { runOnUiThread(() -> beginVoice()); }
        @JavascriptInterface public void stopVoice() {
            runOnUiThread(() -> speech.stop());
        }
        @JavascriptInterface public void say(String line) {
            runOnUiThread(() -> {
                if (!destroyed && ttsReady) tts.speak(line, TextToSpeech.QUEUE_FLUSH, null, "forge-avatar");
            });
        }
    }

    private void beginVoice() {
        if (destroyed) return;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE);
            return;
        }
        speech.start(this::voiceResult);
    }

    @Override public void onRequestPermissionsResult(int code, String[] names, int[] results) {
        super.onRequestPermissionsResult(code, names, results);
        if (code != MICROPHONE) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) beginVoice();
        else voiceResult("", "Microphone permission is needed to speak. You can still draw or type.");
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != MODEL_PICKER) return;
        choosing = false;
        if (result != RESULT_OK || data == null || data.getData() == null) {
            modelResult("Model import canceled.");
            return;
        }
        final Uri source = data.getData();
        script("document.querySelector('#model').disabled=true;document.querySelector('#modelInfo').textContent='Copying the model to this phone…';");
        MODEL_WORKER.execute(() -> copyModel(source));
    }

    private void copyModel(Uri source) {
        final File temporary = new File(getFilesDir(), "planner-import.gguf");
        try {
            try (InputStream in = getContentResolver().openInputStream(source);
                 FileOutputStream out = new FileOutputStream(temporary)) {
                if (in == null) throw new IOException("Missing file");
                byte[] header = new byte[4];
                new DataInputStream(in).readFully(header);
                if (header[0] != 'G' || header[1] != 'G' || header[2] != 'U' || header[3] != 'F')
                    throw new IOException("Expected a GGUF model");
                out.write(header);
                byte[] buffer = new byte[1024 * 1024];
                long total = 4;
                for (int count; (count = in.read(buffer)) != -1;) {
                    total += count;
                    if (total > MAX_MODEL_BYTES) throw new IOException("Model exceeds the 3 GB import limit");
                    out.write(buffer, 0, count);
                }
                if (total < 1_000_000) throw new IOException("Model file is incomplete");
                out.getFD().sync();
            }
            java.nio.file.Files.move(temporary.toPath(), model.toPath(),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
            resetModel();
            modelResult("Model imported. Qwen loads the first time you make a scene.");
        } catch (IOException | SecurityException error) {
            temporary.delete();
            modelResult("Import failed. Choose a complete GGUF below 3 GB and check free storage.");
        }
    }

    @Override protected void onStop() {
        super.onStop();
        if (speech != null) speech.cancel();
        script("if(document.querySelector('#mic').textContent==='Stop')window.slateVoiceResult?.('','Listening stopped.');");
    }

    @Override protected void onDestroy() {
        destroyed = true;
        if (speech != null) speech.close();
        if (tts != null) tts.shutdown();
        if (web != null) {
            web.removeJavascriptInterface("SlateDevice");
            web.destroy();
        }
        super.onDestroy();
    }
}
