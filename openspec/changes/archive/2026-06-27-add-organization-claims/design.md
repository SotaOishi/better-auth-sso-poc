## Context

IdPはBetter Auth + `oauthProvider` + `jwt` + Drizzle/PostgreSQLで構成されたOIDCプロバイダ。App A / App Bは`genericOAuth`のOAuthクライアントで、それぞれ独立した`betterAuth`インスタンスを持つ。重要な現状制約として、**App A / App Bは`database`を設定しておらず、Better Authのin-memoryアダプタで動作する**（セッション・ユーザーはプロセスメモリ上、再起動で消える）。

App側は現在、IdPの`/api/auth/oauth2/userinfo`を`getUserInfo`から呼び、`sub / email / name / picture`の4項目だけをローカルユーザーへ写している。組織情報はこの経路に乗っていない。

oauth-providerプラグイン(v1.5.4)はclaimカスタマイズ用のフックを3つ持つ:
- `customUserInfoClaims({ user, scopes, jwt })` — `/userinfo`応答に追加
- `customIdTokenClaims({ user, scopes, metadata })` — id_tokenに追加（URIネームスペース推奨）
- `customAccessTokenClaims({ user, referenceId, scopes, ... })` — access tokenに追加

本設計は proposal.md の方針（IdPに組織を持たせ、所属一覧+roleをOIDC claimでAppへ伝搬。teamsなし、seedのみ、activeはApp側ローカル）を実装に落とすための技術判断をまとめる。

## Goals / Non-Goals

**Goals:**
- IdPに`organization`プラグインを導入し、1ユーザーが複数組織に所属できるデータモデルとseedを用意する。
- 独自OIDCスコープ`organizations`が付与されたときのみ、`/userinfo`に組織所属一覧（role付き）を含める。
- App A / App Bが組織一覧をログイン時スナップショットとして受け取り、保持・表示し、App単位でローカルなactive組織を選択できるようにする。
- 既存のSSO/OIDCフロー（ログイン・同意・SSO・ログアウト）を壊さない。

**Non-Goals:**
- teams / organizationRole（動的ロール）。
- 組織の作成・招待・メンバー管理のUIやAPI公開（seedのみ）。
- 所属情報のライブ再取得（ログイン後のリアルタイム同期）。
- IdPセッションの`activeOrganizationId`を介したactiveテナントの同期（App間でのactive共有）。

## Decisions

### 決定1: 伝搬経路は `customUserInfoClaims`（userinfo claim）

App側は既に`getUserInfo`でuserinfoを叩いているため、userinfo claimが最も改修が小さく素直。

- **代替: id_token claim** — 現状Appはid_tokenからユーザー属性を読んでおらず、新たな読み取り経路の追加が必要。採用しない。
- **代替: access token claim** — Appはaccess tokenをuserinfo取得に使うだけでデコードしていない。採用しない。

`customUserInfoClaims`内では`scopes`に`organizations`が含まれるときのみclaimを構築し、`user.id`をキーにadapterから`member`⋈`organization`を引いて一覧を生成する。これによりプラグインのロード順序や`activeOrganizationId`に依存しない。

### 決定2: claim形状は「所属組織一覧 + role」

`organizations: [{ id, slug, name, role }]` をリストで返す。

- 1ユーザー複数所属（multi-membership）をそのまま表現できる。
- IdPセッションの`activeOrganizationId`（セッション単位で1個）に依存しないため、**activeOrg × SSOの競合**（App AとApp Bで別orgを使いたい）を回避できる。
- **代替: activeな単一orgのみ** — IdPセッション1つにつきactiveが1個に固定され、App A/Bが同じorgに縛られる。今回の方針に反するため不採用。

### 決定3: 独自スコープ `organizations` でclaimをゲート

`oauthProvider`の`scopes`に`"organizations"`を追加し、App A/Bの`oauthConfig.scopes`にも追加する。claimはこのスコープが付与されたときのみ返す。Discovery（`/.well-known`）への露出は`advertisedMetadata`で任意に調整可能（必須ではない）。

### 決定4: App側の保持先は user の `additionalFields`

App A/Bのin-memory運用を踏まえ、Better Authの`user.additionalFields`に以下を追加する:
- `organizations`（JSON配列、ログイン時スナップショット）
- `activeOrganizationId`（App単位のローカル選択）

`genericOAuth`の`getUserInfo`が返したorg一覧を`mapProfileToUser`等でユーザーレコードへ反映し、**毎ログイン更新**する。home画面は`session.user`からこれらを読む。

