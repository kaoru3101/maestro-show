export type MatchStatus = "pending" | "playing" | "suspended" | "done";
export type MatchType = "singles" | "doubles";
export type CategoryType = "singles" | "doubles" | "team_battle";
export type TournamentRole = "owner" | "leader" | "staff" | "viewer";
export type DrawStatus = "draft" | "published";
export type EncounterStatus = "pending" | "ongoing" | "done" | "retired";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  venue: string | null;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  role: TournamentRole;
  status: "preparing" | "ongoing" | "completed";
  courtCount: number;
  matchCount: number;
}

export interface Category {
  id: string;
  tournamentId: string;
  name: string;
  type: CategoryType;
  order: number;
  rubbers?: string;
  inUse?: boolean;
}

export interface Court {
  id: string;
  tournamentId: string;
  name: string;
  order: number;
}

export interface Team {
  id: string;
  name: string;
  inUse?: boolean;
}

export interface Player {
  id: string;
  name: string;
  team: Team | null;
  inUse?: boolean;
}

export interface Pair {
  id: string;
  playerA: Player;
  playerB: Player;
  inUse?: boolean;
}

export interface SetScore {
  sideA: number;
  sideB: number;
  tiebreak?: number;
}

export interface MatchSide {
  player?: { name: string; team: { name: string } | null };
  pair?: {
    playerA: { name: string; team: { name: string } | null };
    playerB: { name: string; team: { name: string } | null };
  };
}

export type MatchResultType = "normal" | "default" | "wo" | "ret" | "cut";

