package com.doodleforge.slate;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.BiConsumer;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

final class OfflineSpeech {
    private static final int RATE = 16000, MAX_SAMPLES = RATE * 9;
    private static final String MODEL = "vosk-model-small-en-us-0.15";
    private final Context context;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile boolean stop, canceled;
    private boolean active;
    private Model model;

    OfflineSpeech(Context context) { this.context = context.getApplicationContext(); }

    synchronized void start(BiConsumer<String, String> result) {
        if (active) return;
        stop = false;
        canceled = false;
        active = true;
        worker.execute(() -> {
            try {
                String text = recognize();
                if (!canceled) result.accept(text, "");
            } catch (Exception | LinkageError failure) {
                if (!canceled) result.accept("", "Offline speech could not start. Check microphone access or try typing.");
            } finally {
                synchronized (this) { active = false; }
            }
        });
    }

    void stop() { stop = true; }
    void cancel() { canceled = true; stop(); }

    void close() {
        cancel();
        worker.execute(() -> { if (model != null) model.close(); });
        worker.shutdown();
    }

    private File modelDirectory() throws IOException {
        final File root = new File(context.getFilesDir(), MODEL);
        final File ready = new File(root, ".ready");
        if (ready.isFile()) return root;
        if (!root.mkdirs() && !root.isDirectory()) throw new IOException("Missing model directory");
        try (ZipInputStream archive = new ZipInputStream(context.getAssets().open("speech-model.zip"))) {
            for (ZipEntry entry; (entry = archive.getNextEntry()) != null;) {
                String name = entry.getName();
                if (!name.startsWith(MODEL + "/") || entry.isDirectory()) continue;
                final File file = new File(root, name.substring(MODEL.length() + 1));
                if (!file.getCanonicalPath().startsWith(root.getCanonicalPath() + File.separator))
                    throw new IOException("Invalid model asset");
                final File parent = file.getParentFile();
                if (!parent.mkdirs() && !parent.isDirectory()) throw new IOException("Missing model subfolder");
                try (FileOutputStream output = new FileOutputStream(file)) {
                    byte[] bytes = new byte[32 * 1024];
                    for (int n; (n = archive.read(bytes)) != -1;) output.write(bytes, 0, n);
                }
                archive.closeEntry();
            }
        }
        if (!ready.createNewFile()) throw new IOException("Could not initialize speech assets");
        return root;
    }

    private String recognize() throws Exception {
        if (model == null) model = new Model(modelDirectory().getAbsolutePath());
        if (stop) return "";
        final int min = AudioRecord.getMinBufferSize(RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        if (min <= 0) throw new IOException("Unsupported microphone format");
        final AudioRecord mic = new AudioRecord.Builder()
            .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            .setAudioFormat(new AudioFormat.Builder().setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(RATE).build())
            .setBufferSizeInBytes(Math.max(min, 8000)).build();
        try (Recognizer recognizer = new Recognizer(model, RATE)) {
            mic.startRecording();
            if (mic.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING)
                throw new IOException("Microphone did not start");
            final short[] buffer = new short[1600];
            for (int samples = 0; !stop && samples < MAX_SAMPLES;) {
                final int count = mic.read(buffer, 0, buffer.length, AudioRecord.READ_BLOCKING);
                if (count < 0) throw new IOException("Microphone read failed");
                samples += count;
                if (recognizer.acceptWaveForm(buffer, count)) {
                    final String phrase = new JSONObject(recognizer.getResult()).optString("text").trim();
                    if (!phrase.isEmpty()) return phrase;
                }
            }
            return new JSONObject(recognizer.getFinalResult()).optString("text").trim();
        } finally {
            mic.release();
        }
    }
}
