## Why

現在のIdPはユーザー認証は行うが、organization（組織）の概念を持たない。そのためOAuthクライアント（App A / App B）は、ユーザーがどの組織にどのロールで所属しているかを知ることができない。organization対応のSSOを実証するため、IdP側で組織をモデル化し、ユーザーの所属を標準的なOIDC claim経由で各Appに伝搬する。activeな組織の選択は各Appがローカルに行えるようにする。

## What Changes

- IdPにBetter Authの`organization`プラグインを導入し、`organization` / `member` / `invitation` を扱えるようにする（teamsは対象外）。
- 1人のユーザーが**複数の組織に所属**できる（multi-membership）。所属一覧をロール付きで全件Appへ伝搬する。
- IdPの`oauthProvider`に独自OIDCスコープ `organizations` を追加する。
- IdPで`customUserInfoClaims`を実装し、`organizations`スコープが付与されている場合に`/userinfo`応答へ `organizations` claim（`{ id, slug, name, role }` のリスト）を含める。
- 組織と所属はスクリプトでseedする（組織管理UIは設けない＝seedのみ）。
- App A / App B は `organizations` スコープを要求し、ログイン時に `organizations` claim を受け取り、**ログイン時スナップショット**としてAppセッションに保持する。
- App A / App B は所属組織の一覧を表示し、各App自身のセッションに保持する**ローカルなactive組織**を選択できる（App AとApp Bは独立に選択可能）。

対象外: teams、組織の作成・招待UI、所属情報のライブ再取得、IdPセッションの`activeOrganizationId`を介したactiveテナントの同期。

## Capabilities

### New Capabilities
- `idp-organizations`: IdP側の組織データモデル（Better Auth organizationプラグインによる organization / member / invitation）と、組織・所属のseed。1ユーザーが複数組織に所属する構成をサポートする。
- `organization-claims`: ユーザーの組織所属をIdPからOAuthクライアントへ伝搬する仕組み。独自OIDCスコープ `organizations` と、それに対応する `organizations` userinfo claim を提供する。
- `app-organization-context`: App側での `organizations` claim の利用。ログイン時にスナップショットを受け取り、Appセッションに保持・表示し、App単位でローカルなactive組織を選択する。

### Modified Capabilities
<!-- なし: 既存のspecは存在しない。 -->

## Impact

- **IdP** (`packages/idp`): `src/auth.ts`（`organization()`プラグイン追加、`organizations`スコープ追加、`customUserInfoClaims`実装）、`src/db/schema.ts`（organization/member/invitationテーブル。`session.activeOrganizationId`はプラグインが追加するが依存しない）、新規Drizzleマイグレーション、`src/scripts/`配下の新規/拡張seedスクリプト。
- **Apps** (`packages/app-a`, `packages/app-b`): `src/config.ts`（`organizations`スコープ追加）、`src/auth.ts`（`getUserInfo`で`organizations` claim取得・セッションへ保持）、home画面（org一覧表示＋active組織セレクタ）、ローカルactive組織を設定するルート/ハンドラ。
- **依存関係**: Better Auth organizationプラグイン（`better-auth/plugins`に同梱）を利用。新規の外部パッケージは想定しない。
- **データベース**: スキーママイグレーションが必要（`pnpm db:generate` / `pnpm db:migrate`）。
