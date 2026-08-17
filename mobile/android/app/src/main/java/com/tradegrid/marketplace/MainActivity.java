package com.tradegrid.marketplace;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public MainActivity() {
        registerPlugin(ApkInstallerPlugin.class);
    }
}
