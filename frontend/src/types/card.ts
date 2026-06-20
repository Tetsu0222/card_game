// DB schema (db/init/01_schema.sql) と1:1対応するカード型定義
// 判別共用体 (card_type) でモンスター/魔法を区別し、
// フィールドアクセス時に型が自動で絞り込まれるようにしている

// ============================================================
// ENUM 相当
// ============================================================
export const ATTRIBUTES = ['闇', '光', '炎', '水', '地', '風'] as const
export type Attribute = (typeof ATTRIBUTES)[number]

// 種族はマスタが膨れる想定なので string のまま (DB側もVARCHAR)
export type Race = string

// 魔法効果のキー: コード側のハンドラと1:1対応する
// 新しい効果を追加するときは、ここに追記 + effects ハンドラを実装する
export const SPELL_EFFECT_KEYS = [
  'heal_1000',
  'destroy_all_opp_monsters',
  'draw_2',
] as const
export type SpellEffectKey = (typeof SPELL_EFFECT_KEYS)[number]

// ============================================================
// カード本体 (判別共用体)
// ============================================================
interface CardBase {
  id: number
  name: string
  description: string | null
}

export interface MonsterCard extends CardBase {
  card_type: 'monster'
  attribute: Attribute
  race: Race
  level: number
  attack: number
  defense: number
}

export interface SpellCard extends CardBase {
  card_type: 'spell'
  effect_key: SpellEffectKey
}

export type Card = MonsterCard | SpellCard

// ============================================================
// 融合レシピ
// ============================================================
export interface FusionRecipe {
  result_card_id: number
  material1_card_id: number
  material2_card_id: number
}

// ============================================================
// 型ガード (型の絞り込みを明示的に呼びたいとき用)
// ============================================================
export const isMonster = (card: Card): card is MonsterCard =>
  card.card_type === 'monster'

export const isSpell = (card: Card): card is SpellCard =>
  card.card_type === 'spell'
