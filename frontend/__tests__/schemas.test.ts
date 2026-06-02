import { matchStatusSchema, createDrawSchema } from "@/lib/schemas";

describe("matchStatusSchema", () => {
  const base = {
    status: "pending",
    resultType: "normal",
    sets: [],
    suspensionReason: null,
    suspensionNote: "",
    manualWinner: null,
  };

  test("正常な値でパースできる", () => {
    expect(matchStatusSchema.safeParse(base).success).toBe(true);
  });

  test("suspensionNote が101文字以上でエラー", () => {
    const result = matchStatusSchema.safeParse({ ...base, suspensionNote: "a".repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("suspensionNote");
    }
  });

  test("suspensionNote が100文字でOK", () => {
    expect(matchStatusSchema.safeParse({ ...base, suspensionNote: "a".repeat(100) }).success).toBe(true);
  });

  test("sets にオブジェクトの配列が入る", () => {
    const result = matchStatusSchema.safeParse({
      ...base,
      sets: [{ sideA: "6", sideB: "4", tiebreak: "" }],
    });
    expect(result.success).toBe(true);
  });

  test("suspensionReason と manualWinner は null を許容する", () => {
    expect(
      matchStatusSchema.safeParse({ ...base, suspensionReason: null, manualWinner: null }).success
    ).toBe(true);
  });

  test("suspensionReason と manualWinner に文字列も入る", () => {
    expect(
      matchStatusSchema.safeParse({ ...base, suspensionReason: "rain", manualWinner: "side_a" }).success
    ).toBe(true);
  });
});

describe("createDrawSchema", () => {
  const base = {
    categoryId: "cat-1",
    format: "single_elimination",
    name: "main",
    customName: "",
    playerIds: [],
    pairIds: [],
    teamIds: [],
    seeds: {},
  };

  test("正常な値でパースできる", () => {
    expect(createDrawSchema.safeParse(base).success).toBe(true);
  });

  test("customName が51文字以上でエラー", () => {
    const result = createDrawSchema.safeParse({ ...base, customName: "a".repeat(51) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("customName");
    }
  });

  test("customName が50文字でOK", () => {
    expect(createDrawSchema.safeParse({ ...base, customName: "a".repeat(50) }).success).toBe(true);
  });

  test("seeds は Record<string, number>", () => {
    const result = createDrawSchema.safeParse({
      ...base,
      playerIds: ["p1", "p2"],
      seeds: { "p1": 1, "p2": 2 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seeds).toEqual({ p1: 1, p2: 2 });
    }
  });

  test("playerIds / pairIds / teamIds は配列", () => {
    const result = createDrawSchema.safeParse({
      ...base,
      playerIds: ["a", "b"],
      pairIds: ["c"],
      teamIds: ["d", "e", "f"],
    });
    expect(result.success).toBe(true);
  });
});
