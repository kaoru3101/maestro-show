import { computeRoundLabel, groupByRound } from "@/app/tournaments/[id]/draw/_utils";
import type { DrawSlot } from "@/types/api";

const makeSlot = (round: number, position: number): DrawSlot =>
  ({
    id: `slot-r${round}-p${position}`,
    drawId: "draw-1",
    round,
    position,
    playerId: null,
    playerName: null,
    playerTeamName: null,
    pairId: null,
    pairPlayerAName: null,
    pairPlayerBName: null,
    seedNumber: null,
    isBye: false,
    matchId: null,
    matchStatus: null,
    matchResultType: null,
  } as DrawSlot);

describe("computeRoundLabel", () => {
  test("最終ラウンドは「決勝」", () => {
    expect(computeRoundLabel(3, 3)).toBe("決勝");
    expect(computeRoundLabel(4, 4)).toBe("決勝");
  });

  test("最終-1ラウンドは「準決勝」", () => {
    expect(computeRoundLabel(2, 3)).toBe("準決勝");
    expect(computeRoundLabel(3, 4)).toBe("準決勝");
  });

  test("最終-2ラウンドは「準々決勝」", () => {
    expect(computeRoundLabel(1, 3)).toBe("準々決勝");
    expect(computeRoundLabel(2, 4)).toBe("準々決勝");
  });

  test("それ以外は「N回戦」", () => {
    expect(computeRoundLabel(1, 4)).toBe("1回戦");
    expect(computeRoundLabel(2, 5)).toBe("2回戦");
  });
});

describe("groupByRound", () => {
  test("ラウンドごとにスロットをグループ化する", () => {
    const slots = [
      makeSlot(1, 1),
      makeSlot(1, 2),
      makeSlot(2, 1),
    ];
    const result = groupByRound(slots, 2);
    expect(result).toHaveLength(2);
    expect(result[0].round).toBe(1);
    expect(result[0].slots).toHaveLength(2);
    expect(result[1].round).toBe(2);
    expect(result[1].slots).toHaveLength(1);
  });

  test("各ラウンドのスロットはpositionで昇順ソートされる", () => {
    const slots = [
      makeSlot(1, 3),
      makeSlot(1, 1),
      makeSlot(1, 2),
    ];
    const result = groupByRound(slots, 1);
    const positions = result[0].slots.map((s) => s.position);
    expect(positions).toEqual([1, 2, 3]);
  });

  test("ラベルが正しく付与される", () => {
    const slots = [makeSlot(1, 1), makeSlot(2, 1), makeSlot(3, 1)];
    const result = groupByRound(slots, 3);
    expect(result[2].label).toBe("決勝");
    expect(result[1].label).toBe("準決勝");
    expect(result[0].label).toBe("準々決勝");
  });

  test("スロットが存在しないラウンドも含まれる", () => {
    const slots = [makeSlot(1, 1)];
    const result = groupByRound(slots, 3);
    expect(result).toHaveLength(3);
    expect(result[1].slots).toHaveLength(0);
    expect(result[2].slots).toHaveLength(0);
  });
});
