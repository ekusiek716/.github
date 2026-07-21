import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../.github/workflows/codex-review-receipt.yml", import.meta.url),
  "utf8",
);
const marker = "          script: |\n";
const start = workflow.indexOf(marker);
assert.notEqual(start, -1, "github-script block is missing");
const script = workflow
  .slice(start + marker.length)
  .split("\n")
  .map((line) => line.replace(/^ {12}/, ""))
  .join("\n");
const runWorkflow = new Function(
  "github",
  "context",
  "core",
  "process",
  `return (async () => { ${script} })();`,
);

async function scenario({ reactionsByComment = {}, permissions = {} } = {}) {
  const failed = [];
  const summaries = [];
  const review = {
    id: 10,
    user: { login: "chatgpt-codex-connector[bot]" },
    commit_id: "head-sha",
    submitted_at: "2026-07-22T00:01:00Z",
  };
  const findings = [
    {
      id: 101,
      user: review.user,
      pull_request_review_id: review.id,
      path: "src/a.ts",
      line: 12,
      html_url: "https://example.test/finding/101",
    },
    {
      id: 102,
      user: review.user,
      pull_request_review_id: review.id,
      path: "src/b.ts",
      line: 24,
      html_url: "https://example.test/finding/102",
    },
  ];
  const github = {
    paginate: (operation, input) => operation(input),
    rest: {
      pulls: {
        get: async () => ({ data: { head: { sha: "head-sha" } } }),
        listReviews: async () => [review],
        listReviewComments: async () => findings,
      },
      reactions: {
        listForPullRequestReviewComment: async ({ comment_id }) =>
          reactionsByComment[comment_id] ?? [],
        listForIssue: async () => [],
      },
      repos: {
        getCollaboratorPermissionLevel: async ({ username }) => ({
          data: { permission: permissions[username] ?? "read" },
        }),
      },
    },
  };
  const summary = {
    addHeading(value) {
      summaries.push(value);
      return this;
    },
    addRaw(value) {
      summaries.push(value);
      return this;
    },
    async write() {},
  };
  const core = {
    summary,
    info() {},
    setFailed(message) {
      failed.push(message);
    },
  };
  const context = {
    repo: { owner: "owner", repo: "repo" },
    payload: {
      pull_request: {
        number: 1,
        head: { sha: "head-sha" },
        updated_at: "2026-07-22T00:00:00Z",
        html_url: "https://example.test/pr/1",
      },
    },
  };

  await runWorkflow(github, context, core, {
    env: {
      RECEIPT_TIMEOUT_MINUTES: "1",
      RECEIPT_POLL_INTERVAL_SECONDS: "10",
    },
  });
  return { failed, summary: summaries.join("\n") };
}

const reaction = (login) => ({
  content: "-1",
  created_at: "2026-07-22T00:02:00Z",
  user: { login },
});

{
  const result = await scenario();
  assert.equal(result.failed.length, 1);
  assert.match(result.failed[0], /2 non-adjudicated/);
}

{
  const result = await scenario({
    reactionsByComment: { 101: [reaction("reader")] },
    permissions: { reader: "read" },
  });
  assert.equal(result.failed.length, 1);
  assert.match(result.summary, /2 blocking/);
}

{
  const result = await scenario({
    reactionsByComment: {
      101: [reaction("maintainer")],
      102: [reaction("maintainer")],
    },
    permissions: { maintainer: "maintain" },
  });
  assert.deepEqual(result.failed, []);
  assert.match(result.summary, /0 blocking \/ 2 total/);
  assert.match(result.summary, /maintainer-disputed by @maintainer/);
}

{
  const result = await scenario({
    reactionsByComment: {
      101: [reaction("automation[bot]")],
      102: [reaction("writer")],
    },
    permissions: { "automation[bot]": "admin", writer: "write" },
  });
  assert.equal(result.failed.length, 1);
  assert.match(result.summary, /1 blocking \/ 2 total/);
}

console.log("codex-review-receipt scenarios passed");
