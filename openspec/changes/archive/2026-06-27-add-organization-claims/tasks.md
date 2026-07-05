## 1. IdP: organization プラグイン導入とスキーマ

- [x] 1.1 `packages/idp/src/auth.ts` に `organization()` プラグインを追加（teamsは有効化しない）
- [x] 1.2 `packages/idp/src/db/schema.ts` に organization / member / invitation テーブルと `session.activeOrganizationId` を反映（プラグイン生成スキーマに合わせる）
- [x] 1.3 `pnpm db:generate` でマイグレーションを生成し、`pnpm db:migrate` で適用
- [x] 1.4 既存のログイン・SSO・ログアウトが従来通り動作することを確認（E2E 6件通過）

## 2. IdP: 組織・所属のシード

- [x] 2.1 `packages/idp/src/scripts/` に組織シードスクリプトを追加（既存 `seed-clients.ts` に倣い冪等に）
- [x] 2.2 組織3つ（Acme=`acme` / Globex=`globex` / Initech=`initech`）を `auth.api.createOrganization` で作成
- [x] 2.3 ユーザーを `auth.api.signUpEmail` で作成（存在時スキップ）: `alice@example.com` / `bob@example.com`
- [x] 2.4 `auth.api.addMember` でrole付き所属を付与: alice(Acme=owner / Globex=admin / Initech=member)、bob(Acme=member)
- [x] 2.5 `package.json` にシード実行スクリプトを追加し、実行して組織・所属が投入されることを確認

## 3. IdP: organizations スコープと userinfo claim

- [x] 3.1 `oauthProvider` の `scopes` に `"organizations"` を追加
- [x] 3.2 `customUserInfoClaims` を実装し、`scopes` に `organizations` が含まれる場合のみ `user.id` から member⋈organization を解決して `organizations: [{ id, slug, name, role }]` を返す（`activeOrganizationId` に依存しない）
- [x] 3.3 スコープ付与時に `/userinfo` へ `organizations` claim が乗る正常経路をE2Eで確認（未付与時は `customUserInfoClaims` がコードでガード）
- [x] 3.4 Discoveryに公開（決定A）: `scopes_supported` に `organizations` を自動掲載（`scopes`追加で対応）。`advertisedMetadata.claims_supported` の明示上書きは標準claimを隠すリスクがあるため意図的にスキップ

## 4. App A / App B: スコープ要求と受信

- [x] 4.1 `packages/app-a/src/config.ts` と `packages/app-b/src/config.ts` の `oauthConfig.scopes` に `"organizations"` を追加
- [x] 4.2 `src/auth.ts` の `betterAuth` に `user.additionalFields`（`organizations`: JSON、`activeOrganizationId`: string）を追加
- [x] 4.3 `getUserInfo`（および `mapProfileToUser` 等）で `organizations` claim を取得し、ユーザーレコードへ毎ログイン反映（`overrideUserInfo: true`）

## 5. App A / App B: 表示と active 選択

- [x] 5.1 ホーム画面で所属組織一覧（ロール付き）と現在の active を表示
- [x] 5.2 active 組織を設定するルート/ハンドラを追加し、選択値をユーザー/セッションに保存（`/active-organization`）
- [x] 5.3 設定値がスナップショットに含まれる組織IDのみ許可するバリデーションを実装
- [x] 5.4 App A と App B で独立に active を選択できることを確認（E2E通過）

## 6. 検証

- [x] 6.1 複数組織に所属するシードユーザー(alice)でログインし、両Appで一覧が表示されることを確認（E2E通過）
- [x] 6.2 App A で Globex、App B で Initech を active に選び、互いに影響しないことを確認（E2E通過）
- [x] 6.3 `pnpm typecheck` / `pnpm lint` を通す
- [x] 6.4 既存E2E(6件)通過を確認し、組織伝搬E2E(`organization-claims.spec.ts`, 2件)を追加・通過
