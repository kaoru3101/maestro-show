"use client";

import { useState, use } from "react";
import type { Match } from "@/types/api";
import Button from "@/components/ui/Button";
import PageState from "@/components/ui/PageState";
import { MATCH_STATUS } from "@/lib/constants";
import type { CourtWithMatches } from "./_utils";
import { CourtBoard } from "./_components/CourtBoard";
import { AddMatchModal } from "./_components/AddMatchModal";
import { StatusModal } from "./_components/StatusModal";
import { ScoreModal } from "./_components/ScoreModal";
import { useOrder } from "./_hooks/useOrder";
import { QrModal } from "@/components/ui/QrModal";

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    tournament, matchDrawInfo, courts, setCourts,
    categories, players, pairs,
    loading, fetchError,
    fetchData, handleScheduleTime,
  } = useOrder(id);

  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusMatch, setStatusMatch] = useState<Match | null>(null);
  const [scoreMatch, setScoreMatch] = useState<Match | null>(null);

  function copyPublicUrl() {
    if (!tournament) return;
    const url = `${window.location.origin}/view/${tournament.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const totalMatches = courts.reduce((s, c) => s + c.matches.length, 0);
  const playingCount = courts.reduce((s, c) => s + c.matches.filter((m) => m.status === MATCH_STATUS.PLAYING).length, 0);
  const doneCount = courts.reduce((s, c) => s + c.matches.filter((m) => m.status === MATCH_STATUS.DONE).length, 0);
  const pendingCount = courts.reduce((s, c) => s + c.matches.filter((m) => m.status === MATCH_STATUS.PENDING).length, 0);

  return (
    <PageState loading={loading} error={fetchError} onRetry={fetchData}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-fg">{tournament?.name}</h1>
            <p className="text-xs text-fg-mute mt-0.5">
              {tournament?.date}{tournament?.venue && ` ・ ${tournament.venue}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyPublicUrl} className="px-3">
              {copied ? "コピーしました ✓" : "公開URLをコピー"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowQr(true)} className="px-3">
              QR
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)} className="px-3">
              + 試合を追加
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "総試合数", value: totalMatches },
            { label: "進行中", value: playingCount },
            { label: "完了", value: doneCount },
            { label: "待機中", value: pendingCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-bg-elevated rounded-lg px-4 py-3">
              <p className="text-xs text-fg-mute">{label}</p>
              <p className="text-xl font-bold text-fg mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <CourtBoard
          tournamentId={id}
          courts={courts}
          setCourts={setCourts}
          fetchData={fetchData}
          matchDrawInfo={matchDrawInfo}
          tournamentDate={tournament?.date}
          onOpenStatus={setStatusMatch}
          onOpenScore={setScoreMatch}
          onScheduleTime={handleScheduleTime}
        />

        {showQr && tournament && (
          <QrModal
            url={`${window.location.origin}/view/${tournament.shareToken}`}
            onClose={() => setShowQr(false)}
          />
        )}

        {showAddModal && (
          <AddMatchModal
            tournamentId={id}
            courts={courts}
            categories={categories}
            players={players}
            pairs={pairs}
            onClose={() => setShowAddModal(false)}
            onAdded={() => { setShowAddModal(false); fetchData(); }}
          />
        )}

        {statusMatch && (
          <StatusModal
            match={statusMatch}
            tournamentId={id}
            onClose={() => setStatusMatch(null)}
            onSaved={() => { setStatusMatch(null); fetchData(); }}
          />
        )}

        {scoreMatch && (
          <ScoreModal
            match={scoreMatch}
            tournamentId={id}
            onClose={() => setScoreMatch(null)}
            onSaved={() => { setScoreMatch(null); fetchData(); }}
          />
        )}
      </div>
    </PageState>
  );
}
