-- 初代遊戯王DM1 相当スコープのスキーマ
-- - モンスター (攻撃力/守備力で殴り合う)
-- - 魔法 (単発効果)
-- - 融合 (素材2枚固定マッピング)
-- 罠カード/効果モンスターは次回作スコープ

-- ============================================================
-- ENUM 定義
-- ============================================================
-- card_type: 将来 'trap' / 'effect_monster' を足せるよう ENUM で定義
DO $$ BEGIN
    CREATE TYPE card_type AS ENUM ('monster', 'spell');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE attribute_type AS ENUM ('闇', '光', '炎', '水', '地', '風');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ユーザー / デッキ (枠だけ)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(64) NOT NULL UNIQUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- カードマスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(128) NOT NULL UNIQUE,
    card_type     card_type NOT NULL,

    -- モンスター用 (魔法ではNULL)
    attribute     attribute_type,
    race          VARCHAR(32),
    level         INT CHECK (level BETWEEN 1 AND 12),
    attack        INT,
    defense       INT,

    -- 魔法用 (モンスターではNULL)
    -- 効果の種類はコード側のハンドラと1:1対応
    -- 例: 'heal_1000' | 'destroy_all_opp_monsters' | 'draw_2'
    effect_key    VARCHAR(64),

    description   TEXT,

    -- card_type に応じた必須カラムをDBレベルで担保
    CONSTRAINT chk_monster_fields CHECK (
        card_type <> 'monster' OR (
            attribute IS NOT NULL AND
            race      IS NOT NULL AND
            level     IS NOT NULL AND
            attack    IS NOT NULL AND
            defense   IS NOT NULL
        )
    ),
    CONSTRAINT chk_spell_fields CHECK (
        card_type <> 'spell' OR effect_key IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_effect_key ON cards(effect_key);

-- ============================================================
-- デッキ
-- ============================================================
CREATE TABLE IF NOT EXISTS decks (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(64) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deck_cards (
    deck_id     INT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    card_id     INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 3),
    PRIMARY KEY (deck_id, card_id)
);

-- ============================================================
-- 融合レシピ (素材2枚固定)
-- material1_id <= material2_id で正規化して重複登録を防ぐ
-- ============================================================
CREATE TABLE IF NOT EXISTS fusions (
    result_card_id    INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    material1_card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    material2_card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    PRIMARY KEY (material1_card_id, material2_card_id),
    CONSTRAINT chk_material_order CHECK (material1_card_id <= material2_card_id)
);

-- ============================================================
-- サンプルデータ
-- ============================================================
INSERT INTO cards (name, card_type, attribute, race, level, attack, defense, description) VALUES
    ('ブラック・マジシャン', 'monster', '闇', '魔法使い族', 7, 2500, 2100, '魔法使い族の最強の使い手'),
    ('真紅眼の黒竜',         'monster', '闇', 'ドラゴン族', 7, 2400, 2000, '怒りで真紅に燃え盛る黒竜'),
    ('青眼の白龍',           'monster', '光', 'ドラゴン族', 8, 3000, 2500, '伝説とまで言われた魔物'),
    ('暗黒騎士ガイア',       'monster', '闇', '戦士族',     7, 2300, 2100, '黒い暴風となって突進する騎士'),
    ('カース・オブ・ドラゴン','monster', '闇', 'ドラゴン族', 5, 2000, 1500, '呪われしドラゴン'),
    ('真紅眼の黒竜剣',       'monster', '闇', 'ドラゴン族', 7, 2400, 2000, '融合モンスター枠の例')
ON CONFLICT (name) DO NOTHING;

INSERT INTO cards (name, card_type, effect_key, description) VALUES
    ('治療の神 ディアン・ケト', 'spell', 'heal_1000',              '自分のライフを1000ポイント回復'),
    ('サンダー・ボルト',         'spell', 'destroy_all_opp_monsters','相手フィールドのモンスターを全て破壊'),
    ('強欲な壺',                 'spell', 'draw_2',                 'デッキから2枚ドロー')
ON CONFLICT (name) DO NOTHING;

-- 融合サンプル: 暗黒騎士ガイア + カース・オブ・ドラゴン → 竜騎士ガイア (とりあえず真紅眼の黒竜剣で代用)
INSERT INTO fusions (result_card_id, material1_card_id, material2_card_id)
SELECT
    (SELECT id FROM cards WHERE name = '真紅眼の黒竜剣'),
    LEAST(a.id, b.id),
    GREATEST(a.id, b.id)
FROM
    (SELECT id FROM cards WHERE name = '暗黒騎士ガイア') a,
    (SELECT id FROM cards WHERE name = 'カース・オブ・ドラゴン') b
ON CONFLICT DO NOTHING;
