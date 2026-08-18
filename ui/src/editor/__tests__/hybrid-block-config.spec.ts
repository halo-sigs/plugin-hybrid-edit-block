import { describe, expect, it } from "vitest";
import {
  HTML_EDITED_BUBBLE_MENU_KEY,
  HYBRID_EDIT_BLOCK_NODE_CONFIG,
  MARKDOWN_EDITED_BUBBLE_MENU_KEY,
} from "../hybrid-block-config";

describe("hybrid block Halo 2.26 contracts", () => {
  it("declares structural and range-selection semantics", () => {
    expect(HYBRID_EDIT_BLOCK_NODE_CONFIG).toEqual({
      code: true,
      createGapCursor: true,
      fakeSelection: true,
    });
  });

  it("uses a unique bubble menu plugin key per block type", () => {
    expect(HTML_EDITED_BUBBLE_MENU_KEY).not.toBe(
      MARKDOWN_EDITED_BUBBLE_MENU_KEY
    );
  });
});
