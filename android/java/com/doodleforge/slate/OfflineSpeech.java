package com.doodleforge.slate;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import java.io.InputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.BiConsumer;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

final class OfflineSpeech {
    private static final int RATE = 16000, MAX_SAMPLES = RATE * 9;
    private static final String MODEL = "tiny.en-q5_1.bin";
    private static native String transcribe(String modelPath, short[] samples, int count);
    private static native void release();
    private final Context context;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile boolean stop, canceled;
    private boolean active;
    private boolean loaded;

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
        worker.execute(() -> { if (loaded) release(); });
        worker.shutdown();
    }

    private File modelFile() throws IOException {
        File model = new File(context.getFilesDir(), MODEL);
        if (model.isFile() && model.length() == 32166155) return model;
        File temporary = File.createTempFile("whisper", ".part", context.getFilesDir());
        try {
            try (InputStream input = context.getAssets().open(MODEL); FileOutputStream output = new FileOutputStream(temporary)) {
                byte[] buffer = new byte[64 * 1024];
                for (int n; (n = input.read(buffer)) != -1;) output.write(buffer, 0, n);
                output.getFD().sync();
            }
            if (temporary.length() != 32166155) throw new IOException("Incomplete bundled speech model");
            Files.move(temporary.toPath(), model.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } finally { temporary.delete(); }
        return model;
    }

    private String recognize() throws Exception {
        if (!loaded) { System.loadLibrary("slate_speech"); loaded = true; }
        if (stop) return "";
        final int min = AudioRecord.getMinBufferSize(RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        if (min <= 0) throw new IOException("Unsupported microphone format");
        final AudioRecord mic = new AudioRecord.Builder()
            .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            .setAudioFormat(new AudioFormat.Builder().setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(RATE).build())
            .setBufferSizeInBytes(Math.max(min, 8000)).build();
        final short[] samples = new short[MAX_SAMPLES];
        int count = 0;
        try {
            mic.startRecording();
            if (mic.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING)
                throw new IOException("Microphone did not start");
            while (!stop && count < MAX_SAMPLES) {
                int n = mic.read(samples, count, Math.min(1600, MAX_SAMPLES - count), AudioRecord.READ_BLOCKING);
                if (n < 0) throw new IOException("Microphone read failed");
                count += n;
            }
        } finally { mic.release(); }
        if (canceled || count < RATE / 6) return "";
        String text = transcribe(modelFile().getAbsolutePath(), samples, count);
        if (text == null) throw new IOException("Whisper could not transcribe this recording");
        text = text.trim();
        return text.matches("^(\\[.*?\\]|\\(.*?\\))$") ? "" : text;
    }
}
