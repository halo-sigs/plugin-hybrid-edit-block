package run.halo.editor;

import org.springframework.stereotype.Component;

import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;

@Component
public class HybridEditBlockPlugin extends BasePlugin {

    public HybridEditBlockPlugin(PluginContext context) {
        super(context);
    }
}
