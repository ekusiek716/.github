# ekusiek716 shared GitHub workflows

`ekusiek716` 配下のリポジトリで共通利用する GitHub Actions workflow を管理します。

## Codex review receipt

`.github/workflows/codex-review-receipt.yml` は、ChatGPT Codex hosted review の完了を GitHub Actions の check として記録する再利用 workflow です。

- OpenAI / Anthropic の API key は使いません
- caller repository の短期 `GITHUB_TOKEN` だけを使います
- pull request の現在の HEAD SHA に対する Codex review だけを受理します
- 指摘なしの `👍` は、PR event の更新時刻より新しいものだけを受理します
- Codex の inline finding がある場合は check を失敗させます
- 制限時間内に完了証跡が無い場合も check を失敗させます
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
    uses: ekusiek716/.github/.github/workflows/codex-review-receipt.yml@v1
```

Codex 側では対象 repository の **Automatic reviews** を有効にし、review trigger を **Every push** に設定します。

## Cost boundary

AI API の従量課金はありません。caller repository 側の GitHub-hosted runner 使用時間だけが GitHub Actions usage として計上されます。通常は Codex review 完了までの数分で終了し、最大10分で失敗します。
Shared GitHub workflow and repository guidance for ekusiek716 projects
