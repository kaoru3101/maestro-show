"use client";

import React from "react";
import type { Draw, DrawSlot } from "@/types/api";
import MatchCard from "./MatchCard";
import BracketConnector from "./BracketConnector";
import { groupByRound } from "../_utils";
import { buildR1Maps } from "@/lib/drawSlotMaps";
import { DRAW_STATUS, CATEGORY_TYPE } from "@/lib/constants";

const SLOT_H = 160;
const CONNECTOR_W = 32;

export function Bracket({
  draw,
  onSlotClick,
  onOopClick,
  onEncounterClick,
}: {
  draw: Draw;
  onSlotClick: (slot: DrawSlot, partner?: DrawSlot) => void;
  onOopClick: (round: number, slots: DrawSlot[]) => void;
  onEncounterClick?: (encounterId: string) => void;
}) {
  const slots = draw.slots ?? [];
  const rounds = groupByRound(slots, draw.totalRounds);
  const R1_PAIRS = Math.ceil(slots.filter((s) => s.round === 1).length / 2);
  const TOTAL_H = R1_PAIRS * SLOT_H;

  const { posMap: r1PosMap, seedMap: r1SeedMap } = buildR1Maps(slots);

  const roundPairs = rounds.map(({ slots }) => {
    const prs: { a: DrawSlot; b?: DrawSlot }[] = [];
    for (let i = 0; i < slots.length; i += 2) prs.push({ a: slots[i], b: slots[i + 1] });
    return prs;
  });

  return (
    <div className="flex flex-col min-w-max">
      <div className="flex items-end">
        {rounds.map(({ round, label }, roundIdx) => (
          <React.Fragment key={round}>
            <div className="w-[260px] flex-shrink-0 text-[11px] text-fg-mute pb-2 tracking-wider uppercase text-center">
              {label}
            </div>
            {roundIdx < rounds.length - 1 && <div style={{ width: CONNECTOR_W }} className="flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-start">
        {rounds.map(({ round, label }, roundIdx) => {
          const prs = roundPairs[roundIdx];
          const cellH = TOTAL_H / prs.length;
          return (
            <React.Fragment key={round}>
              <div className="flex flex-col items-center flex-shrink-0 w-[260px]">
                <div
                  className="w-full"
                  style={{ display: "grid", gridTemplateRows: `repeat(${prs.length}, ${cellH}px)`, height: TOTAL_H }}
                >
                  {prs.map(({ a, b }, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center" }}>
                      <MatchCard
                        slotA={a}
                        slotB={b}
                        matchNumber={i + 1}
                        roundLabel={label}
                        isDraft={draw.status === DRAW_STATUS.DRAFT && round === 1}
                        onSlotClick={draw.status === DRAW_STATUS.DRAFT && round === 1 ? (slot, partner) => onSlotClick(slot, partner) : undefined}
                        onEncounterClick={(draw.status === DRAW_STATUS.PUBLISHED || draw.categoryType === CATEGORY_TYPE.TEAM_BATTLE) ? onEncounterClick : undefined}
                        isTeamBattle={draw.categoryType === CATEGORY_TYPE.TEAM_BATTLE}
                        encounters={draw.encounters}
                        r1PosMap={r1PosMap}
                        r1SeedMap={r1SeedMap}
                      />
                    </div>
                  ))}
                </div>
                {draw.categoryType !== CATEGORY_TYPE.TEAM_BATTLE && (
                  <button
                    onClick={() => onOopClick(round, slots.filter((s) => s.round === round))}
                    disabled={draw.status !== DRAW_STATUS.PUBLISHED}
                    className={`mt-2 w-full text-center text-xs border rounded-lg py-1.5 transition-colors ${
                      draw.status === DRAW_STATUS.PUBLISHED
                        ? "border-white/[0.12] bg-bg-card text-fg-mute hover:bg-bg-elevated cursor-pointer"
                        : "border-white/[0.15] bg-bg text-fg-mute cursor-not-allowed"
                    }`}
                  >
                    {label}の試合をOOPに一括追加 ↗
                  </button>
                )}
              </div>
              {roundIdx < rounds.length - 1 && (
                <BracketConnector sourceCount={prs.length} totalHeight={TOTAL_H} connectorWidth={CONNECTOR_W} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
