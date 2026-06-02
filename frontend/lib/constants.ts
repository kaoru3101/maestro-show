import type { CategoryType, MatchType, MatchResultType, EncounterStatus } from "@/types/api";

// ドメイン値定数（比較・代入用）
export const MATCH_WINNER = {
  SIDE_A: "side_a",
  SIDE_B: "side_b",
} as const;

export const MATCH_TYPE = {
  SINGLES: "singles",
  DOUBLES: "doubles",
} as const;

export const MATCH_STATUS = {
  PENDING:   "pending",
  PLAYING:   "playing",
  SUSPENDED: "suspended",
  DONE:      "done",
} as const;

export const DRAW_FORMAT = {
  ROUND_ROBIN:        "round_robin",
  SINGLE_ELIMINATION: "single_elimination",
} as const;

export const DRAW_STATUS = {
  DRAFT:     "draft",
  PUBLISHED: "published",
} as const;

export const CATEGORY_TYPE = {
  SINGLES:     "singles",
  DOUBLES:     "doubles",
  TEAM_BATTLE: "team_battle",
} as const;

export const ENCOUNTER_STATUS = {
  PENDING: "pending",
  ONGOING: "ongoing",
  DONE:    "done",
  RETIRED: "retired",
} as const;

// 選手の所属なし表示
export const NO_TEAM_LABEL = "無所属";

// 試合ステータスラベル
export const MATCH_STATUS_LABEL = {
  pending:   "待機",
  playing:   "進行中",
  suspended: "中断",
  done:      "完了",
} as const;

// 試合ステータス CSS クラス
export const MATCH_STATUS_CLASS = {
  pending:   "bg-bg-elevated text-fg-mute",
  playing:   "bg-green/15 text-green",
  suspended: "bg-yellow/15 text-yellow",
  done:      "bg-bg-elevated text-fg-soft",
} as const;

// 試合種別オプション
export const RESULT_TYPE_OPTIONS: { value: MatchResultType; label: string }[] = [
  { value: "normal",  label: "通常" },
  { value: "default", label: "デフォルト (def)" },
  { value: "wo",      label: "ウォークオーバー (W.O.)" },
  { value: "ret",     label: "リタイア (ret)" },
  { value: "cut",     label: "打ち切り" },
];

// カテゴリプリセット（フロントエンド定数・DBには持たない）
export const PRESET_CATEGORIES: { name: string; type: MatchType }[] = [
  { name: "男子シングルス", type: "singles" },
  { name: "女子シングルス", type: "singles" },
  { name: "男子ダブルス",   type: "doubles" },
  { name: "女子ダブルス",   type: "doubles" },
  { name: "混合ダブルス",   type: "doubles" },
  { name: "ジュニア男子",   type: "singles" },
  { name: "ジュニア女子",   type: "singles" },
  { name: "シニア男子",     type: "singles" },
  { name: "シニア女子",     type: "singles" },
];

// ドロー名プリセット（SE）
export const PRESET_DRAW_NAMES = ["本戦", "予選A", "予選B", "予選C"] as const;

// ドロー名プリセット（RR）
export const PRESET_RR_DRAW_NAMES = ["ブロックA", "ブロックB", "ブロックC", "ブロックD"] as const;

// ドローフォーマット ラベル・CSSクラス
export const DRAW_FORMAT_LABEL = {
  round_robin:        "ラウンドロビン",
  single_elimination: "シングルエリミネーション",
} as const;

export const DRAW_FORMAT_CLASS = {
  round_robin:        "bg-blue-500/15 text-blue-400",
  single_elimination: "bg-violet-500/15 text-violet-400",
} as const;

// ドローステータス ラベル・CSSクラス
export const DRAW_STATUS_LABEL = {
  published: "確定",
  draft:     "下書き",
} as const;

export const DRAW_STATUS_CLASS = {
  published: "bg-green/15 text-green",
  draft:     "bg-bg-elevated text-fg-mute",
} as const;

// 大会ステータスラベル
export const TOURNAMENT_STATUS_LABEL = {
  preparing: "準備中",
  ongoing:   "進行中",
  completed: "完了",
} as const;

// 大会ステータス CSS クラス
export const TOURNAMENT_STATUS_CLASS = {
  preparing: "bg-bg-elevated text-fg-mute",
  ongoing:   "bg-green/15 text-green",
  completed: "bg-bg-elevated text-fg-soft",
} as const;

// 中断理由
export const SUSPENSION_REASONS = ["RAIN", "COURT", "SUNSET", "OTHER"] as const;
export type SuspensionReason = typeof SUSPENSION_REASONS[number];

export const SUSPENSION_REASON_LABEL: Record<SuspensionReason, string> = {
  RAIN:   "雨天",
  COURT:  "コート整備",
  SUNSET: "日没",
  OTHER:  "その他",
};

// スケジュールタイプ
export const SCHEDULE_TYPES = ["F", "NLT", "NB", "TBD", "START_AT"] as const;
export type ScheduleType = typeof SCHEDULE_TYPES[number];

export const SCHEDULE_TYPE_LABEL: Record<ScheduleType, string> = {
  F:        "F",
  NLT:      "NLT",
  NB:       "NB",
  TBD:      "TBD",
  START_AT: "SA",
};

// 時刻入力が必要なタイプ
export const SCHEDULE_TYPE_NEEDS_TIME = new Set<ScheduleType>(["NLT", "NB", "START_AT"]);

// カテゴリ種別ラベル
export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  singles:     "シングルス",
  doubles:     "ダブルス",
  team_battle: "団体戦",
} as const;

// エンカウンターステータスラベル・CSSクラス
export const ENCOUNTER_STATUS_LABEL: Record<EncounterStatus, string> = {
  pending: "待機",
  ongoing: "進行中",
  done:    "完了",
  retired: "打ち切り",
} as const;

export const ENCOUNTER_STATUS_CLASS: Record<EncounterStatus, string> = {
  pending: "bg-bg-elevated text-fg-mute",
  ongoing: "bg-green/15 text-green",
  done:    "bg-bg-elevated text-fg-soft",
  retired: "bg-yellow/15 text-yellow",
} as const;

// ラバー種別ラベル
export const RUBBER_TYPE_LABEL: Record<string, string> = {
  singles: "シングルス",
  doubles: "ダブルス",
} as const;
