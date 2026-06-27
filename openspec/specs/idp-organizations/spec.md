# idp-organizations

## Purpose

IdP側で組織（organization）をモデル化し、1ユーザーが複数組織に異なるロールで所属できる状態をデータとして保持する。組織・所属はseedで投入し、組織管理用のUI/APIは公開しない。

## Requirements

### Requirement: 組織データモデル

IdPはBetter Authの`organization`プラグインを有効化し、`organization`・`member`・`invitation`のデータを永続化できなければならない（MUST）。teams関連のテーブル（team / teamMember / organizationRole）は導入しない（SHALL NOT）。

#### Scenario: プラグイン有効化でスキーマが生成される

- **WHEN** IdPで`organization`プラグインを有効化しマイグレーションを生成・適用する
- **THEN** `organization`・`member`・`invitation`テーブルが作成され、`session`に`activeOrganizationId`カラムが追加される
- **AND** team / teamMember / organizationRole テーブルは作成されない

#### Scenario: 既存の認証フローが維持される

- **WHEN** `organization`プラグイン導入後にユーザーがログイン・SSO・ログアウトを行う
- **THEN** 既存のOIDC/SSOフローは従来通り成功する

### Requirement: 複数組織への所属

1人のユーザーが複数の組織にメンバーとして所属できなければならない（MUST）。各メンバーシップはロール（owner / admin / member）を持つ。

#### Scenario: 1ユーザーが複数組織に所属する

- **WHEN** あるユーザーが2つ以上の組織のメンバーとして登録される
- **THEN** それぞれの組織に対するメンバーシップが、各組織ごとのロール付きで保持される

### Requirement: 組織・所属のシード

IdPは組織とメンバーシップを投入するシードスクリプトを提供しなければならない（MUST）。シードデータには、1ユーザーが複数組織に所属するケースを含めなければならない（MUST）。組織管理用のUIやAPIは提供しない（SHALL NOT）。

#### Scenario: シード実行で組織と所属が投入される

- **WHEN** 組織シードスクリプトを実行する
- **THEN** 複数の組織と、ユーザーの所属（複数所属を含む）がロール付きで作成される

#### Scenario: 組織管理UIは存在しない

- **WHEN** IdPの公開ルートを確認する
- **THEN** 組織の作成・招待・メンバー管理を行うUIやエンドポイントは公開されていない
