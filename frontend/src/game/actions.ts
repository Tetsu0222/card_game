import { isMonster, type MonsterCard } from '../types/card'
import {
  PHASES,
  lookupCard,
  type GameState,
  type MonsterOnField,
  type Phase,
  type PlayerState,
} from '../types/game'
import { resolveBattle } from './battle'

// ============================================================
// 共通ヘルパー
// ============================================================
function appendLog(state: GameState, ...lines: string[]): GameState {
  return { ...state, log: [...state.log, ...lines] }
}

function updateSelf(state: GameState, updater: (p: PlayerState) => PlayerState): GameState {
  return { ...state, self: updater(state.self) }
}

function nextPhase(current: Phase): Phase {
  const i = PHASES.indexOf(current)
  return PHASES[(i + 1) % PHASES.length]
}

// 「攻撃済み/召喚酔い」フラグをリセット
function refreshMonsterTurnFlags(zones: readonly (MonsterOnField | null)[]): (MonsterOnField | null)[] {
  return zones.map((m) =>
    m === null ? null : { ...m, hasAttackedThisTurn: false, summonedThisTurn: false },
  )
}

// 攻撃側の事前ガード結果
// 成功時は (zoneIdx, attacker, card) を、失敗時は新state (ログ付き) を返す
type AttackPreflight =
  | { ok: true; zoneIdx: number; attacker: MonsterOnField; card: MonsterCard }
  | { ok: false; state: GameState }

function preflightAttack(
  state: GameState,
  fieldInstanceId: string,
): AttackPreflight {
  if (state.phase !== 'battle') {
    return { ok: false, state: appendLog(state, '攻撃失敗: バトルフェイズではありません') }
  }
  if (state.turn === 1 && state.activePlayer === 'self') {
    return { ok: false, state: appendLog(state, '攻撃失敗: 先攻1ターン目は攻撃できません') }
  }
  const zoneIdx = state.self.monsterZones.findIndex(
    (z) => z !== null && z.instanceId === fieldInstanceId,
  )
  if (zoneIdx === -1) {
    return { ok: false, state: appendLog(state, '攻撃失敗: 指定モンスターが場にいません') }
  }
  const attacker = state.self.monsterZones[zoneIdx]!
  if (attacker.hasAttackedThisTurn) {
    return { ok: false, state: appendLog(state, '攻撃失敗: このモンスターはすでに攻撃済みです') }
  }
  if (attacker.summonedThisTurn) {
    return {
      ok: false,
      state: appendLog(state, '攻撃失敗: 召喚したターンは攻撃できません (召喚酔い)'),
    }
  }
  const card = lookupCard(state, attacker)
  if (!card || !isMonster(card)) {
    return { ok: false, state: appendLog(state, '攻撃失敗: マスタ情報が不正') }
  }
  return { ok: true, zoneIdx, attacker, card }
}

// ============================================================
// アクション群
// すべて (state, ...args) => GameState の純粋関数
// 失敗条件 (例: 場が満杯) はログに残してstateをそのまま返す方針
// ============================================================

// ドローフェイズ: デッキ上から1枚手札へ
// デッキ切れ = デッキデス (敗北)
export function drawCard(state: GameState): GameState {
  const { self } = state
  if (self.deck.length === 0) {
    return appendLog(
      { ...state, winner: 'opponent' },
      'デッキ切れ! ライブラリアウトで敗北',
    )
  }
  const [top, ...rest] = self.deck
  const drawn = lookupCard(state, top)
  return appendLog(
    updateSelf(state, (p) => ({ ...p, deck: rest, hand: [...p.hand, top] })),
    `ドロー: ${drawn?.name ?? '?'}`,
  )
}

// 召喚: 手札のモンスターを場の空きゾーンへ (表側攻撃表示)
// 失敗条件: 指定インスタンスが手札にない / 指定カードがモンスターでない / 場が満杯
export function summonMonster(state: GameState, handInstanceId: string): GameState {
  const { self } = state
  const handIdx = self.hand.findIndex((c) => c.instanceId === handInstanceId)
  if (handIdx === -1) {
    return appendLog(state, '召喚失敗: 指定カードが手札にありません')
  }

  const instance = self.hand[handIdx]
  const card = lookupCard(state, instance)
  if (!card || !isMonster(card)) {
    return appendLog(state, '召喚失敗: モンスターカードではありません')
  }

  const emptyIdx = self.monsterZones.findIndex((z) => z === null)
  if (emptyIdx === -1) {
    return appendLog(state, '召喚失敗: モンスターゾーンが満杯です')
  }

  const newHand = [...self.hand.slice(0, handIdx), ...self.hand.slice(handIdx + 1)]
  const newZones = self.monsterZones.slice()
  newZones[emptyIdx] = {
    instanceId: instance.instanceId,
    cardId: instance.cardId,
    position: 'face_up_attack',
    hasAttackedThisTurn: false,
    summonedThisTurn: true,
  }

  return appendLog(
    updateSelf(state, (p) => ({ ...p, hand: newHand, monsterZones: newZones })),
    `召喚: ${card.name} (ATK ${card.attack})`,
  )
}

