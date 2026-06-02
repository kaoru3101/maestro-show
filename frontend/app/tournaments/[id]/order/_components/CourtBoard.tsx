"use client";

import {
  DndContext,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Match } from "@/types/api";
import type { CourtWithMatches, MatchDrawInfo } from "../_utils";
import { useMatchDnd } from "../_hooks/useMatchDnd";
import { DroppableCourt } from "./DroppableCourt";
import { SortableMatch } from "./SortableMatch";

interface CourtBoardProps {
  tournamentId: string;
  courts: CourtWithMatches[];
  setCourts: React.Dispatch<React.SetStateAction<CourtWithMatches[]>>;
  fetchData: () => Promise<void>;
  matchDrawInfo: Record<string, MatchDrawInfo>;
  tournamentDate?: string;
  onOpenStatus: (match: Match) => void;
  onOpenScore: (match: Match) => void;
  onScheduleTime: (matchId: string, type: string | null, time: string | null) => void;
}

export function CourtBoard({
  tournamentId, courts, setCourts, fetchData,
  matchDrawInfo, tournamentDate, onOpenStatus, onOpenScore, onScheduleTime,
}: CourtBoardProps) {
  const { sensors, activeMatch, handleDragStart, handleDragEnd } = useMatchDnd({
    tournamentId,
    courts,
    setCourts,
    onRollback: fetchData,
  });

  if (courts.length === 0) {
    return <div className="text-center py-16 text-sm text-fg-mute">コートが登録されていません</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 gap-4">
        {courts.map((court) => (
          <div key={court.id} className="bg-bg-card border border-white/[0.12] rounded-[12px] px-[14px] py-[12px]">
            <h2 className="text-sm font-semibold text-fg mb-3">{court.name}</h2>
            <DroppableCourt courtId={court.id}>
              {court.matches.length === 0 ? (
                <p className="text-xs text-fg-mute py-4 text-center">試合なし</p>
              ) : (
                <SortableContext items={court.matches.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {court.matches.map((match) => (
                      <SortableMatch
                        key={match.id}
                        match={match}
                        onOpenStatus={onOpenStatus}
                        onOpenScore={onOpenScore}
                        onScheduleTime={onScheduleTime}
                        tournamentDate={tournamentDate}
                        drawName={matchDrawInfo[match.id]?.drawName}
                        drawPositions={matchDrawInfo[match.id]?.positions}
                        drawSeedNumbers={matchDrawInfo[match.id]?.seedNumbers}
                      />
                    ))}
                  </ul>
                </SortableContext>
              )}
            </DroppableCourt>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeMatch && (
          <div className="opacity-80 shadow-lg">
            <SortableMatch
              match={activeMatch}
              onOpenStatus={() => {}}
              onOpenScore={() => {}}
              drawName={matchDrawInfo[activeMatch.id]?.drawName}
              drawPositions={matchDrawInfo[activeMatch.id]?.positions}
              drawSeedNumbers={matchDrawInfo[activeMatch.id]?.seedNumbers}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
