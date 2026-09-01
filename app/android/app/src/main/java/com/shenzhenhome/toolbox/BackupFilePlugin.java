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

@CapacitorPlugin(name = "BackupFile")
public class BackupFilePlugin extends Plugin {
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
}
