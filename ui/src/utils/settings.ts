import { consoleApiClient } from "@halo-dev/api-client";

export interface HybridEditBlockSetting {
  defaultMode: "all" | "edit" | "preview";
}

export async function fetchSettings(): Promise<HybridEditBlockSetting> {
  const { data } = await consoleApiClient.plugin.plugin.fetchPluginJsonConfig({
    name: "hybrid-edit-block",
  });

  const configMapData = data as Record<string, any>;

  return {
    defaultMode: configMapData?.base?.defaultMode || "all",
  };
}
