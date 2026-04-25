# Daily QA Quiz — Slack Bot

Gửi 1 câu quiz ngẫu nhiên lên Slack mỗi sáng (thứ 2–6, 9:00 SA giờ VN).  
Sau 4 giờ, đáp án được reply tự động vào **thread** của câu hỏi đó.

Stack: **Node.js** · **GitHub Actions** (free) · **Slack Bot API** (free tier)

---

## Cấu trúc file

```
├── .github/workflows/
│   └── daily_quiz.yml      ← GitHub Actions workflow
├── scripts/
│   └── send_quiz.js        ← Script chính
├── daily_quiz_slack.json   ← Bank câu hỏi (55 questions)
├── used_ids.json           ← Track câu đã dùng (auto-updated)
└── README.md
```

---

## Setup (xem README hoặc theo hướng dẫn từng bước)

### Bước 1 — Tạo Slack App

1. Vào https://api.slack.com/apps → **Create New App** → **From scratch**
2. Đặt tên app (e.g. `QA Quiz Bot`) → chọn workspace

### Bước 2 — Cấp quyền cho Bot

1. Sidebar → **OAuth & Permissions** → **Bot Token Scopes** → Add:
   - `chat:write`
   - `chat:write.public` *(nếu muốn post vào channel không cần invite)*
2. Click **Install to Workspace** → Allow
3. Copy **Bot User OAuth Token** (`xoxb-...`)

### Bước 3 — Lấy Channel ID

1. Mở Slack → right-click channel → **View channel details**
2. Scroll xuống dưới → copy **Channel ID** (dạng `C0XXXXXXXXX`)
3. Invite bot vào channel: `/invite @QA Quiz Bot`

### Bước 4 — Lưu Secrets vào GitHub

Repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name        | Giá trị                     |
|--------------------|-----------------------------|
| `SLACK_BOT_TOKEN`  | `xoxb-xxxx-xxxx-xxxx`       |
| `SLACK_CHANNEL_ID` | `C0XXXXXXXXX`               |

### Bước 5 — Push code lên GitHub

```bash
git init
git add .
git commit -m "feat: daily quiz bot"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Bước 6 — Test thủ công

GitHub → tab **Actions** → **Daily QA Quiz** → **Run workflow** → đổi delay xuống `1` phút → **Run**

---

## Env variables

| Variable           | Bắt buộc | Mặc định    | Mô tả                              |
|--------------------|----------|-------------|------------------------------------|
| `SLACK_BOT_TOKEN`  | ✅       | —           | Bot OAuth Token                    |
| `SLACK_CHANNEL_ID` | ✅       | —           | ID của channel (#qa-daily-quiz)    |
| `ANSWER_DELAY_MS`  | ❌       | `14400000`  | Delay trước khi reveal answer (ms) |

---

## Tuỳ chỉnh lịch

Sửa `cron` trong `daily_quiz.yml`:

```yaml
# 9:00 SA thứ 2-6 giờ VN (UTC+7)
- cron: "0 2 * * 1-5"

# 8:30 SA mỗi ngày kể cả cuối tuần
- cron: "30 1 * * *"
```

Dùng https://crontab.guru để kiểm tra biểu thức cron.
