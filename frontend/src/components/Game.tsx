import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { fetchCards } from '../api/cards'
import { isMonster, type Card } from '../types/card'
import { lookupCard, type GameState, type MonsterOnField } from '../types/game'
import { gameReducer } from '../game/reducer'
import { setupGame } from '../game/setup'
import './Game.css'

export function Game() {
  const [initialState, setInitialState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCards()
      .then((cards) => setInitialState(setupGame(cards)))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'unknown error'),
      )
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>読み込み中...</p>
  if (error) return <p className="error">エラー: {error}</p>
  if (!initialState) return null

  return <GameInner initial={initialState} />
}

function GameInner({ initial }: { initial: GameState }) {
  const [state, dispatch] = useReducer(gameReducer, initial)

  // ログを末尾までスクロール
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [state.log])

  const canDraw = state.phase === 'draw' && state.winner === null
  const canSummon = state.phase === 'main' && state.winner === null
  // 先攻1ターン目はバトルフェイズに入っても攻撃不可
  const isFirstTurnGoingFirst = state.turn === 1 && state.activePlayer === 'self'
  const canAttack = state.phase === 'battle' && state.winner === null && !isFirstTurnGoingFirst

  // 手札のカード詳細をマスタから引いておく (再描画で都度引かない用)
  const handDetails = useMemo(
    () =>
      state.self.hand.map((inst) => ({
        instance: inst,
        card: lookupCard(state, inst),
      })),
    [state.self.hand, state.cardMaster, state],
  )

  return (
    <div className="game">
      {/* 相手側 */}
      <PlayerHeader name={state.opponent.name} lp={state.opponent.lp} />
      <FieldRow zones={state.opponent.monsterZones} cardMaster={state.cardMaster} />

      <hr className="midline" />

      {/* 自分側 */}
      <FieldRow
        zones={state.self.monsterZones}
        cardMaster={state.cardMaster}
        onAttack={canAttack ? (id) => dispatch({ type: 'ATTACK_DIRECT', instanceId: id }) : undefined}
      />
      <PlayerHeader name={state.self.name} lp={state.self.lp} />

      {/* 操作パネル */}
      <div className="controls">
        <div className="status">
          ターン: {state.turn} / フェイズ: <strong>{state.phase}</strong>
          {isFirstTurnGoingFirst && state.phase === 'battle' && (
            <span className="note"> / 先攻1ターン目は攻撃不可</span>
          )}
          {state.winner !== null && (
            <span className="winner">
              {' '}
              / 決着: {state.winner === 'self' ? '勝利!' : state.winner === 'opponent' ? '敗北...' : '引分'}
            </span>
          )}
        </div>
        <div className="buttons">
          <button onClick={() => dispatch({ type: 'DRAW' })} disabled={!canDraw}>
            ドロー
          </button>
          <button onClick={() => dispatch({ type: 'ADVANCE_PHASE' })} disabled={state.winner !== null}>
            次のフェイズへ
          </button>
        </div>
      </div>

      {/* 手札 */}
      <h3>手札 ({state.self.hand.length})</h3>
      <ul className="hand">
        {handDetails.map(({ instance, card }) => {
          if (!card) return null
          const summonable = canSummon && isMonster(card)
          return (
            <li key={instance.instanceId} className="hand-card">
              <div className="name">{card.name}</div>
              {isMonster(card) ? (
                <div className="info">
                  {card.attribute} / Lv{card.level}
                  <br />
                  ATK {card.attack} / DEF {card.defense}
                </div>
              ) : (
                <div className="info">魔法</div>
              )}
              {summonable && (
                <button
                  onClick={() => dispatch({ type: 'SUMMON', instanceId: instance.instanceId })}
                >
                  召喚
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {/* ログ */}
      <h3>進行ログ</h3>
      <div className="log" ref={logRef}>
        {state.log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )
}

function PlayerHeader({ name, lp }: { name: string; lp: number }) {
  return (
    <div className="player-header">
      <span className="name">{name}</span>
      <span className="lp">LP: {lp}</span>
    </div>
  )
}

function FieldRow({
  zones,
  cardMaster,
  onAttack,
}: {
  zones: readonly (MonsterOnField | null)[]
  cardMaster: ReadonlyMap<number, Card>
  onAttack?: (instanceId: string) => void
}) {
  return (
    <ul className="field-row">
      {zones.map((m, i) => {
        if (m === null) {
          return <li key={i} className="zone empty">空</li>
        }
        const card = cardMaster.get(m.cardId)
        if (!card || !isMonster(card)) {
          return <li key={i} className="zone">?</li>
        }
        const cannotAttackReason = m.hasAttackedThisTurn
          ? '攻撃済'
          : m.summonedThisTurn
            ? '召喚酔い'
            : null
        return (
          <li key={i} className="zone occupied">
            <div className="name">{card.name}</div>
            <div className="atk">ATK {card.attack}</div>
            {onAttack && (
              <button
                onClick={() => onAttack(m.instanceId)}
                disabled={cannotAttackReason !== null}
              >
                {cannotAttackReason ?? '直接攻撃'}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
