import { describe, expect, it } from "vitest";
import { sanitizeFileName, uniqueFileNames } from "./file-name";

describe("sanitizeFileName", () => {
  it("thay ký tự cấm bằng dấu gạch dưới", () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe(
      "a_b_c_d_e_f_g_h_i_j",
    );
  });

  it("tên rỗng thì dùng deck", () => {
    expect(sanitizeFileName("   ")).toBe("deck");
  });

  it("cắt tên dài tối đa 60 ký tự", () => {
    expect(sanitizeFileName("a".repeat(80))).toHaveLength(60);
  });
});

describe("uniqueFileNames", () => {
  it("thêm số thứ tự cho tên trùng", () => {
    expect(uniqueFileNames(["deck", "deck", "deck"])).toEqual([
      "deck",
      "deck (2)",
      "deck (3)",
    ]);
  });
});
