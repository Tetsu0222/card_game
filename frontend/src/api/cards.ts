import type { Card } from '../types/card'

// API呼び出しはコンポーネントから直接 fetch せず、ここに集約する
// (テスト時のモック差し替えや、将来 React Query 等へ移行する際の起点)

export async function fetchCards(): Promise<Card[]> {
  const res = await fetch('/api/cards')
  if (!res.ok) {
    throw new Error(`failed to fetch cards: ${res.status}`)
  }
  // バックエンドは Card[] と同形で返す前提 (snake_case 揃え)
  return (await res.json()) as Card[]
}
