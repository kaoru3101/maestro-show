"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MATCH_STATUS_LABEL as STATUS_LABEL,
  MATCH_STATUS_CLASS as STATUS_CLASS,
  NO_TEAM_LABEL,
  SCHEDULE_TYPE_LABEL,
  SCHEDULE_TYPE_NEEDS_TIME,
  SUSPENSION_REASON_LABEL,
  MATCH_STATUS,
  type ScheduleType,
  type SuspensionReason,
} from "@/lib/constants";
import type { Match } from "@/types/api";
import { ScheduleModal } from "./ScheduleModal";
import { formatTime } from "@/lib/formatters";

function ScheduleBand({
  scheduleType,
  scheduledTime,
  suspensionReason,
  suspensionNote,
  isPending,
  isSuspended,
  onEdit,
  isPlaying,
}: {
  scheduleType: ScheduleType | null;
  scheduledTime: string | null;
  suspensionReason: SuspensionReason | null;
  suspensionNote: string | null;
  isPending: boolean;
  isSuspended: boolean;
  onEdit: () => void;
  isPlaying: boolean;
}) {
  const time = formatTime(scheduledTime);
  const needsTime = scheduleType ? SCHEDULE_TYPE_NEEDS_TIME.has(scheduleType) : false;

  // 中断帯
  if (isSuspended) {
    const reasonLabel = suspensionReason ? SUSPENSION_REASON_LABEL[suspensionReason] : null;
    return (
      <div className="px-3 py-1.5 flex items-center gap-2 bg-yellow/10">
        <span className="font-mono text-sm font-bold text-yellow shrink-0">中断</span>
        {(reasonLabel || suspensionNote) && (
          <div className="flex flex-col gap-0.5 min-w-0">
            {reasonLabel && <span className="text-xs text-yellow font-medium">{reasonLabel}</span>}
            {suspensionNote && <span className="text-xs text-fg-mute truncate">{suspensionNote}</span>}
          </div>
        )}
      </div>
    );
  }

  let label: string;
  if (!scheduleType) {
    label = (isPending || isPlaying) ? "TBD" : "";
  } else if (needsTime && time) {
    label = `${SCHEDULE_TYPE_LABEL[scheduleType]} ${time}`;
  } else {
    label = SCHEDULE_TYPE_LABEL[scheduleType];
  }

  if (!label) return null;

  return (
    <div
      className={`px-3 py-1.5 flex items-center gap-2 ${isPlaying ? "bg-green/10" : "bg-bg-elevated"} ${isPending ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
      onClick={isPending ? onEdit : undefined}
    >
      <span className="font-mono text-sm font-bold text-fg">{label}</span>
      {isPending && <span className="text-[10px] text-fg-mute ml-auto">タップして変更</span>}
    </div>
  );
}

export function SortableMatch({
  match,
  onOpenStatus,
  onOpenScore,
  onScheduleTime,
  tournamentDate,
  drawName,
  drawPositions,
  drawSeedNumbers,
}: {
  match: Match;
  onOpenStatus: (m: Match) => void;
  onOpenScore: (m: Match) => void;
  onScheduleTime?: (matchId: string, scheduleType: string | null, scheduledTime: string | null) => void;
  tournamentDate?: string;
  drawName?: string;
  drawPositions?: number[];
  drawSeedNumbers?: (number | null)[];
}) {
  const [showModal, setShowModal] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: match.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const isPending = match.status === MATCH_STATUS.PENDING && !!onScheduleTime;
  const scheduleType = match.scheduleType as ScheduleType | null;

  function handleSave(type: ScheduleType | null, time: string) {
    if (!onScheduleTime) return;
    if (!type) {
      onScheduleTime(match.id, null, null);
      return;
    }
    const needsTime = SCHEDULE_TYPE_NEEDS_TIME.has(type);
    if (needsTime && time) {
      const date = tournamentDate ?? new Date().toISOString().slice(0, 10);
      onScheduleTime(match.id, type, `${date}T${time}:00+09:00`);
    } else {
      onScheduleTime(match.id, type, null);
    }
  }

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        className={`rounded-lg border overflow-hidden ${
          match.status === MATCH_STATUS.PLAYING ? "border-green" : "border-transparent"
        }`}
      >
        <ScheduleBand
          scheduleType={scheduleType}
          scheduledTime={match.scheduledTime}
          suspensionReason={match.suspensionReason as SuspensionReason | null}
          suspensionNote={match.suspensionNote}
          isPending={isPending}
          isSuspended={match.status === MATCH_STATUS.SUSPENDED}
          onEdit={() => setShowModal(true)}
          isPlaying={match.status === MATCH_STATUS.PLAYING}
        />

        <div className={`flex items-start gap-2 px-3 py-2 ${match.status === MATCH_STATUS.PLAYING ? "bg-bg-card" : "bg-bg"}`}>
          <span
            {...attributes}
            {...listeners}
            className="text-fg-mute text-sm mt-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            ⠿
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-fg-mute font-medium mb-0.5">
              {match.category.name}{drawName && `　${drawName}`}
            </p>
            {[match.sideA, match.sideB].map((side, i) => (
              <div key={i}>
                {i === 1 && <p className="text-xs text-fg-mute">vs</p>}
                <p className="text-sm text-fg truncate flex items-center gap-1">
                  {drawPositions?.[i] != null && (
                    <span className="text-[10px] text-fg font-medium shrink-0">{drawPositions[i]}</span>
                  )}
                  {drawSeedNumbers?.[i] != null && (
                    <span className="text-[10px] text-green font-bold shrink-0">[{drawSeedNumbers[i]}]</span>
                  )}
                  {side.player ? (
                    <>{side.player.name}<span className="text-xs text-fg-mute ml-1">({side.player.team?.name ?? NO_TEAM_LABEL})</span></>
                  ) : side.pair ? (
                    <>
                      {side.pair.playerA.name} / {side.pair.playerB.name}
                      <span className="text-xs text-fg-mute ml-1">
                        ({side.pair.playerA.team?.name ?? NO_TEAM_LABEL} / {side.pair.playerB.team?.name ?? NO_TEAM_LABEL})
                      </span>
                    </>
                  ) : "未設定"}
                </p>
              </div>
            ))}
            {match.status !== MATCH_STATUS.PENDING && (
              <button onClick={() => onOpenScore(match)} className="text-xs text-green hover:underline mt-0.5">
                {match.sets.length > 0 ? match.sets.map((s) => `${s.sideA}-${s.sideB}`).join(", ") : "スコア入力"}
              </button>
            )}
          </div>
          <button
            onClick={() => onOpenStatus(match)}
            className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium transition-colors cursor-pointer hover:opacity-80 ${STATUS_CLASS[match.status]}`}
          >
            {STATUS_LABEL[match.status]}
          </button>
        </div>
      </li>

      {showModal && (
        <ScheduleModal
          currentType={scheduleType}
          currentTime={formatTime(match.scheduledTime) ?? ""}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
