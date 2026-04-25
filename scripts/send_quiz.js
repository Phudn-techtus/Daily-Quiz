/**
 * send_quiz.js
 * Picks a random unused question from daily_quiz_slack.json,
 * posts it to Slack, then replies with the answer in the thread after a delay.
 *
 * Required env vars:
 *   SLACK_BOT_TOKEN   - xoxb-... (Bot User OAuth Token)
 *   SLACK_CHANNEL_ID  - e.g. C0XXXXXXXXX (not the name, the ID)
 *   ANSWER_DELAY_MS   - optional, default 4 hours (14400000 ms)
 *                       Set to 60000 (1 min) for quick testing
 */

const fs   = require("fs");
const path = require("path");

const QUIZ_FILE  = path.join(__dirname, "../daily_quiz_slack.json");
const STATE_FILE = path.join(__dirname, "../used_ids.json");
const SLACK_API  = "https://slack.com/api/chat.postMessage";

// ─── helpers ────────────────────────────────────────────────────────────────

function loadJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function slackPost(token, payload) {
  const res = await fetch(SLACK_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`Slack API error: ${json.error}`);
  return json;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── pick question ───────────────────────────────────────────────────────────

function pickQuestion(questions, usedIds) {
  const available = questions.filter((q) => !usedIds.includes(q.id));

  // Reset khi đã dùng hết tất cả câu
  if (available.length === 0) {
    console.log("♻️  All questions used — resetting pool.");
    return questions[Math.floor(Math.random() * questions.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

// ─── build Block Kit blocks ──────────────────────────────────────────────────

function buildQuestionBlocks(q) {
  const letters = ["A", "B", "C", "D"];
  const optLines = q.options
    .map((opt, i) => `*${letters[i]}.* ${opt}`)
    .join("\n");

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🧠 Daily Quiz — ${q.topic_label} (${q.level_label})`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${q.question}*` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: optLines },
    },
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "💬 React với A / B / C / D trong thread · Đáp án sẽ được reveal sau 4 giờ ⏳",
        },
      ],
    },
  ];
}

function buildAnswerBlocks(q) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `✅ *Đáp án: ${q.answer_letter} — ${q.answer_text}*\n\n💡 ${q.explanation}`,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `_Topic: ${q.topic_label} · Level: ${q.level_label} · ID: ${q.id}_` },
      ],
    },
  ];
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const token     = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;
  const delayMs   = parseInt(process.env.ANSWER_DELAY_MS ?? "14400000", 10); // default 4h

  if (!token)     throw new Error("Missing env: SLACK_BOT_TOKEN");
  if (!channelId) throw new Error("Missing env: SLACK_CHANNEL_ID");

  // Load data
  const { questions } = loadJSON(QUIZ_FILE, { questions: [] });
  const usedIds       = loadJSON(STATE_FILE, []);

  if (!questions.length) throw new Error("No questions found in quiz JSON.");

  // Pick a question
  const quiz = pickQuestion(questions, usedIds);
  console.log(`📋 Selected: [${quiz.id}] ${quiz.question.slice(0, 60)}...`);

  // ── STEP 1: Post question ─────────────────────────────────────────────────
  console.log("📤 Posting question to Slack...");
  const postRes = await slackPost(token, {
    channel: channelId,
    blocks:  buildQuestionBlocks(quiz),
    text:    `🧠 Daily Quiz — ${quiz.topic_label}: ${quiz.question}`, // fallback for notifications
  });

  const threadTs = postRes.ts;
  console.log(`✅ Question posted. thread_ts = ${threadTs}`);

  // ── Save used ID immediately after post ────────────────────────────────────
  const updatedIds = [...new Set([...usedIds, quiz.id])];
  fs.writeFileSync(STATE_FILE, JSON.stringify(updatedIds, null, 2));
  console.log(`💾 Saved used_ids.json (${updatedIds.length}/${questions.length} used)`);

  // ── STEP 2: Wait then post answer in thread ───────────────────────────────
  const delayMin = Math.round(delayMs / 60000);
  console.log(`⏳ Waiting ${delayMin} minute(s) before revealing answer...`);
  await sleep(delayMs);

  console.log("📤 Posting answer to thread...");
  await slackPost(token, {
    channel:   channelId,
    thread_ts: threadTs,
    blocks:    buildAnswerBlocks(quiz),
    text:      `✅ Đáp án: ${quiz.answer_letter} — ${quiz.answer_text}`,
  });

  console.log("🎉 Done! Answer posted in thread.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
