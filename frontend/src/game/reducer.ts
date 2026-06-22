import type { GameState } from '../types/game'
import {
  advancePhase,
  attackDirectly,
  attackMonster,
  drawCard,
  summonMonster,
} from './actions'

// useReducer 用ディスパッチ型
// 状態遷移は actions.ts の純粋関数に委譲し、reducer は薄いルーティング層
export type GameAction =
  | { type: 'DRAW' }
  | { type: 'SUMMON'; instanceId: string }
  | { type: 'ATTACK_DIRECT'; instanceId: string }
  | { type: 'ATTACK_MONSTER'; attackerInstanceId: string; targetInstanceId: string }
  | { type: 'ADVANCE_PHASE' }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'DRAW':
      return drawCard(state)
    case 'SUMMON':
      return summonMonster(state, action.instanceId)
    case 'ATTACK_DIRECT':
      return attackDirectly(state, action.instanceId)
    case 'ATTACK_MONSTER':
      return attackMonster(state, action.attackerInstanceId, action.targetInstanceId)
    case 'ADVANCE_PHASE':
      return advancePhase(state)
  }
}
