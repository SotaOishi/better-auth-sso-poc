# better-auth-sso-poc

Better Authで、OAuth 2.1 + OIDC互換のAuthorization Server / OIDC Provider（IdP）を構築し、複数アプリ間SSOを実現するPoC

## スクリプト

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 全アプリを並列起動 |
| `pnpm dev:idp` | IdPサーバーのみ起動 (https://auth.localtest.me:3000) |
| `pnpm dev:app-a` | App Aのみ起動 (https://a.localtest.me:3001) |
| `pnpm dev:app-b` | App Bのみ起動 (https://b.localtest.me:3002) |
| `pnpm build` | 全パッケージをビルド |
| `pnpm lint` | Biomeでコードチェック |
| `pnpm lint:fix` | Biomeで自動修正 |
| `pnpm format` | Biomeでフォーマット |
| `pnpm typecheck` | TypeScript型チェック |
| `pnpm db:generate` | Drizzleマイグレーション生成 |
| `pnpm db:migrate` | Drizzleマイグレーション実行 |
| `pnpm clean` | ビルド成果物とnode_modulesを削除 |

## プロジェクト構成

```
better-auth-sso-poc/
├── packages/
│   ├── idp/          # IdP Server (Better Auth + oauth-provider)
│   ├── app-a/        # Application A (OAuth Client)
│   ├── app-b/        # Application B (OAuth Client)
│   └── shared/       # 共有ユーティリティ
└── ...
```

## 事前インストール
- pnpm
- mkcert
- postgresql

## セットアップ

### 証明書の発行

```bash
mkcert -install
mkdir -p certs
mkcert -key-file certs/localtest.me-key.pem -cert-file certs/localtest.me-cert.pem \
  auth.localtest.me a.localtest.me b.localtest.me
```

> **Note**: `mkcert -install`でルートCAがインストールされます。devスクリプトは自動的に`NODE_EXTRA_CA_CERTS`を設定してNode.jsにこのCAを信頼させます。

### 依存関係のインストール

```bash
pnpm install
```

### 環境変数の設定

```bash
# ルートの .env
cp .env.example .env

# 各アプリの .env
cp packages/idp/.env.example packages/idp/.env
cp packages/app-a/.env.example packages/app-a/.env
cp packages/app-b/.env.example packages/app-b/.env
```

`.env` を編集（`SESSION_SECRET` は各アプリで別々の値を設定）

### データベースの準備

```bash
# PostgreSQLにデータベースを作成
createdb better_auth_sso_poc

# マイグレーション実行
pnpm db:migrate
```

### OAuthクライアントの登録

```bash
pnpm --filter @better-auth-sso-poc/idp run seed
```

出力されるClient IDとClient Secretを`.env`に設定。

## 動作確認

### 全サービス起動

```bash
pnpm dev
```

### SSOテスト

1. **App A** (https://a.localtest.me:3001) にアクセス
2. 「ログイン」をクリック → IdPにリダイレクト
3. IdPで新規登録またはログイン
4. App Aにログイン完了
5. **App B** (https://b.localtest.me:3002) にアクセス
6. 「ログイン」をクリック → IdPにリダイレクト
7. **IdPのログイン画面が表示されずに自動ログイン = SSO成功**

## IdP

### エンドポイント

| URL | 説明 |
|-----|------|
| https://auth.localtest.me:3000 | ホーム |
| https://auth.localtest.me:3000/login | ログイン |
| https://auth.localtest.me:3000/signup | 新規登録 |
| https://auth.localtest.me:3000/logout | ログアウト (`?redirect=` でリダイレクト先指定) |
| https://auth.localtest.me:3000/.well-known/openid-configuration | OIDC Discovery |
| https://auth.localtest.me:3000/api/auth/oauth2/authorize | 認可エンドポイント |
| https://auth.localtest.me:3000/api/auth/oauth2/token | トークンエンドポイント |
| https://auth.localtest.me:3000/api/auth/jwks | JWKS |


## App A / App B

### エンドポイント

| App | URL | 説明 |
|-----|-----|------|
| App A | https://a.localtest.me:3001 | ホーム (ログイン状態表示) |
| App A | https://a.localtest.me:3001/login | OAuth認証開始 |
| App A | https://a.localtest.me:3001/api/auth/oauth2/callback/idp | OAuthコールバック |
| App A | https://a.localtest.me:3001/logout | ログアウト |
| App B | https://b.localtest.me:3002 | ホーム (ログイン状態表示) |
| App B | https://b.localtest.me:3002/login | OAuth認証開始 |
| App B | https://b.localtest.me:3002/api/auth/oauth2/callback/idp | OAuthコールバック |
| App B | https://b.localtest.me:3002/logout | ログアウト |


### 認証フロー

1. `/login` - Better Authの `signInWithOAuth2` で認可URLを生成し、IdPの `/authorize` へリダイレクト
2. IdP - ログイン済みならログイン画面をスキップ (SSO)、未ログインならログイン画面を表示
3. `/api/auth/oauth2/callback/idp` - Better Authが認可コード交換とユーザー情報取得を実行
4. Better AuthのセッションCookieを発行し、ホームへリダイレクト

## 共有パッケージ (packages/shared)

### 提供機能

| 関数 | 説明 |
|------|------|
| `escapeHtml()` | HTMLエスケープ |