- **代替: `customSession`プラグインで都度算出して注入** — Appに組織のソースが無く、結局スナップショットを別途保持する必要があり利点が薄い。
- **代替: App側に専用テーブルを作る** — in-memory運用のApp構成に対して過剰。POCでは不採用。

### 決定5: active選択はApp内エンドポイントで更新（スナップショット内に限定）

Appにactive組織を設定するルート/ハンドラを設け、`activeOrganizationId`をユーザーレコードに保存する。設定値は保持中のスナップショットに含まれる組織IDのみ許可（不正値を弾く）。App AとApp Bは各自のセッションを持つため独立に選択できる。

### 決定6: 組織・所属はseedスクリプトで投入

IdPの`src/scripts/`にseedを追加（既存`seed-clients.ts`に倣い、冪等に）。以下の確定データを投入する:

- **組織3つ**: Acme (`acme`) / Globex (`globex`) / Initech (`initech`)
- **ユーザーと所属（計4メンバーシップ）**:
  - `alice@example.com`: Acme=owner / Globex=admin / Initech=member（multi-membership＋複数ロールの実証）
  - `bob@example.com`: Acme=member のみ（単一所属の対照例）

手順: `auth.api.signUpEmail`でユーザー作成（存在時スキップ）→ `auth.api.createOrganization`で組織作成 → `auth.api.addMember`でrole付き所属を付与。これにより alice で「App A=Acme / App B=Globex」のApp間独立active選択も実証できる。

### 決定7: Discoveryは公開（A）。本当のアクセス制御はDiscoveryではない

`oauthProvider.scopes`に`"organizations"`を追加することで`/.well-known`の`scopes_supported`に自動掲載される（＝公開）。任意で`advertisedMetadata.claims_supported`に`"organizations"`を加えてclaimも公開する。`advertisedMetadata`での非公開化（隠蔽）は採用しない。

セキュリティ上の根拠: Discoveryメタデータは能力の広告であってアクセス境界ではない。スコープ名を隠してもアクセスは増減せず、security through obscurityにしかならない。組織所属（準PII）が実際に返るかは、Discovery掲載と独立した3ゲート — ①クライアントがそのスコープを要求可能であること、②ユーザー同意、③有効なaccess token — で決まり、`customUserInfoClaims`は当該ユーザーの所属のみを返す。

- **本来の制御点**: クライアント別のスコープ許可（`clientRegistrationAllowedScopes` / `clientRegistrationDefaultScopes` / クライアント個別`scopes`）と同意画面での可視化。組織情報を一部の信頼クライアントだけに限定したい場合はここで制御する。
- **POCの範囲**: 厳格なクライアント別制御は必須としないが、claimは`id/slug/name/role`に最小化し、隠蔽に頼らない方針を明記する。
- **代替: `advertisedMetadata`で隠す** — 実アクセス制御にならず、Discoveryが実態と乖離して観察性が下がるため不採用。

## Risks / Trade-offs

- **[スナップショットの陳腐化]** ログイン後にroleや所属が変わっても再ログインまでAppに反映されない → POCでは許容と明記。再ログインで更新される旨をドキュメント化。
- **[Appの永続性なし]** in-memoryアダプタのためApp再起動でセッション・active選択が消える → POCの想定挙動として許容。
- **[claimの肥大]** 多数所属時にuserinfo応答が大きくなる → 返却フィールドを`id/slug/name/role`に限定して最小化。
- **[プラグイン相互作用]** `organization`と`oauthProvider`の併用 → claimはフック内でadapterから直接取得し、`activeOrganizationId`等の暗黙状態に依存しないことで順序非依存にする。
- **[スコープ未付与時の挙動]** `organizations`スコープが無いクライアントには従来通りclaimを返さない → 既存App（スコープ追加前）との後方互換を維持。

## Migration Plan

1. IdP: `organization()`プラグイン追加後、`pnpm db:generate`で`organization`/`member`/`invitation`（+`session.activeOrganizationId`）のマイグレーションを生成し、`pnpm db:migrate`で適用。
2. IdP: seedスクリプトで組織・所属を投入。
3. App A/B: `additionalFields`追加（in-memoryのためマイグレーション不要）、`organizations`スコープ追加。
4. ロールバック: App側スコープを戻せばclaimは流れなくなる。IdP側はプラグイン/テーブルを残しても既存フローに影響しない（スコープ未要求なら無効）。

## Open Questions

（解消済み）

- ~~`advertisedMetadata`でDiscoveryに公開するか~~ → 決定7: 公開（A）。
- ~~seedデータの具体~~ → 決定6: Acme/Globex/Initech ＋ alice(3所属)/bob(1所属) で確定。
