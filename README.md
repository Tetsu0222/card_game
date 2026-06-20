# Card Game (React + PostgreSQL + Docker)

## 構成

```
cardgame_React/
├── docker-compose.yml      # Docker構成 (frontend / db / pgadmin)
├── frontend/               # Vite + React + TypeScript
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig*.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.css
│       ├── index.css
│       └── vite-env.d.ts
└── db/
    └── init/
        └── 01_schema.sql   # 初回起動時に自動実行
```

## 起動方法

```powershell
docker compose up -d
```

初回起動時:
- frontend コンテナ内で `npm install` が走るため数分かかる
- db コンテナは `db/init/*.sql` を自動実行してテーブル作成 + サンプルデータ投入

## アクセス先

| サービス   | URL                        | 認証情報                              |
| ---------- | -------------------------- | ------------------------------------- |
| Frontend   | http://localhost:5173      | -                                     |
| PostgreSQL | localhost:5432             | user: `cardgame` / pass: `cardgame_pass` / db: `cardgame_db` |
| pgAdmin    | http://localhost:5050      | email: `admin@example.com` / pass: `admin` |

pgAdmin から DB へ接続するときのホストは `db` (コンテナ名)。

## 停止

```powershell
docker compose down            # コンテナ停止 (DBデータは残る)
docker compose down -v         # ボリュームも削除 (DB初期化したいとき)
```

## DBスキーマを変更したいとき

`db/init/*.sql` は **空の状態の db_data ボリュームにしか流れない** ので、スキーマ変更後は:

```powershell
docker compose down -v
docker compose up -d
```

## 次のステップ案

- バックエンド (Node.js/Express など) を追加して `pg` でDB接続
- カード一覧API → React側で取得して表示
- デッキ構築UI、対戦ロジック
