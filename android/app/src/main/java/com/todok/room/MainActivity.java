package com.todok.room;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TypingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
