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
| `pnpm seed:orgs` | E2E/手動確認用の組織・所属データを投入 |
| `pnpm clean` | ビルド成果物とnode_modulesを削除 |
| `pnpm test:e2e` | Playwright E2Eテスト実行 |
| `pnpm test:e2e:headed` | ブラウザ表示付きでE2Eテスト実行 |

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

### 組織データの投入（任意）

Organization claim の手動確認では、以下でサンプル組織・所属データを投入できます。

```bash
pnpm seed:orgs
```

投入されるユーザー:

| ユーザー | パスワード | 所属 |
|---------|------------|------|
| `alice@example.com` | `password1234` | Acme(owner) / Globex(admin) / Initech(member) |
| `bob@example.com` | `password1234` | Acme(member) |

> **Note**: `pnpm test:e2e` 実行時は Playwright の global setup がこの組織seedを自動実行します。手動確認する場合のみ上記コマンドを実行してください。

## OpenSpec ワークフロー

このリポジトリは `.claude/commands/opsx/*`、`.claude/skills/openspec-*`、`openspec/` により OpenSpec ベースの仕様駆動ワークフローを導入しています。

### OpenSpec CLI のインストール

OPSX コマンドや OpenSpec artifact を操作するには OpenSpec CLI が必要です。

```bash
pnpm install -g @fission-ai/openspec@latest
openspec --version
```

### 主なコマンド

| コマンド | 説明 |
|---------|------|
| `/opsx:explore` | 実装前の探索・調査 |
| `/opsx:propose <change>` | 変更提案・設計・タスクの作成 |
| `/opsx:apply <change>` | タスクに沿って実装 |
| `/opsx:sync <change>` | delta spec を `openspec/specs/` に同期 |
| `/opsx:archive <change>` | 完了した変更を archive へ移動 |

## 動作確認

### 全サービス起動

```bash
pnpm dev
```

### 手動SSOテスト

1. **App A** (https://a.localtest.me:3001) にアクセス
2. 「ログイン」をクリック → IdPにリダイレクト
3. IdPで新規登録またはログイン
4. App Aにログイン完了
5. **App B** (https://b.localtest.me:3002) にアクセス
6. 「ログイン」をクリック → IdPにリダイレクト
7. **IdPのログイン画面が表示されずに自動ログイン = SSO成功**

### E2Eテスト

Playwrightを使ったE2Eテストで、SSOフローを自動検証できます。

```bash
# 全サービスが起動した状態でテスト実行
pnpm test:e2e

# ブラウザ表示付きで実行（デバッグ用）
pnpm test:e2e:headed
```

テストシナリオ:

| テスト | 内容 |
|--------|------|
| 基本ログインフロー | App A → IdPログイン → 同意 → App A認証完了 |
| SSOクロスアプリ | App Aログイン後、App BでIdPログイン画面スキップで自動認証 |
| アプリレベルログアウト | App Aログアウト後もApp Bセッション維持、IdPセッションで再ログイン可能 |
| IdPレベルログアウト | IdPログアウト後、再ログイン時に認証情報の入力が必要 |

> **Note**: テスト初回実行時にグローバルセットアップでテストユーザーが自動作成されます。サーバーが起動していない場合は `webServer` 設定によりローカル/CIともに自動起動されます。すでに `pnpm dev` で起動済みの場合は既存サーバーを再利用します。
> Organization claim テストに必要な組織seedもグローバルセットアップで自動投入されます。

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
