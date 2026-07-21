# ekusiek716 shared GitHub workflows

`ekusiek716` 配下のリポジトリで共通利用する GitHub Actions workflow を管理します。

## Codex review receipt

`.github/workflows/codex-review-receipt.yml` は、ChatGPT Codex hosted review の完了を GitHub Actions の check として記録する再利用 workflow です。

- OpenAI / Anthropic の API key は使いません
- caller repository の短期 `GITHUB_TOKEN` だけを使います
- Codex の review / inline finding は pull request の現在の HEAD SHA と一致するものだけを受理します
- 指摘なしの `👍` は、PR event の更新時刻より新しく、待機中に HEAD が変わっていない場合だけ activity receipt として記録します
- Codexがトップレベル完了コメントを返す場合は、`Didn't find any major issues` と
  `Reviewed commit` の10桁以上のSHA prefixが現在HEADへ一致する場合だけ受理します
- Codex の inline finding がある場合は check を失敗させます
- 誤り・陳腐化・相互矛盾を人間が確認した指摘は、そのinline commentへリポジトリの
  `write` / `maintain` / `admin` 権限を持つ非botユーザーが 👎 を付けると
  `maintainer-disputed` として非ブロック化できます。権限のないユーザーやbotの反応では解除されません
- 制限時間内に完了証跡が無い場合や、待機中に HEAD が変わった場合も check を失敗させます
- pull request のコードは checkout・実行しません

caller repository には次の workflow を置きます。

```yaml
name: Codex Review Receipt

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read

jobs:
  receipt:
    if: github.event.pull_request.draft == false
    permissions:
      contents: read
      issues: read
      pull-requests: read
    # Pin the audited workflow; do not use the mutable v1 tag from private repos.
    uses: ekusiek716/.github/.github/workflows/codex-review-receipt.yml@632bee09e15c9a66ae154ba912bb22325de703be
```

Codex 側では対象 repository の **Automatic reviews** を有効にし、review trigger を **Every push** に設定します。

## Cost boundary

AI API の従量課金はありません。caller repository 側の GitHub-hosted runner 使用時間だけが GitHub Actions usage として計上されます。通常は Codex review 完了までの数分で終了し、既定15分・最大20分で失敗します。

GitHub の pull request reaction 自体には commit SHA がありません。そのため `👍` の成功は「そのPRで新しい Codex activity を観測した」という監査ログであり、現在 HEAD の厳密な承認証明ではありません。SHA に紐づく review finding は厳密に判定できますが、この check を唯一の merge gate にはしません。`timeout_minutes` の受理範囲は1〜20分、`poll_interval_seconds` は10〜60秒です。

👎 は「修正済み」の自動推測ではなく、人間による明示的な裁定です。同じ文面の指摘でも新しいHEADで再発している可能性があるため、過去HEADとの本文一致だけでは自動解除しません。workflow summaryには全指摘と、`blocking` / `maintainer-disputed` の状態、裁定者を残します。

caller、特に private repository からは、`v1` のような可変tagではなく、レビュー済みworkflowのfull commit SHAへ固定します。更新時は中央workflowのPRをレビュー・マージした後、caller側も別PRで新しいSHAへ更新します。

中央リポジトリの変更PRでは `codex-review-receipt-self-test.yml` が相対参照でPR自身の
reusable workflowを呼び、実際の `pull_request` payload・`GITHUB_TOKEN`・GitHub APIで
dogfoodする。このself-testが成功していないworkflow commitをcallerへ展開しない。
