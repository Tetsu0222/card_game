# Card Game (React + Express + PostgreSQL + Docker)

初代遊戯王DM1相当のスコープで開発するカードゲーム学習プロジェクト。

## 構成

```
cardgame_React/
├── docker-compose.yml      # frontend / backend / db / pgadmin
├── .env.example            # 環境変数テンプレート (.env はgit管理外)
├── frontend/               # Vite + React + TypeScript
├── backend/                # Express + pg (TypeScript)
└── db/init/                # PostgreSQL 初期化スクリプト
```

### ネットワーク構成

```
ブラウザ ──HTTP──▶ Vite (5173) ──/api proxy──▶ Backend (3001) ──pg──▶ PostgreSQL (5432)
```

ブラウザはVite (5173) しか直接見ないため、CORSを意識せず開発できる。
DB接続情報はbackend内に閉じているのでブラウザに露出しない。

## 初回セットアップ

```powershell
# .env を作成
cp .env.example .env

# 全コンテナ起動
docker compose up -d
```

初回は frontend / backend で `npm install` が走るため数分かかる。

## アクセス先

| サービス     | URL                        | 認証情報                              |
| ------------ | -------------------------- | ------------------------------------- |
| Frontend     | http://localhost:5173      | -                                     |
| Backend API  | http://localhost:3001      | `/health`, `/api/cards`               |
| PostgreSQL   | localhost:5432             | `.env` 参照                            |
| pgAdmin      | http://localhost:5050      | `.env` 参照                            |

### 動作確認

```powershell
# バックエンド単体ヘルスチェック (DB疎通も同時に確認)
curl http://localhost:3001/health
# => { "status": "ok", "db": true }

# カード一覧
curl http://localhost:3001/api/cards
```

## 停止

```powershell
docker compose down            # コンテナ停止 (DBデータは残る)
docker compose down -v         # ボリュームも削除 (DB初期化したいとき)
```

## DBスキーマを変更したいとき

`db/init/*.sql` は **空の状態の db_data ボリュームにしか流れない** ため、スキーマ変更後は:

```powershell
docker compose down -v
docker compose up -d
```

## 開発スコープ (初代遊戯王DM1相当)

- モンスター: 攻撃力/守備力で殴り合う
- 魔法: 単発効果のみ (回復/全体破壊/ドロー など)
- 融合: 素材2枚固定のマッピング

罠カード / 効果モンスター / シンクロ以降は対象外 (次回作)。