export interface Match {
  id: string;
  courtId: string | null;
  order: number;
  type: MatchType;
  category: { id: string; name: string };
  status: MatchStatus;
  sideA: MatchSide;
  sideB: MatchSide;
  sets: SetScore[];
  winner: "side_a" | "side_b" | null;
  resultType: MatchResultType | null;
  teamEncounterId?: string | null;
  scheduleType: "F" | "NLT" | "NB" | "TBD" | "START_AT" | null;
  scheduledTime: string | null;
  suspensionReason: "RAIN" | "COURT" | "SUNSET" | "OTHER" | null;
  suspensionNote: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface TournamentUser {
  tournamentId: string;
  userId: string;
  name: string;
  email: string;
  role: TournamentRole;
}

export interface PublicMatchSide {
  player?: { name: string; team?: { name: string } };
  pair?: {
    playerA: { name: string; team?: { name: string } };
    playerB: { name: string; team?: { name: string } };
  };
}

export interface PublicCourt {
  id: string;
  name: string;
  order: number;
  matches: {
    id: string;
    order: number;
    type: MatchType;
    category: { id: string; name: string };
    status: MatchStatus;
    sideA: PublicMatchSide;
    sideB: PublicMatchSide;
    sets: SetScore[];
    scheduleType: string | null;
    scheduledTime: string | null;
    suspensionReason: string | null;
    suspensionNote: string | null;
  }[];
}

export interface PublicDrawSlotSide {
  isBye: boolean;
  player: { name: string; team: string } | null;
  pair: { playerA: string; playerB: string } | null;
  team: string | null;
  seedNumber: number | null;
}

export interface PublicDrawSlot {
  position: number;
  isBye: boolean;
  sideA: PublicDrawSlotSide | null;
  sideB: PublicDrawSlotSide | null;
  winner: "side_a" | "side_b" | null;
  resultType: MatchResultType | null;
  sets: string | null;
  matchId: string | null;
  courtName: string | null;
  matchOrder: number | null;
  encounterId?: string | null;
  encounter?: PublicTeamEncounterForView | null;
}

export interface PublicDrawRound {
  round: number;
  roundLabel: string;
  slots: PublicDrawSlot[];
}

export interface PublicRrStanding {
  rank: number;
  player: { name: string; team: string };
  wins: number;
  losses: number;
  setRate: number;
  gameRate: number;
}

export interface PublicRrMatch {
  id: string;
  sideA: PublicMatchSide;
  sideB: PublicMatchSide;
  status: MatchStatus;
  sets: SetScore[];
  winner: "side_a" | "side_b" | null;
  resultType: MatchResultType | null;
  courtName?: string | null;
  order?: number | null;
}

export interface PublicEncounterRubberForView {
  rubberNumber: number;
  type: string;
  status: string;
  winner: "side_a" | "side_b" | null;
  resultType: MatchResultType | null;
  sideAName: string;
  sideBName: string;
  sets: string | null;
}

export interface PublicTeamEncounterForView {
  sideATeamName: string;
  sideBTeamName: string;
  status: string;
  winner: "side_a" | "side_b" | "draw" | null;
  sideARubberWins: number;
  sideBRubberWins: number;
  matchIds: string[];
  rubbers: PublicEncounterRubberForView[];
}

export interface PublicTeamStandingForView {
  rank: number;
  teamName: string;
  encounterWins: number;
  encounterLosses: number;
  encounterDraws: number;
  rubberWins: number;
  rubberLosses: number;
  setWins: number;
  setLosses: number;
  gameWins: number;
  gameLosses: number;
}

export interface PublicDraw {
  id: string;
  name: string;
  format?: "single_elimination" | "round_robin";
  categoryType?: string;
  category: { id: string; name: string };
  status: string;
  // SE用
  rounds?: PublicDrawRound[];
  // RR用
  standings?: PublicRrStanding[];
  matches?: PublicRrMatch[];
  // team_battle RR用
  teamStandings?: PublicTeamStandingForView[];
  encounters?: PublicTeamEncounterForView[];
}

export interface PublicView {
  tournament: { name: string; date: string; venue: string | null };
  courts: PublicCourt[];
  draws: PublicDraw[];
}

export interface TournamentInfoSection {
  title: string;
  body: string;
}

export interface TournamentInfoAttachment {
  id: string;
  name: string;
  contentType: string;
  fileSize: number;
  downloadUrl: string;
  createdAt: string;
}

export interface TournamentInfo {
  id?: string;
  tournamentId: string;
  sections: TournamentInfoSection[];
  attachments: TournamentInfoAttachment[];
}

export interface DrawSlot {
  id: string;
  drawId: string;
  round: number;
  position: number;
  playerId: string | null;
  playerName: string | null;
  playerTeamName: string | null;
  pairId: string | null;
  pairPlayerAName: string | null;
  pairPlayerBName: string | null;
  seedNumber: number | null;
  isBye: boolean;
  // team_battle用
  teamId: string | null;
  teamName: string | null;
  encounterId: string | null;
  matchId: string | null;
  matchStatus: MatchStatus | null;
  matchResultType: MatchResultType | null;
  matchSets: string | null;
  matchCourtId: string | null;
  matchCourtName: string | null;
  matchOrder: number | null;
  winner: "side_a" | "side_b" | null;
}

// RR用
export interface RrPlayer {
  id: string;
  name?: string;
  team?: string;
  playerAName?: string;
  playerBName?: string;
}

export interface RrMatchSide {
  player?: { id: string; name: string; team: { name: string } | null };
  pair?: {
    id: string;
    playerA: { name: string; team: { name: string } | null };
    playerB: { name: string; team: { name: string } | null };
  };
}

export interface RrMatchEntry {
  id: string;
  sideA: RrMatchSide;
  sideB: RrMatchSide;
  status: MatchStatus;
  sets: SetScore[];
  winner: "side_a" | "side_b" | null;
  resultType: MatchResultType | null;
  addedToOop: boolean;
  drawId: string;
  courtId: string | null;
  order: number | null;
}

export interface RrStanding {
  rank: number;
  player: RrPlayer;
  wins: number;
  losses: number;
  matchesPlayed: number;
  setsWon: number;
  setsLost: number;
  setRate: number;
  gamesWon: number;
  gamesLost: number;
  gameRate: number;
}

export interface EncounterRubber {
  matchId: string | null;
  rubberNumber: number;
  type: MatchType;
  status: MatchStatus | null;
  winner: "side_a" | "side_b" | null;
  courtId: string | null;
  courtName: string | null;
  oopOrder: number;
  resultType: MatchResultType | null;
  // singles
  sideAPlayerId: string | null;
  sideAPlayerName: string | null;
  sideBPlayerId: string | null;
  sideBPlayerName: string | null;
  // doubles
  sideAPairId: string | null;
  sideAPairPlayerAId: string | null;
  sideAPairPlayerAName: string | null;
  sideAPairPlayerBId: string | null;
  sideAPairPlayerBName: string | null;
  sideBPairId: string | null;
  sideBPairPlayerAId: string | null;
  sideBPairPlayerAName: string | null;
  sideBPairPlayerBId: string | null;
  sideBPairPlayerBName: string | null;
  sets: string | null;
}

export interface TeamEncounter {
  id: string;
  tournamentId: string;
  categoryId: string;
  categoryName: string | null;
  sideATeamId: string;
  sideATeamName: string;
  sideBTeamId: string;
  sideBTeamName: string;
  status: EncounterStatus;
  winner: "side_a" | "side_b" | "draw" | null;
  rubbers: EncounterRubber[];
}

export interface RrTeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  encounterWins: number;
  encounterLosses: number;
  encounterDraws: number;
  rubberWins: number;
  rubberLosses: number;
  setWins: number;
  setLosses: number;
  gameWins: number;
  gameLosses: number;
}

