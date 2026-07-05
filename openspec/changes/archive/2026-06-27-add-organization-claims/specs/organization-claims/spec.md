## ADDED Requirements

### Requirement: organizations スコープ

IdPの`oauthProvider`は`organizations`スコープをサポートしなければならない（MUST）。このスコープは組織所属情報の伝搬を要求するクライアントが要求できる。

#### Scenario: クライアントが organizations スコープを要求する

- **WHEN** クライアントが認可リクエストで`organizations`スコープを含めて要求する
- **THEN** IdPはそのスコープを受理し、同意後にアクセストークンへ付与する

### Requirement: organizations userinfo claim

`organizations`スコープが付与されたアクセストークンで`/userinfo`が呼ばれた場合、IdPは`organizations` claimを応答に含めなければならない（MUST）。claimは、そのユーザーが所属する全組織を表すオブジェクトの配列であり、各要素は`id`・`slug`・`name`・`role`を含む。

#### Scenario: スコープ付きで所属一覧が返る

- **WHEN** `organizations`スコープを持つアクセストークンで`/userinfo`を呼ぶ
- **THEN** 応答に`organizations` claimが含まれ、ユーザーの全所属組織が`{ id, slug, name, role }`のリストとして返る

#### Scenario: 複数所属が全件返る

- **WHEN** 複数組織に所属するユーザーの`organizations` claimを取得する
- **THEN** 所属する全組織がそれぞれのロール付きで配列に含まれる

#### Scenario: スコープ未付与時は claim を返さない

- **WHEN** `organizations`スコープを持たないアクセストークンで`/userinfo`を呼ぶ
- **THEN** 応答に`organizations` claimは含まれない
- **AND** 既存の`sub`・`email`・`name`・`picture`等のclaimは従来通り返る

### Requirement: activeOrganizationId に依存しない

`organizations` claimの生成は、IdPセッションの`activeOrganizationId`に依存してはならない（SHALL NOT）。claimはユーザーIDをキーにメンバーシップを直接解決して構築される。

#### Scenario: active 状態に関わらず全件返る

- **WHEN** IdPセッションの`activeOrganizationId`が未設定または任意の値であるユーザーの`organizations` claimを取得する
- **THEN** active状態に関わらず全所属組織が返る
