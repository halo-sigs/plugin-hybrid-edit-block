import { axiosInstance } from "@halo-dev/api-client";

export interface HybridEditBlockSetting {
  defaultMode: "all" | "edit" | "preview";
}

export const DEFAULT_HYBRID_EDIT_BLOCK_SETTING: HybridEditBlockSetting = {
  defaultMode: "all",
};

export function normalizeSettings(value: unknown): HybridEditBlockSetting {
  if (
    typeof value === "object" &&
    value !== null &&
    "defaultMode" in value &&
    (value.defaultMode === "edit" || value.defaultMode === "preview")
  ) {
    return { defaultMode: value.defaultMode };
  }

  return DEFAULT_HYBRID_EDIT_BLOCK_SETTING;
}

type SettingsRequest = () => Promise<unknown>;

export function createSettingsFetcher(request: SettingsRequest) {
  let settingsPromise: Promise<HybridEditBlockSetting> | undefined;

  return () => {
    if (!settingsPromise) {
      settingsPromise = request()
        .then(normalizeSettings)
        .catch((error) => {
          console.error("Failed to fetch hybrid edit block settings", error);
          return DEFAULT_HYBRID_EDIT_BLOCK_SETTING;
        });
    }

    return settingsPromise;
  };
}

export const fetchSettings = createSettingsFetcher(async () => {
  const { data } = await axiosInstance.get(
    "/apis/api.hybrid-edit-block.halo.run/v1alpha1/config"
  );
  return data;
});
