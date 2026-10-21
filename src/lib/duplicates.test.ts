import { describe, expect, it } from "vitest";
import { findDuplicates, normalizeKey } from "./duplicates";

describe("normalizeKey", () => {
  it("bỏ khoảng trắng đầu cuối và chuyển về chữ thường", () => {
    expect(normalizeKey("  N1  ")).toBe("n1");
  });
});

describe("findDuplicates", () => {
  it("trả về mảng rỗng khi không có phần tử trùng", () => {
    expect(findDuplicates(["a", "b", "c"], (value) => value)).toEqual([]);
  });

  it("phát hiện trùng khi khác hoa thường và khoảng trắng", () => {
    expect(findDuplicates([" N1 ", "n1", "N2"], (value) => value)).toEqual([
      { key: "n1", items: [" N1 ", "n1"] },
    ]);
  });

  it("trả về nhiều nhóm trùng", () => {
    const groups = findDuplicates(["a", "A", "b", "B", "c"], (value) => value);
    expect(groups.map((group) => group.key)).toEqual(["a", "b"]);
    expect(groups.map((group) => group.items.length)).toEqual([2, 2]);
  });
});
