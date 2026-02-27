import axios from "axios";

export interface HybridEditBlockSetting {
  defaultMode: "all" | "edit" | "preview";
}

export async function fetchSettings(): Promise<HybridEditBlockSetting> {
  const { data } = await axios.get(
    "/apis/api.hybrid-edit-block.halo.run/v1alpha1/config"
  );

  return {
    defaultMode: data?.defaultMode || "all",
  };
}
