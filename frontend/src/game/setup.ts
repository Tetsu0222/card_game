import { isMonster, type Card } from '../types/card'
import {
  INITIAL_HAND_SIZE,
  createInitialGameState,
  type CardInstance,
  type GameState,
  type MonsterOnField,
  type PlayerState,
} from '../types/game'

// 配列をシャッフル (Fisher-Yates)
// 元配列を破壊しないように複製してから振る
function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// instanceId 採番用
// React再描画と独立に増えてほしいのでモジュールスコープの単純カウンタ
let instanceCounter = 0
function nextInstanceId(): string {
  instanceCounter += 1
  return `inst_${instanceCounter.toString().padStart(4, '0')}`
}

// API から取った Card[] からデッキを組む
// 今回は学習用にモンスターのみ抽出 (魔法は表示するが召喚ボタンを出さない仕様)
// 1種類あたり3枚ずつ複製して、シャッフル
function buildDeck(cards: readonly Card[]): CardInstance[] {
  const pool: CardInstance[] = []
  for (const card of cards) {
    for (let n = 0; n < 3; n++) {
      pool.push({ instanceId: nextInstanceId(), cardId: card.id })
    }
  }
  return shuffle(pool)
}

// デッキ上から initial 枚を手札へ
function drawInitialHand(player: PlayerState, count: number): PlayerState {
  const hand = player.deck.slice(0, count)
  const deck = player.deck.slice(count)
  return { ...player, hand, deck }
}

// 開発用: 相手フィールドの先頭2ゾーンにテストモンスターを配置する
// CPU 行動が未実装な間の動作確認用。CPU 実装時に削除する想定。
// 候補から「適当に弱め/強めの2体」を拾って、戦闘ロジックの両ケースを試せるようにする
function seedOpponentField(allCards: readonly Card[]): MonsterOnField[] {
  const monsters = allCards.filter(isMonster)
  // ATK昇順で並べ、弱い側と強い側を1体ずつ
  const sorted = [...monsters].sort((a, b) => a.attack - b.attack)
  const picks = [sorted[0], sorted[sorted.length - 1]].filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )
  return picks.map((card) => ({
    instanceId: nextInstanceId(),
    cardId: card.id,
    position: 'face_up_attack',
    hasAttackedThisTurn: false,
    summonedThisTurn: false,
  }))
}

// ============================================================
// エントリーポイント
// ============================================================
// API から得た全カードを元に、初期ゲーム状態を作る
//   - cardMaster: id→Card の Map
//   - self: デッキ構築 + 初期手札ドロー済み
//   - opponent: 動作確認用のモンスターを2体配置 (CPU実装で置き換え予定)
export function setupGame(allCards: readonly Card[]): GameState {
  const cardMaster = new Map<number, Card>(allCards.map((c) => [c.id, c]))
  const base = createInitialGameState(cardMaster)

  const deck = buildDeck(allCards)
  const selfWithDeck: PlayerState = { ...base.self, deck }
  const self = drawInitialHand(selfWithDeck, INITIAL_HAND_SIZE)

  // 相手フィールドの先頭2ゾーンにテスト用モンスターを置く
  const seeded = seedOpponentField(allCards)
  const opponentZones = base.opponent.monsterZones.slice()
  seeded.forEach((m, i) => {
    opponentZones[i] = m
  })
  const opponent: PlayerState = { ...base.opponent, monsterZones: opponentZones }

  return {
    ...base,
    self,
    opponent,
    log: [`ターン1 開始`, `初期手札 ${INITIAL_HAND_SIZE} 枚をドロー`],
  }
}
