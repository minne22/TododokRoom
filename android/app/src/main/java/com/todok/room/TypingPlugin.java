package com.todok.room;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.provider.Settings;
import android.view.accessibility.AccessibilityManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Map;

/**
 * The page's side of {@link TypingService} (phone.js calls it "Typing"): whether it is switched on,
 * opening the settings screen to switch it on, live key events while the app is open, and the
 * per-day counts kept while it was closed.
 */
@CapacitorPlugin(name = "Typing")
public class TypingPlugin extends Plugin {

    private static final String PREFS = "typing";
    private static final String DAY_PREFIX = "day:";
    private static final Object lock = new Object();

    @Override
    public void load() {
        attach();
    }

    @Override
    protected void handleOnResume() {
        attach();
    }

    @Override
    protected void handleOnPause() {
        TypingService.listener = null;
    }

    private void attach() {
        TypingService.listener = () -> notifyListeners("keys", new JSObject());
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", isEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    /** Hands over the counts kept while the app was closed, as { days: { "YYYY-MM-DD": n } }, and forgets them. */
    @PluginMethod
    public void takePending(PluginCall call) {
        JSObject days = new JSObject();
        synchronized (lock) {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            for (Map.Entry<String, ?> e : prefs.getAll().entrySet()) {
                if (e.getKey().startsWith(DAY_PREFIX) && e.getValue() instanceof Integer) {
                    days.put(e.getKey().substring(DAY_PREFIX.length()), (int) (Integer) e.getValue());
                }
            }
            prefs.edit().clear().apply();
        }
        JSObject result = new JSObject();
        result.put("days", days);
        call.resolve(result);
    }

    static void addPending(Context context, int n) {
        String key = DAY_PREFIX + new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        synchronized (lock) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            prefs.edit().putInt(key, prefs.getInt(key, 0) + n).apply();
        }
    }

    private boolean isEnabled() {
        AccessibilityManager am = (AccessibilityManager) getContext().getSystemService(Context.ACCESSIBILITY_SERVICE);
        if (am == null) return false;
        for (AccessibilityServiceInfo info : am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)) {
            ServiceInfo s = info.getResolveInfo().serviceInfo;
            if (getContext().getPackageName().equals(s.packageName) && TypingService.class.getName().equals(s.name)) return true;
        }
        return false;
    }
}
