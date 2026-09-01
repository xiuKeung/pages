package com.shenzhenhome.toolbox;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BackupFilePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            String currentUrl = getBridge().getWebView().getUrl();
            boolean isEntrance = currentUrl != null && currentUrl.contains("/entrance/");
            if (!isEntrance) {
                if (getBridge().getWebView().canGoBack()) {
                    getBridge().getWebView().goBack();
                } else {
                    getBridge().getWebView().evaluateJavascript(
                        "window.location.href = '/entrance/index.html';",
                        null
                    );
                }
                return;
            }
        }
        super.onBackPressed();
    }
}
