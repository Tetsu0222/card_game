// 戦闘判定: 攻撃側 vs 防御側のATK/DEFを比較して結果を返す純粋関数
// state を持たず、入力(攻撃側カード/防御側カード/位置)→出力(結果) に閉じることで
// テスト容易性と再利用性を確保する
//
// 切り出し意図:
//  - CPU実装時に「最良の攻撃対象を選ぶ」ロジックでも resolveBattle を再利用したい
//  - 効果モンスター実装時に「戦闘の前後」にフックを差し込みやすい構造を保つ
//  - actions.ts はあくまでも state 更新の場、battle.ts は判定の場、と責務を分離

import type { MonsterCard } from '../types/card'
import type { MonsterPosition } from '../types/game'

// 戦闘結果
//   destroyedAttacker / destroyedDefender: それぞれ破壊されたか
//   damageToAttackerPlayer / damageToDefenderPlayer: 各プレイヤーが受けるLPダメージ
export interface BattleResult {
  readonly destroyedAttacker: boolean
  readonly destroyedDefender: boolean
  readonly damageToAttackerPlayer: number
  readonly damageToDefenderPlayer: number
  readonly summary: string  // 進行ログ表示用の1行
}

export function resolveBattle(
  attacker: MonsterCard,
  defender: MonsterCard,
  defenderPosition: MonsterPosition,
): BattleResult {
  // 攻撃側は常に攻撃表示前提 (current スコープでは召喚=攻撃表示のみ)
  // 防御側の表示形式で分岐

  if (defenderPosition === 'face_up_attack') {
    return resolveAttackVsAttack(attacker, defender)
  }
  // face_up_defense / face_down_defense は防御側の DEF と比較
  // (face_down は本来攻撃時に表になるが、結果計算上は同じ)
  return resolveAttackVsDefense(attacker, defender)
}

function resolveAttackVsAttack(
  attacker: MonsterCard,
  defender: MonsterCard,
): BattleResult {
  const diff = attacker.attack - defender.attack

  if (diff > 0) {
    return {
      destroyedAttacker: false,
      destroyedDefender: true,
      damageToAttackerPlayer: 0,
      damageToDefenderPlayer: diff,
      summary: `${attacker.name} が ${defender.name} を破壊 (${diff} ダメージ)`,
    }
  }
  if (diff < 0) {
    return {
      destroyedAttacker: true,
      destroyedDefender: false,
      damageToAttackerPlayer: -diff,
      damageToDefenderPlayer: 0,
      summary: `${attacker.name} は ${defender.name} に返り討ち (${-diff} ダメージ)`,
    }
  }
  // 同値: 両方破壊、ダメージなし
  return {
    destroyedAttacker: true,
    destroyedDefender: true,
    damageToAttackerPlayer: 0,
    damageToDefenderPlayer: 0,
    summary: `${attacker.name} と ${defender.name} は相打ち`,
  }
}

function resolveAttackVsDefense(
  attacker: MonsterCard,
  defender: MonsterCard,
): BattleResult {
  const diff = attacker.attack - defender.defense

  if (diff >= 0) {
    // ATK >= DEF: 守備モンスター破壊、ダメージなし (貫通効果は未実装)
    return {
      destroyedAttacker: false,
      destroyedDefender: true,
      damageToAttackerPlayer: 0,
      damageToDefenderPlayer: 0,
      summary: `${attacker.name} が守備表示の ${defender.name} を破壊`,
    }
  }
  // ATK < DEF: 攻撃側プレイヤーが差分ダメージ、守備モンスターは生存
  return {
    destroyedAttacker: false,
    destroyedDefender: false,
    damageToAttackerPlayer: -diff,
    damageToDefenderPlayer: 0,
    summary: `${attacker.name} は守備表示の ${defender.name} を抜けず (${-diff} ダメージ)`,
  }
}