// 直接攻撃: 相手フィールドが空のときだけ可能
// LP 0 で勝利
export function attackDirectly(state: GameState, fieldInstanceId: string): GameState {
  const pre = preflightAttack(state, fieldInstanceId)
  if (!pre.ok) return pre.state

  const opponentHasMonster = state.opponent.monsterZones.some((z) => z !== null)
  if (opponentHasMonster) {
    return appendLog(state, '攻撃失敗: 相手モンスターがいる場合は直接攻撃できません')
  }

  const { zoneIdx, attacker, card } = pre
  const damage = card.attack
  const newOpponentLp = Math.max(0, state.opponent.lp - damage)
  const newZones = state.self.monsterZones.slice()
  newZones[zoneIdx] = { ...attacker, hasAttackedThisTurn: true }

  let nextState: GameState = {
    ...state,
    self: { ...state.self, monsterZones: newZones },
    opponent: { ...state.opponent, lp: newOpponentLp },
  }
  nextState = appendLog(
    nextState,
    `直接攻撃: ${card.name} → ${damage} ダメージ (相手LP ${newOpponentLp})`,
  )

  if (newOpponentLp === 0) {
    nextState = appendLog({ ...nextState, winner: 'self' }, '相手LP 0 → 勝利!')
  }
  return nextState
}

// モンスター戦闘: 自分の場のモンスターで相手の場のモンスターに攻撃
// 戦闘判定は battle.ts の resolveBattle に委譲
// 破壊されたモンスターは墓地へ送る (自分/相手両方)
// 戦闘ダメージで自分/相手のLPを減らし、0なら決着
export function attackMonster(
  state: GameState,
  attackerInstanceId: string,
  targetInstanceId: string,
): GameState {
  const pre = preflightAttack(state, attackerInstanceId)
  if (!pre.ok) return pre.state

  const targetIdx = state.opponent.monsterZones.findIndex(
    (z) => z !== null && z.instanceId === targetInstanceId,
  )
  if (targetIdx === -1) {
    return appendLog(state, '攻撃失敗: 指定の相手モンスターが場にいません')
  }
  const target = state.opponent.monsterZones[targetIdx]!
  const targetCard = lookupCard(state, target)
  if (!targetCard || !isMonster(targetCard)) {
    return appendLog(state, '攻撃失敗: 相手カードのマスタ情報が不正')
  }

  const { zoneIdx, attacker, card: attackerCard } = pre
  const result = resolveBattle(attackerCard, targetCard, target.position)

  // 自分側ゾーン更新
  const newSelfZones = state.self.monsterZones.slice()
  const newSelfGraveyard = [...state.self.graveyard]
  if (result.destroyedAttacker) {
    newSelfZones[zoneIdx] = null
    newSelfGraveyard.push({ instanceId: attacker.instanceId, cardId: attacker.cardId })
  } else {
    newSelfZones[zoneIdx] = { ...attacker, hasAttackedThisTurn: true }
  }

  // 相手側ゾーン更新
  const newOppZones = state.opponent.monsterZones.slice()
  const newOppGraveyard = [...state.opponent.graveyard]
  if (result.destroyedDefender) {
    newOppZones[targetIdx] = null
    newOppGraveyard.push({ instanceId: target.instanceId, cardId: target.cardId })
  }

  const newSelfLp = Math.max(0, state.self.lp - result.damageToAttackerPlayer)
  const newOppLp = Math.max(0, state.opponent.lp - result.damageToDefenderPlayer)

  let nextState: GameState = {
    ...state,
    self: {
      ...state.self,
      monsterZones: newSelfZones,
      graveyard: newSelfGraveyard,
      lp: newSelfLp,
    },
    opponent: {
      ...state.opponent,
      monsterZones: newOppZones,
      graveyard: newOppGraveyard,
      lp: newOppLp,
    },
  }
  nextState = appendLog(nextState, result.summary)
  if (result.damageToAttackerPlayer > 0) {
    nextState = appendLog(nextState, `自分LP ${newSelfLp}`)
  }
  if (result.damageToDefenderPlayer > 0) {
    nextState = appendLog(nextState, `相手LP ${newOppLp}`)
  }

  // 決着判定 (両方0なら引き分け、片方なら勝敗)
  if (newSelfLp === 0 && newOppLp === 0) {
    nextState = appendLog({ ...nextState, winner: 'draw' }, '両者LP 0 → 引き分け')
  } else if (newOppLp === 0) {
    nextState = appendLog({ ...nextState, winner: 'self' }, '相手LP 0 → 勝利!')
  } else if (newSelfLp === 0) {
    nextState = appendLog({ ...nextState, winner: 'opponent' }, '自分LP 0 → 敗北...')
  }
  return nextState
}

// フェイズ進行: 次のフェイズへ。endの次は新ターンのdraw
// 新ターン突入時に攻撃済みフラグをリセット
export function advancePhase(state: GameState): GameState {
  if (state.winner !== null) {
    return state // 決着後は何もしない
  }

  const after = nextPhase(state.phase)

  // end → draw (新ターン)
  if (state.phase === 'end' && after === 'draw') {
    const refreshed: PlayerState = {
      ...state.self,
      monsterZones: refreshMonsterTurnFlags(state.self.monsterZones),
    }
    const nextTurn = state.turn + 1
    return appendLog(
      { ...state, self: refreshed, phase: after, turn: nextTurn },
      `── ターン${nextTurn} 開始 ──`,
    )
  }

  return appendLog({ ...state, phase: after }, `フェイズ: ${after}`)
}
