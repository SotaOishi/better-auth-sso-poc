## ADDED Requirements

### Requirement: organizations スコープの要求と受信

App A / App BはIdPへの認可リクエストで`organizations`スコープを要求し、ログイン時に`/userinfo`の`organizations` claimを受け取らなければならない（MUST）。

#### Scenario: ログイン時に所属一覧を受信する

- **WHEN** ユーザーがApp（AまたはB）にログインする
- **THEN** Appは`organizations`スコープを要求し、userinfoから`organizations` claim（所属組織一覧）を取得する

### Requirement: 所属一覧のスナップショット保持

Appは受信した組織一覧をログイン時スナップショットとして自身のユーザー/セッションに保持しなければならない（MUST）。スナップショットは毎ログイン時に更新される（MUST）。ログイン後のリアルタイム同期は行わない（SHALL NOT）。

#### Scenario: スナップショットを保持する

- **WHEN** Appがログイン時に`organizations` claimを受信する
- **THEN** その一覧をAppのユーザーレコード（または同等のセッション保持先）に保存する

#### Scenario: 再ログインで更新される

- **WHEN** IdP側で所属やロールが変わった後、ユーザーがAppへ再ログインする
- **THEN** Appが保持する一覧は最新のclaim内容で更新される

### Requirement: 所属一覧の表示

Appのホーム画面はログイン中ユーザーの所属組織一覧（ロールを含む）を表示しなければならない（MUST）。

#### Scenario: ホームで所属一覧が見える

- **WHEN** 所属を持つユーザーがAppのホーム画面を開く
- **THEN** 所属する組織がロール付きで一覧表示される

### Requirement: ローカルな active 組織の選択

Appは保持中のスナップショットの中から、App単位のローカルなactive組織を選択・保持できなければならない（MUST）。選択値はスナップショットに含まれる組織のみ許可され（MUST）、App AとApp Bは互いに独立して選択できる（MUST）。

#### Scenario: active 組織を選択して保持する

- **WHEN** ユーザーがAppで所属組織のひとつをactiveとして選択する
- **THEN** その選択がAppのセッションに保存され、以降の表示に反映される

#### Scenario: スナップショット外の組織は選択できない

- **WHEN** ユーザーが自身のスナップショットに含まれない組織IDをactiveに設定しようとする
- **THEN** Appはその設定を拒否する

#### Scenario: App ごとに独立して選択できる

- **WHEN** ユーザーがApp Aで組織Xを、App Bで組織Yをactiveに選択する
- **THEN** 各Appはそれぞれの選択を独立に保持し、互いに影響しない
