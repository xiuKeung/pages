package com.shenzhenhome.toolbox;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Compass")
public class CompassPlugin extends Plugin implements SensorEventListener {
    private SensorManager manager;
    private volatile Float heading;
    private volatile int accuracy = SensorManager.SENSOR_STATUS_UNRELIABLE;
    @PluginMethod public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopSensor();
            manager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
            Sensor sensor = manager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
            if (sensor == null || !manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI)) {
                call.reject("此手机无法提供罗盘数据，请手动选择"); return;
            }
            heading = null;
            call.resolve();
        });
    }
    @PluginMethod public void read(PluginCall call) {
        JSObject result = new JSObject();
        result.put("heading", heading);
        result.put("reliable", accuracy >= SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM);
        call.resolve(result);
    }
    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { stopSensor(); call.resolve(); });
    }
    private void stopSensor() { if (manager != null) manager.unregisterListener(this); heading = null; }
    @Override protected void handleOnPause() { stopSensor(); }
    @Override protected void handleOnDestroy() { stopSensor(); }
    @Override public void onAccuracyChanged(Sensor sensor, int value) { accuracy = value; }
    @Override public void onSensorChanged(SensorEvent event) {
        float[] matrix = new float[9], angles = new float[3];
        SensorManager.getRotationMatrixFromVector(matrix, event.values);
        SensorManager.getOrientation(matrix, angles);
        heading = (float) ((Math.toDegrees(angles[0]) + 360) % 360);
        accuracy = event.accuracy;
    }
}
