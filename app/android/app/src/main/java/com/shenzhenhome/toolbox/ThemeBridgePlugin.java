package com.shenzhenhome.toolbox;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ThemeBridge")
public class ThemeBridgePlugin extends Plugin {
    @PluginMethod
    public void setTheme(PluginCall call) {
        String theme = call.getString("theme", "system");
        if (!"dark".equals(theme) && !"light".equals(theme) && !"system".equals(theme)) {
            theme = "system";
        }
        final String selectedTheme = theme;
        getActivity().runOnUiThread(() -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).applyNativeTheme(selectedTheme);
            }
            call.resolve();
        });
    }
}
