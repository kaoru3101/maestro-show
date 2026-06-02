import { useState } from "react";
import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import api from "@/lib/axios";
import { ep } from "@/lib/endpoints";
import type { Match } from "@/types/api";
import type { CourtWithMatches } from "../_utils";

interface UseMatchDndOptions {
  tournamentId: string;
  courts: CourtWithMatches[];
  setCourts: React.Dispatch<React.SetStateAction<CourtWithMatches[]>>;
  onRollback: () => Promise<void>;
}

export function useMatchDnd({ tournamentId, courts, setCourts, onRollback }: UseMatchDndOptions) {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [activeCourtId, setActiveCourtId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart({ active }: DragStartEvent) {
    for (const c of courts) {
      const found = c.matches.find((m) => m.id === active.id);
      if (found) { setActiveMatch(found); setActiveCourtId(c.id); return; }
    }
  }

  async function patchWithRollback(patches: Promise<unknown>[]) {
    try { await Promise.all(patches); }
    catch { await onRollback(); }
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveMatch(null);
    const originalCourtId = activeCourtId;
    setActiveCourtId(null);

    if (!over || !originalCourtId || !activeMatch) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const isOverCourtZone = overId.startsWith("court-");
    const destCourtId = isOverCourtZone ? overId.replace("court-", "") : null;

    const destCourt = destCourtId
      ? courts.find((c) => c.id === destCourtId)
      : courts.find((c) => c.matches.some((m) => m.id === overId));
    if (!destCourt) return;

    const sourceCourt = courts.find((c) => c.id === originalCourtId);
    if (!sourceCourt) return;

    if (originalCourtId !== destCourt.id) {
      const dragged = activeMatch;
      const sourceMatches = sourceCourt.matches
        .filter((m) => m.id !== activeId)
        .map((m, i) => ({ ...m, order: i + 1 }));

      const destBase = destCourt.matches;
      let destMatches: typeof destBase;
      if (isOverCourtZone) {
        destMatches = [...destBase, dragged].map((m, i) => ({ ...m, order: i + 1 }));
      } else {
        const overIndex = destBase.findIndex((m) => m.id === overId);
        const inserted = [...destBase];
        inserted.splice(overIndex, 0, dragged);
        destMatches = inserted.map((m, i) => ({ ...m, order: i + 1 }));
      }

      setCourts((prev) => prev.map((c) => {
        if (c.id === destCourt.id) return { ...c, matches: destMatches };
        if (c.id === originalCourtId) return { ...c, matches: sourceMatches };
        return c;
      }));

      await patchWithRollback([
        ...destMatches.map((m) =>
          api.patch(ep.tournaments.matchOrder(tournamentId, m.id), { order: m.order, courtId: destCourt.id })
        ),
        ...sourceMatches.map((m) =>
          api.patch(ep.tournaments.matchOrder(tournamentId, m.id), { order: m.order })
        ),
      ]);
    } else {
      const oldIndex = sourceCourt.matches.findIndex((m) => m.id === activeId);
      const newIndex = sourceCourt.matches.findIndex((m) => m.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(sourceCourt.matches, oldIndex, newIndex).map((m, i) => ({ ...m, order: i + 1 }));
      setCourts((prev) => prev.map((c) => c.id === sourceCourt.id ? { ...c, matches: reordered } : c));

      await patchWithRollback(
        reordered.map((m) => api.patch(ep.tournaments.matchOrder(tournamentId, m.id), { order: m.order }))
      );
    }
  }

  return { sensors, activeMatch, handleDragStart, handleDragEnd };
}
