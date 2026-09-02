package com.shenzhenhome.toolbox;

import android.os.Build;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String WEB_ASSET_VERSION_KEY = "web_asset_version";
    private final OnBackInvokedCallback predictiveBackCallback = this::handleAppBack;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(BackupFilePlugin.class);
        registerPlugin(ThemeBridgePlugin.class);
        super.onCreate(savedInstanceState);
        applyNativeTheme(readNativeTheme());
        refreshWebAssetsAfterUpgrade();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                predictiveBackCallback
            );
        } else {
            getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    handleAppBack();
                }
            });
        }
    }

    private String readNativeTheme() {
        return getSharedPreferences("anjia_app", MODE_PRIVATE)
            .getString("theme_preference", "system");
    }

    public void applyNativeTheme(String theme) {
        String selected = "dark".equals(theme) || "light".equals(theme) ? theme : "system";
        getSharedPreferences("anjia_app", MODE_PRIVATE)
            .edit().putString("theme_preference", selected).apply();
        boolean isSystemDark = (getResources().getConfiguration().uiMode
            & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        boolean isDark = "dark".equals(selected) || ("system".equals(selected) && isSystemDark);
        int background = Color.rgb(isDark ? 16 : 245, isDark ? 24 : 248, isDark ? 40 : 252);
        getWindow().getDecorView().setBackgroundColor(background);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(background);
        }
    }

    /**
     * Capacitor's WebView can retain an older service-worker CacheStorage across
     * an APK upgrade. Clear only web caches once per native version; localStorage,
     * IndexedDB images, and native SQLite records are intentionally untouched.
     */
    private void refreshWebAssetsAfterUpgrade() {
        SharedPreferences preferences = getSharedPreferences("anjia_app", MODE_PRIVATE);
        int currentVersion;
        try {
            currentVersion = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
        } catch (android.content.pm.PackageManager.NameNotFoundException exception) {
            return;
        }
        if (preferences.getInt(WEB_ASSET_VERSION_KEY, -1) == currentVersion) return;

        if (getBridge() == null || getBridge().getWebView() == null) return;
        preferences.edit().putInt(WEB_ASSET_VERSION_KEY, currentVersion).apply();
        getBridge().getWebView().clearCache(true);
        getBridge().getWebView().evaluateJavascript(
            "(async()=>{try{"
                + "if('caches' in window){const keys=await caches.keys();await Promise.all(keys.map(key=>caches.delete(key)));}"
                + "if('serviceWorker' in navigator){const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.map(registration=>registration.unregister()));}"
                + "}catch(_){ }finally{window.location.reload();}})();",
            null
        );
    }

    @Override
    public void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(predictiveBackCallback);
        }
        super.onDestroy();
    }

    private void handleAppBack() {
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
        moveTaskToBack(true);
    }
}
