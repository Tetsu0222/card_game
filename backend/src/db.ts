import pg from 'pg'

// 接続情報は環境変数から取得 (.env / docker-compose で注入)
// プールにしておくと並行リクエストでもコネクションが枯渇しにくい
export const pool = new pg.Pool({
  host: process.env.DB_HOST ?? 'db',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'cardgame',
  password: process.env.DB_PASSWORD ?? 'cardgame_pass',
  database: process.env.DB_NAME ?? 'cardgame_db',
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err)
})
