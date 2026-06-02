-- V1__create_tables.sql

-- ユーザー（管理者）
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- JWTリフレッシュトークン
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 大会
CREATE TABLE tournaments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    date         DATE NOT NULL,
    venue        VARCHAR(255),
    share_token  VARCHAR(255) UNIQUE NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

-- 大会と管理者の中間テーブル
CREATE TABLE tournament_users (
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'staff')),
    PRIMARY KEY (tournament_id, user_id)
);

-- 大会ごとのカテゴリ
CREATE TABLE tournament_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    type          VARCHAR(10) NOT NULL CHECK (type IN ('singles', 'doubles')),
    "order"       INTEGER NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- コート
CREATE TABLE courts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    "order"       INTEGER NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- チームマスター
CREATE TABLE teams (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 選手マスター
CREATE TABLE players (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id    UUID REFERENCES teams(id) ON DELETE SET NULL,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 大会への選手参加登録
CREATE TABLE tournament_players (
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    PRIMARY KEY (tournament_id, player_id)
);

-- ペアマスター
CREATE TABLE pairs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_a_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player_b_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at   TIMESTAMP DEFAULT NOW()
);

-- 大会へのペア参加登録
CREATE TABLE tournament_pairs (
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    pair_id       UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
    PRIMARY KEY (tournament_id, pair_id)
);

-- 試合
CREATE TABLE matches (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id      UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    court_id           UUID REFERENCES courts(id) ON DELETE SET NULL,
    category_id        UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE RESTRICT,
    type               VARCHAR(10) NOT NULL CHECK (type IN ('singles', 'doubles')),
    "order"            INTEGER NOT NULL,
    side_a_player_id   UUID REFERENCES players(id) ON DELETE SET NULL,
    side_b_player_id   UUID REFERENCES players(id) ON DELETE SET NULL,
    side_a_pair_id     UUID REFERENCES pairs(id) ON DELETE SET NULL,
    side_b_pair_id     UUID REFERENCES pairs(id) ON DELETE SET NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'playing', 'suspended', 'done')),
    sets               JSONB NOT NULL DEFAULT '[]',
    scheduled_time     TIMESTAMP,
    started_at         TIMESTAMP,
    ended_at           TIMESTAMP,
    created_at         TIMESTAMP DEFAULT NOW(),
    updated_at         TIMESTAMP DEFAULT NOW(),

    CONSTRAINT check_singles CHECK (
        type != 'singles' OR (
            side_a_player_id IS NOT NULL AND
            side_b_player_id IS NOT NULL AND
            side_a_pair_id IS NULL AND
            side_b_pair_id IS NULL
        )
    ),
    CONSTRAINT check_doubles CHECK (
        type != 'doubles' OR (
            side_a_pair_id IS NOT NULL AND
            side_b_pair_id IS NOT NULL AND
            side_a_player_id IS NULL AND
            side_b_player_id IS NULL
        )
    )
);

-- インデックス
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_tournament_users_user_id ON tournament_users(user_id);
CREATE INDEX idx_tournament_categories_tournament_id ON tournament_categories(tournament_id);
CREATE INDEX idx_courts_tournament_id ON courts(tournament_id);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_tournament_players_player_id ON tournament_players(player_id);
CREATE INDEX idx_tournament_pairs_pair_id ON tournament_pairs(pair_id);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_court_id ON matches(court_id);
CREATE INDEX idx_tournaments_share_token ON tournaments(share_token);