export interface Draw {
  id: string;
  tournamentId: string;
  categoryId: string;
  categoryName: string | null;
  categoryType: CategoryType | null;
  name: string;
  format: "single_elimination" | "round_robin";
  status: DrawStatus;
  totalRounds: number;
  createdAt: string;
  updatedAt: string;
  // SE用
  slots?: DrawSlot[];
  // RR用
  players?: RrPlayer[];
  matches?: RrMatchEntry[];
  matchesGenerated?: boolean;
  // team_battle用
  encounters?: TeamEncounter[];
  teamStandings?: RrTeamStanding[];
  teamIdList?: string[];
  playerIdList?: string[];
}

export interface MatchHistoryDraw {
  id: string;
  name: string;
  round: number;
  roundLabel: string;
  sideAR1Position: number | null;
  sideBR1Position: number | null;
  sideASeedNumber: number | null;
  sideBSeedNumber: number | null;
}

export interface MatchHistory {
  id: string;
  type: MatchType;
  category: { id: string; name: string };
  court: { id: string; name: string } | null;
  order: number;
  status: "done";
  sideA: MatchSide;
  sideB: MatchSide;
  sets: SetScore[];
  winner: "side_a" | "side_b" | null;
  resultType: MatchResultType | null;
  endedAt: string | null;
  draw: MatchHistoryDraw | null;
}

export interface ApiError {
  code: string;
  message: string;
}

// CSV import
export type CsvImportType = "players" | "teams" | "pairs";

export interface CsvPreviewSummary {
  total: number;
  valid: number;
  errorCount: number;
}

export interface CsvPreviewRow {
  rowNumber: number;
  status: "valid" | "error";
  errors: string[];
  // players & teams
  name?: string | null;
  // players
  teamName?: string | null;
  // pairs
  playerAName?: string | null;
  playerBName?: string | null;
  teamAName?: string | null;
  teamBName?: string | null;
}

export interface CsvPreviewResponse {
  type: CsvImportType;
  rows: CsvPreviewRow[];
  summary: CsvPreviewSummary;
}

export interface CsvSkippedRow {
  rowNumber: number;
  reason: string;
  values: Record<string, string | null>;
}

export interface CsvImportResponse {
  created: number;
  skipped: number;
  skippedRows: CsvSkippedRow[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
