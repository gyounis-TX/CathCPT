package com.lumeninnovations.cathcpt;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // targetSdk 36 forces edge-to-edge with no opt-out, and Capacitor 6's WebView
    // does not surface system-bar insets to CSS env(safe-area-inset-*) on Android.
    // Pad the content root so the webview never sits under the status/nav bars.
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        View content = findViewById(android.R.id.content);
        // The padded strips expose this view, not the webview. Pin them to the app's
        // page background (src/index.css body) instead of inheriting the splash theme's.
        content.setBackgroundColor(Color.parseColor("#f3f4f6"));
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return windowInsets;
        });
    }
}
