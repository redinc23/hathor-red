const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const core = require("@actions/core");
const github = require("@actions/github");

const STATE_PATH = path.join(process.cwd(), ".github", "bug-to-issue-state.json");

function readJsonSafe(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function sha1(s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function normalizeSignature({ workflowName, jobName, stepName, topLine }) {
  const raw = [
    `workflow:${workflowName || "unknown"}`,
    `job:${jobName || "unknown"}`,
    `step:${stepName || "unknown"}`,
    `top:${(topLine || "unknown").slice(0, 160)}`
  ].join("|");
  return sha1(raw);
}

function formatIssueTitle({ workflowName, jobName, stepName }) {
  const parts = [workflowName, jobName, stepName].filter(Boolean);
  return `CI failing continuously: ${parts.join(" / ")}`.slice(0, 240);
}

function pickTopErrorLine(logText) {
  const lines = logText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const patterns = [
    /(^|\b)(error|failed|exception|traceback|fatal)\b/i,
    /\b(assert|expect|cannot|unable|undefined)\b/i
  ];

  for (const re of patterns) {
    const hit = lines.find(l => re.test(l));
    if (hit) return hit;
  }
  return lines[0] || "Unknown error";
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.OWNER;
  const repo = process.env.REPO;

  const runId = Number(process.env.RUN_ID);
  const conclusion = process.env.RUN_CONCLUSION;
  const runUrl = process.env.RUN_HTML_URL;
  const runName = process.env.RUN_NAME;
  const headBranch = process.env.RUN_HEAD_BRANCH;
  const headSha = process.env.RUN_HEAD_SHA;

  const thresholdFails = Number(process.env.THRESHOLD_FAILS || "3");
  const closeAfterSuccesses = Number(process.env.CLOSE_AFTER_SUCCESSES || "2");

  if (!token || !owner || !repo || !runId) {
    throw new Error("Missing required env vars (GITHUB_TOKEN/OWNER/REPO/RUN_ID).");
  }

  const octokit = github.getOctokit(token);

  const state = readJsonSafe(STATE_PATH, {
    version: 1,
    items: {}
  });

  const jobsResp = await octokit.rest.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
    per_page: 100
  });

  const jobs = jobsResp.data.jobs || [];
  core.info(`Found ${jobs.length} jobs in workflow run ${runId}. Conclusion: ${conclusion}`);

  const now = new Date().toISOString();
  const failingSignatures = new Set();

  async function ensureIssueForSignature(sig, meta, body, labels) {
    const existing = state.items[sig]?.issueNumber;

    if (existing) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: existing,
        body
      });
      return existing;
    }

    const title = formatIssueTitle(meta);
    const created = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels
    });

    return created.data.number;
  }

  async function closeIssue(issueNumber, commentBody) {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentBody
    });
    await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state: "closed"
    });
  }

  for (const job of jobs) {
    const jobConclusion = job.conclusion || "unknown";

    if (jobConclusion !== "failure") continue;

    let logText = "";
    try {
      const logs = await octokit.request("GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs", {
        owner,
        repo,
        job_id: job.id,
        headers: { accept: "application/vnd.github+json" }
      });

      if (typeof logs.data === "string") {
        logText = logs.data;
      } else if (Buffer.isBuffer(logs.data)) {
        const asString = logs.data.toString("utf8");
        if (asString.startsWith("PK")) {
          logText = "";
        } else {
          logText = asString;
        }
      } else {
        try {
          logText = Buffer.from(logs.data).toString("utf8");
          if (logText.startsWith("PK")) logText = "";
        } catch {
          logText = "";
        }
      }
    } catch (e) {
      core.warning(`Could not fetch logs for job ${job.name}: ${e.message}`);
    }

    const failedStep = (job.steps || []).find(s => s.conclusion === "failure");
    const stepName = failedStep?.name || "unknown-step";
    const topLine = logText ? pickTopErrorLine(logText) : "Job logs unavailable (zip/binary or fetch failed)";

    const meta = {
      workflowName: runName,
      jobName: job.name,
      stepName
    };

    const sig = normalizeSignature({ ...meta, topLine });
    failingSignatures.add(sig);

    const prev = state.items[sig] || {
      consecutiveFails: 0,
      consecutiveSuccesses: 0,
      issueNumber: null,
      lastSeenRunId: null,
      lastSeenAt: null,
      meta
    };

    prev.consecutiveFails += 1;
    prev.consecutiveSuccesses = 0;
    prev.lastSeenRunId = runId;
    prev.lastSeenAt = now;
    prev.meta = meta;

    state.items[sig] = prev;

    core.info(`Signature ${sig} fail count now ${prev.consecutiveFails} (threshold ${thresholdFails}).`);

    if (prev.consecutiveFails >= thresholdFails) {
      const labels = ["ci", "bug", "auto-created"];
      const body = [
        `Automated report: **continuous CI failure** detected.`,
        ``,
        `- Workflow: **${runName}**`,
        `- Branch: **${headBranch}**`,
        `- Job: **${job.name}**`,
        `- Step: **${stepName}**`,
        `- Run: ${runUrl}`,
        `- Commit: \`${headSha}\``,
        `- Consecutive fails: **${prev.consecutiveFails}**`,
        ``,
        `Top error signal:`,
        "```",
        topLine,
        "```",
        ``,
        `If this is flaky, consider quarantining the test or adding retries with backoff.`
      ].join("\n");

      const issueNumber = await ensureIssueForSignature(sig, meta, body, labels);
      prev.issueNumber = issueNumber;
      state.items[sig] = prev;
      core.info(`Issue ensured for signature ${sig}: #${issueNumber}`);
    }
  }

  if (conclusion === "success") {
    for (const [sig, item] of Object.entries(state.items)) {
      const sameWorkflow = item?.meta?.workflowName === runName;

      if (!sameWorkflow) continue;

      if (!failingSignatures.has(sig)) {
        item.consecutiveSuccesses = (item.consecutiveSuccesses || 0) + 1;
        item.consecutiveFails = 0;
        item.lastSeenRunId = runId;
        item.lastSeenAt = now;

        if (item.issueNumber && item.consecutiveSuccesses >= closeAfterSuccesses) {
          const comment = [
            `✅ CI is green again for **${item.consecutiveSuccesses}** consecutive runs.`,
            `Auto-closing this issue.`,
            `Latest run: ${runUrl}`
          ].join("\n");

          try {
            await closeIssue(item.issueNumber, comment);
            core.info(`Closed issue #${item.issueNumber} for signature ${sig}`);
            item.issueNumber = null;
          } catch (e) {
            core.warning(`Failed to close issue #${item.issueNumber}: ${e.message}`);
          }
        }

        state.items[sig] = item;
      }
    }
  }

  writeJson(STATE_PATH, state);
  core.info(`State written to ${STATE_PATH}`);
}

main().catch((err) => {
  core.setFailed(err.message);
});
