package run.halo.editor;

import java.util.Set;

public record HybridEditBlockSetting(String defaultMode) {

    public static final String GROUP = "base";

    public static final String DEFAULT_MODE = "all";

    private static final Set<String> SUPPORTED_MODES = Set.of(DEFAULT_MODE, "edit", "preview");

    public HybridEditBlockSetting {
        if (defaultMode == null || !SUPPORTED_MODES.contains(defaultMode)) {
            defaultMode = DEFAULT_MODE;
        }
    }

    public static HybridEditBlockSetting defaults() {
        return new HybridEditBlockSetting(DEFAULT_MODE);
    }
}
