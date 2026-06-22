// ゲーム盤面の型定義
// マスタデータ (Card) と区別するため、盤面上の存在は別名 + cardId 参照とする
// readonly を効かせて「直接書き換え」をコンパイル段階で防ぐ

import type { Card } from './card'

// ============================================================
// 定数 (初代DM1相当ルール)
// ============================================================
export const INITIAL_LP = 8000
export const HAND_LIMIT = 7
export const MONSTER_ZONE_SIZE = 5
export const SPELL_ZONE_SIZE = 5
export const INITIAL_HAND_SIZE = 5

// ============================================================
// フェイズ
// ============================================================
// 罠/効果モンスターを足すときに 'opponent_turn' フェイズが必要になる想定だが、
// 現スコープでは1人プレイなので 'draw' → 'main' → 'battle' → 'end' のみ
export const PHASES = ['draw', 'main', 'battle', 'end'] as const
export type Phase = (typeof PHASES)[number]

// ============================================================
// 場のモンスターの表示形式
// ============================================================
// 'face_up_attack'    表側攻撃表示
// 'face_up_defense'   表側守備表示
// 'face_down_defense' 裏側守備表示 (セット)
export type MonsterPosition = 'face_up_attack' | 'face_up_defense' | 'face_down_defense'

// ============================================================
// 盤面上のカード
// ============================================================
// マスタ (Card) ではなく、場・手札・墓地で個体識別するためのインスタンス型
// 同じカードを複数枚並べたい/個別に「攻撃済み」フラグを持ちたいので
// instanceId で一意に識別する
export interface CardInstance {
  readonly instanceId: string  // 'inst_001' のような実行時ID
  readonly cardId: number       // Card.id への参照
}

export interface MonsterOnField extends CardInstance {
  readonly position: MonsterPosition
  readonly hasAttackedThisTurn: boolean  // 1ターンに1度しか攻撃できない制限用
  readonly summonedThisTurn: boolean      // 召喚酔い等のルール拡張余地
}

export interface SpellOnField extends CardInstance {
  // 魔法ゾーンに置かれた状態。初代DM1相当では「発動して即墓地行き」が大半なので
  // ここに残るのは「装備魔法」や「永続魔法」想定 (現スコープでは未使用枠)
  readonly isFaceDown: boolean
}

// ============================================================
// プレイヤー状態
// ============================================================
// 相手プレイヤー (CPU/対戦相手) も同じ型を再利用する想定で対称に設計
// MONSTER_ZONE_SIZE / SPELL_ZONE_SIZE 個の固定長配列 (空き = null) で
// 「左から3番目のゾーン」のような位置情報を保持できる
export interface PlayerState {
  readonly name: string
  readonly lp: number
  readonly deck: readonly CardInstance[]            // 山札 (上から順)
  readonly hand: readonly CardInstance[]            // 手札
  readonly graveyard: readonly CardInstance[]       // 墓地
  readonly monsterZones: readonly (MonsterOnField | null)[]  // 長さ MONSTER_ZONE_SIZE
  readonly spellZones: readonly (SpellOnField | null)[]      // 長さ SPELL_ZONE_SIZE
}

// ============================================================
// ゲーム全体状態
// ============================================================
export interface GameState {
  readonly turn: number                              // 1始まり、両者合わせて+1
  readonly activePlayer: 'self' | 'opponent'         // 1人プレイ中は常に 'self' でもよい
  readonly phase: Phase
  readonly self: PlayerState
  readonly opponent: PlayerState
  // カードマスタは別管理 (Map で id 検索を O(1) に)
  // 盤面側は cardId しか持たないので、表示時に lookup する想定
  readonly cardMaster: ReadonlyMap<number, Card>
  readonly winner: 'self' | 'opponent' | 'draw' | null  // 決着前は null
  readonly log: readonly string[]                       // 画面に流す進行ログ (新しいものほど末尾)
}

// ============================================================
// 初期状態ファクトリ
// ============================================================
// 型定義が実用に耐えるかを確認するための最小ファクトリ
// デッキ構築UIや初期手札ドローは別タスクなので、ここでは空の盤面だけ作る
export function createEmptyPlayerState(name: string): PlayerState {
  return {
    name,
    lp: INITIAL_LP,
    deck: [],
    hand: [],
    graveyard: [],
    monsterZones: Array<null>(MONSTER_ZONE_SIZE).fill(null),
    spellZones: Array<null>(SPELL_ZONE_SIZE).fill(null),
  }
}

export function createInitialGameState(cardMaster: ReadonlyMap<number, Card>): GameState {
  return {
    turn: 1,
    activePlayer: 'self',
    phase: 'draw',
    self: createEmptyPlayerState('Player'),
    opponent: createEmptyPlayerState('CPU'),
    cardMaster,
    winner: null,
    log: [],
  }
}

// ============================================================
// ユーティリティ (型からマスタを引くヘルパー)
// ============================================================
// 盤面上のインスタンスから元のカード情報を引く
// マスタに存在しない cardId は仕様上ありえないが、防御的に undefined を返す
export function lookupCard(
  state: GameState,
  instance: CardInstance,
): Card | undefined {
  return state.cardMaster.get(instance.cardId)
}
