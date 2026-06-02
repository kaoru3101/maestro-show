"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { ep } from "@/lib/endpoints";
import { CATEGORY_TYPE, DRAW_FORMAT, MATCH_STATUS } from "@/lib/constants";
import { buildR1Maps } from "@/lib/drawSlotMaps";
import type { Tournament, Court, Match, Category, Player, Pair, Draw } from "@/types/api";
import type { CourtWithMatches, MatchDrawInfo } from "../_utils";

export function useOrder(id: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matchDrawInfo, setMatchDrawInfo] = useState<Record<string, MatchDrawInfo>>({});
  const [courts, setCourts] = useState<CourtWithMatches[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchData();
    fetchDrawInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchData() {
    setFetchError(false);
    try {
      const [tRes, cRes, mRes, catRes, pRes, pairRes] = await Promise.all([
        api.get<Tournament>(ep.tournaments.get(id)),
        api.get<Court[]>(ep.tournaments.courts(id)),
        api.get<Match[]>(ep.tournaments.matches(id)),
        api.get<Category[]>(ep.tournaments.categories(id)),
        api.get<Player[]>(ep.tournaments.players(id)),
        api.get<Pair[]>(ep.tournaments.pairs(id)),
      ]);
      setTournament(tRes.data);
      setCategories(catRes.data);
      setPlayers(pRes.data);
      setPairs(pairRes.data);
      setCourts(cRes.data.map((court) => ({
        ...court,
        matches: mRes.data
          .filter((m) => m.courtId === court.id && m.status !== MATCH_STATUS.DONE)
          .sort((a, b) => a.order - b.order),
      })));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDrawInfo() {
    try {
      const drawsRes = await api.get<Draw[]>(ep.tournaments.draws(id));
      const info: Record<string, MatchDrawInfo> = {};
      await Promise.all(
        drawsRes.data.map(async (d) => {
          const { data: draw } = await api.get<Draw>(ep.draws.get(d.id));

          if (draw.categoryType === CATEGORY_TYPE.TEAM_BATTLE) {
            for (const encounter of (draw.encounters ?? [])) {
              for (const rubber of encounter.rubbers) {
                if (!rubber.matchId) continue;
                info[rubber.matchId] = { drawName: draw.name, positions: [], seedNumbers: [null, null] };
              }
            }
            return;
          }

          if (draw.format === DRAW_FORMAT.ROUND_ROBIN) {
            for (const match of (draw.matches ?? [])) {
              info[match.id] = { drawName: draw.name, positions: [], seedNumbers: [null, null] };
            }
            return;
          }

          const { posMap: r1PosMap, seedMap: r1SeedMap } = buildR1Maps(draw.slots ?? []);
          for (const slot of (draw.slots ?? [])) {
            if (!slot.matchId) continue;
            const key = slot.playerId ?? slot.pairId ?? null;
            const r1Pos = key ? r1PosMap.get(key) : undefined;
            const r1Seed = key ? r1SeedMap.get(key) : undefined;
            if (!info[slot.matchId]) {
              info[slot.matchId] = { drawName: draw.name, positions: [], seedNumbers: [null, null] };
            }
            if (r1Pos != null) {
              info[slot.matchId].positions.push(r1Pos);
              info[slot.matchId].positions.sort((a, b) => a - b);
              const idx = info[slot.matchId].positions.indexOf(r1Pos);
              info[slot.matchId].seedNumbers[idx] = r1Seed ?? null;
            }
          }
        })
      );
      setMatchDrawInfo(info);
    } catch {
      // ドロー情報取得失敗は無視
    }
  }

  async function handleScheduleTime(matchId: string, scheduleType: string | null, scheduledTime: string | null) {
    try {
      await api.patch(ep.tournaments.matchScheduledTime(id, matchId), { scheduleType, scheduledTime });
      setCourts((prev) => prev.map((court) => ({
        ...court,
        matches: court.matches.map((m) =>
          m.id === matchId ? { ...m, scheduleType: scheduleType as Match["scheduleType"], scheduledTime } : m
        ),
      })));
    } catch {
      (await import("@/lib/toast")).toast("開始タイプの保存に失敗しました", "error");
    }
  }

  return {
    tournament, matchDrawInfo, courts, setCourts,
    categories, players, pairs,
    loading, fetchError,
    fetchData, handleScheduleTime,
  };
}
