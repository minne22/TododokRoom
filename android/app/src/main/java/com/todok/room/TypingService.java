package com.todok.room;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;

/**
 * Counts typing in other apps, once the person switches it on under 접근성 in the phone's settings.
 * It only notes that some text changed (one change per key, near enough); what the text was is
 * never read, kept or sent. While the app is open each change goes straight to the page; while it
 * is closed the changes are kept as a count per day (see {@link TypingPlugin}).
 */
public class TypingService extends AccessibilityService {

    interface Listener {
        void onKey();
    }

    /** Set while the app is in front. */
    static volatile Listener listener;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() != AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) return;
        // The app's own typing pad is counted by the page.
        CharSequence from = event.getPackageName();
        if (from != null && getPackageName().contentEquals(from)) return;

        Listener l = listener;
        if (l != null) l.onKey();
        else TypingPlugin.addPending(this, 1);
    }

    @Override
    public void onInterrupt() {}
}
