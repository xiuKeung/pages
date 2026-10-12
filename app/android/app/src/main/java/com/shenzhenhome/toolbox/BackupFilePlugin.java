package com.shenzhenhome.toolbox;

import android.app.Activity;
import android.content.Intent;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.io.InputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@CapacitorPlugin(name = "BackupFile")
public class BackupFilePlugin extends Plugin {
    private static final int BUFFER_SIZE = 64 * 1024;
    private static final long MAX_METADATA_BYTES = 8L * 1024L * 1024L;

    @PluginMethod
    public void save(PluginCall call) {
        String filename = call.getString("filename");
        String data = call.getString("data");
        if (filename == null || filename.isEmpty() || data == null || data.isEmpty()) {
            call.reject("缺少备份文件内容");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mimeType", "application/zip"));
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "saveResult");
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("已取消选择保存位置");
            return;
        }
        Uri uri = result.getData().getData();
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
            if (output == null) throw new IllegalStateException("无法写入所选位置");
            output.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
            output.flush();
            JSObject response = new JSObject();
            response.put("uri", uri.toString());
            call.resolve(response);
        } catch (Exception error) {
            call.reject("保存备份失败", error);
        }
    }

    @PluginMethod
    public void saveImages(PluginCall call) {
        JSArray images = call.getArray("images");
        if (images == null || images.length() == 0) {
            call.reject("没有可保存的图片");
            return;
        }
        try {
            for (int index = 0; index < images.length(); index++) {
                JSObject image = JSObject.fromJSONObject(images.getJSONObject(index));
                String filename = image.getString("filename");
                String data = image.getString("data");
                String mimeType = image.getString("mimeType", "image/jpeg");
                if (filename == null || filename.isEmpty() || data == null || data.isEmpty()) {
                    throw new IllegalArgumentException("图片内容不完整");
                }
                saveImage(filename, mimeType, data);
            }
            JSObject response = new JSObject();
            response.put("count", images.length());
            call.resolve(response);
        } catch (Exception error) {
            call.reject("保存图片失败", error);
        }
    }

    private void saveImage(String filename, String mimeType, String data) throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            throw new IllegalStateException("当前 Android 版本不支持直接保存图片");
        }
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
        values.put(MediaStore.Images.Media.MIME_TYPE, mimeType);
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/安家笔记");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);
        Uri uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new IllegalStateException("无法创建图片文件");
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
            if (output == null) throw new IllegalStateException("无法写入图片文件");
            output.write(Base64.decode(data, Base64.DEFAULT));
            output.flush();
        } catch (Exception error) {
            getContext().getContentResolver().delete(uri, null, null);
            throw error;
        }
        values.clear();
        values.put(MediaStore.Images.Media.IS_PENDING, 0);
        getContext().getContentResolver().update(uri, values, null, null);
    }

    /**
     * Large backup archives must not cross the Capacitor bridge as Base64: a
     * 176 MB ZIP becomes more than 230 MB before JSZip starts unpacking it.
     * Keep the archive in the native cache and only return its small metadata.
     */
    @PluginMethod
    public void chooseBackup(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/zip");
        startActivityForResult(call, intent, "chooseBackupResult");
    }

    @ActivityCallback
    private void chooseBackupResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("已取消选择备份文件");
            return;
        }
        String sessionId = UUID.randomUUID().toString();
        File archive = sessionFile(sessionId);
        try (InputStream input = getContext().getContentResolver().openInputStream(result.getData().getData())) {
            if (input == null) throw new IllegalStateException("无法读取所选备份文件");
            copy(input, archive);
            try (ZipFile zip = new ZipFile(archive)) {
                JSObject response = new JSObject();
                response.put("sessionId", sessionId);
                response.put("manifest", readText(zip, "manifest.json"));
                response.put("data", readText(zip, "data/data.json"));
                call.resolve(response);
            }
        } catch (Exception error) {
            archive.delete();
            call.reject("读取备份文件失败", error);
        }
    }

    @PluginMethod
    public void extractBackupImage(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String originalArchivePath = call.getString("originalArchivePath");
        String thumbnailArchivePath = call.getString("thumbnailArchivePath");
        String originalPath = call.getString("originalPath");
        String thumbnailPath = call.getString("thumbnailPath");
        if (!validSession(sessionId) || !validImageArchivePath(originalArchivePath, ".original")
                || !validImageArchivePath(thumbnailArchivePath, ".thumb.jpg")
                || !validPrivatePath(originalPath) || !validPrivatePath(thumbnailPath)) {
            call.reject("备份图片路径不合法");
            return;
        }
        File archive = sessionFile(sessionId);
        File original = privateFile(originalPath);
        File thumbnail = privateFile(thumbnailPath);
        try (ZipFile zip = new ZipFile(archive)) {
            copyEntry(zip, originalArchivePath, original);
            copyEntry(zip, thumbnailArchivePath, thumbnail);
            call.resolve();
        } catch (Exception error) {
            original.delete();
            thumbnail.delete();
            call.reject("保存备份图片失败", error);
        }
    }

    @PluginMethod
    public void discardBackup(PluginCall call) {
        String sessionId = call.getString("sessionId");
        if (validSession(sessionId)) sessionFile(sessionId).delete();
        call.resolve();
    }

    private File importDirectory() {
        File directory = new File(getContext().getCacheDir(), "backup-imports");
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("无法创建备份缓存目录");
        return directory;
    }

    private File sessionFile(String sessionId) {
        return new File(importDirectory(), sessionId + ".zip");
    }

    private File privateFile(String path) {
        return new File(getContext().getFilesDir(), path);
    }

    private boolean validSession(String value) {
        return value != null && value.matches("[0-9a-fA-F-]{36}");
    }

    private boolean validImageArchivePath(String path, String suffix) {
        return path != null && path.startsWith("images/") && path.endsWith(suffix)
            && !path.contains("..") && !path.contains("\\") && !path.startsWith("/");
    }

    private boolean validPrivatePath(String path) {
        return path != null && path.startsWith("viewings/restored-") && !path.contains("..")
            && !path.contains("\\") && !path.startsWith("/");
    }

    private String readText(ZipFile zip, String path) throws Exception {
        ZipEntry entry = zip.getEntry(path);
        if (entry == null || entry.isDirectory() || entry.getSize() > MAX_METADATA_BYTES) {
            throw new IllegalArgumentException("备份缺少必要数据");
        }
        try (InputStream input = zip.getInputStream(entry)) {
            java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[BUFFER_SIZE];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
                if (output.size() > MAX_METADATA_BYTES) throw new IllegalArgumentException("备份元数据过大");
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private void copyEntry(ZipFile zip, String archivePath, File target) throws Exception {
        ZipEntry entry = zip.getEntry(archivePath);
        if (entry == null || entry.isDirectory()) throw new IllegalArgumentException("备份图片文件缺失");
        File parent = target.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IllegalStateException("无法创建图片目录");
        try (InputStream input = zip.getInputStream(entry); OutputStream output = new FileOutputStream(target, false)) {
            transfer(input, output);
        }
    }

    private void copy(InputStream input, File target) throws Exception {
        File parent = target.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IllegalStateException("无法创建缓存目录");
        try (OutputStream output = new FileOutputStream(target, false)) {
            transfer(input, output);
        }
    }

    private void transfer(InputStream input, OutputStream output) throws Exception {
        byte[] buffer = new byte[BUFFER_SIZE];
        int count;
        while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
        output.flush();
    }
}
