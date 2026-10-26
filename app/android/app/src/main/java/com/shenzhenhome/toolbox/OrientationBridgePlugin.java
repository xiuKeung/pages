package com.shenzhenhome.toolbox;

import android.content.pm.ActivityInfo;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Lets the comparison page switch orientation only after an explicit user tap. */
@CapacitorPlugin(name = "OrientationBridge")
public class OrientationBridgePlugin extends Plugin {
    @PluginMethod
    public void setOrientation(PluginCall call) {
        String orientation = call.getString("orientation", "portrait");
        final int requested = "landscape".equals(orientation)
            ? ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
        getActivity().runOnUiThread(() -> {
            getActivity().setRequestedOrientation(requested);
            call.resolve();
        });
    }
}
