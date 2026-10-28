package com.shenzhenhome.toolbox;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Opens the user's preferred installed map app without embedding a map SDK. */
@CapacitorPlugin(name = "MapLauncher")
public class MapLauncherPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String query = call.getString("query", "").trim();
        if (query.isEmpty()) {
            call.reject("缺少地点名称");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW,
                    Uri.parse("geo:0,0?q=" + Uri.encode(query)));
                getActivity().startActivity(Intent.createChooser(intent, "选择地图应用"));
                call.resolve();
            } catch (Exception error) {
                call.reject("无法打开地图应用", error);
            }
        });
    }
}
