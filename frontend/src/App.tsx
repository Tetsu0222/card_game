import './App.css'
import { isMonster, type Card } from './types/card'

// DB接続前の暫定: ハードコードで型定義の動作確認
const sampleCards: Card[] = [
  {
    id: 1,
    name: 'ブラック・マジシャン',
    card_type: 'monster',
    attribute: '闇',
    race: '魔法使い族',
    level: 7,
    attack: 2500,
    defense: 2100,
    description: '魔法使い族の最強の使い手',
  },
  {
    id: 2,
    name: '青眼の白龍',
    card_type: 'monster',
    attribute: '光',
    race: 'ドラゴン族',
    level: 8,
    attack: 3000,
    defense: 2500,
    description: '伝説とまで言われた魔物',
  },
  {
    id: 3,
    name: '治療の神 ディアン・ケト',
    card_type: 'spell',
    effect_key: 'heal_1000',
    description: '自分のライフを1000ポイント回復',
  },
]

function App() {
  return (
    <div className="app">
      <h1>🃏 Card Game</h1>
      <p>カードマスタ (型定義の動作確認)</p>
      <ul className="card-list">
        {sampleCards.map((card) => (
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
    </div>
  )
}

export default App
