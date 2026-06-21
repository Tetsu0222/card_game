import { useEffect, useState } from 'react'
import './App.css'
import { fetchCards } from './api/cards'
import { isMonster, type Card } from './types/card'

function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCards()
      .then(setCards)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'unknown error')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app">
      <h1>🃏 Card Game</h1>
      <p>カードマスタ (バックエンドAPI経由)</p>

      {loading && <p>読み込み中...</p>}
      {error && <p className="error">エラー: {error}</p>}

      {!loading && !error && (
        <ul className="card-list">
          {cards.map((card) => (
            <li key={card.id} className="card">
              <h3>{card.name}</h3>
              {isMonster(card) ? (
                <p>
                  {card.attribute} / {card.race} / Lv{card.level} /{' '}
                  <strong>
                    ATK {card.attack} / DEF {card.defense}
                  </strong>
                </p>
              ) : (
                <p>魔法 / 効果: {card.effect_key}</p>
              )}
              {card.description && <p className="desc">{card.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
