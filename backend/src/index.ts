import express from 'express'
import { pool } from './db.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(express.json())

// ヘルスチェック: コンテナ起動 / DB疎通の両方を確認できる
app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT 1 AS ok')
    res.json({ status: 'ok', db: result.rows[0].ok === 1 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: 'ng', db: false })
  }
})

// カード一覧 (フロントの Card 型と1:1で返す)
app.get('/api/cards', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, card_type, attribute, race, level,
             attack, defense, effect_key, description
      FROM cards
      ORDER BY id
    `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'failed to fetch cards' })
  }
})

app.listen(PORT, () => {
  console.log(`backend listening on :${PORT}`)
})
