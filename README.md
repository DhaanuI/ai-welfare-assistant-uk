# Student Welfare Assistant

A chat assistant for student support. Students describe what's going on in plain
language. It answers routine questions on its own using a fixed set of official
guidance, asks a follow-up question when it needs more to go on, and hands off to a
real person when the situation actually needs one. Anything handed off shows up on a
staff dashboard, most urgent cases at the top.

## Stack

- Next.js 16 (App Router) + React 19
- PostgreSQL via Prisma, hosted on Neon
- Google Gemini (`gemini-flash-lite-latest`, set by `GEMINI_MODEL`) for classifying
  messages and writing replies
- `jose` for staff login tokens (JWT), `bcryptjs` for passwords
- Tailwind CSS

## How it works

```
student message
      │
      ▼
safety checks in plain code (crisis, danger, immigration, harassment,
prompt injection — see lib/safety.ts)
      │
      ▼
Gemini call → returns category, urgency, disposition as JSON
      │
      ▼
we validate that JSON, then apply the safety rules on top of it —
the AI doesn't get the final word, the code does
      │
      ├─ handle_now → answer the student using the knowledge base
      ├─ clarify    → ask a follow-up question, then re-check
      └─ escalate   → tell the student a person will follow up, open a
                       case, show 999 / Samaritans if there's any sign of danger
```

Every message, its triage result, and every reply gets saved to Postgres.

## Running it locally

1. `npm install`

2. Create a free Postgres database at [neon.tech](https://neon.tech) and copy the
   connection string.

3. Copy `.env.example` to `.env` and fill it in:

   ```
   DATABASE_URL=...            # Neon connection string
   GEMINI_API_KEY=...          # https://aistudio.google.com/apikey
   JWT_SECRET=...              # any long random string
   STAFF_EMAIL=staff@edin.world   # only used by `npm run seed` — see "Staff accounts"
   STAFF_PASSWORD=welfare123
   ```

4. ```bash
   npx prisma migrate dev
   npm run seed
   ```

5. ```bash
   npm run dev
   ```

   - Student chat: <http://localhost:3000/chat>
   - Staff dashboard: <http://localhost:3000/staff> — sign up at `/staff/signup`, or
     log in with the account `npm run seed` creates.

## Staff accounts

Anyone can sign up as staff right now at `/staff/signup` — name, work email,
password. That's fine for this assignment, but not for a real product, since anyone
with the link could then see every student's conversation. In production, a new
staff account would need approval from an existing admin before it could see
anything, or would be invited by email rather than signing up on its own.

`npm run seed` still creates two staff accounts, mainly so you can test two people
trying to claim the same case at the same time.

## Safety probes

```bash
npm run probe
```

Runs two checks and fails if either one doesn't hold:

- **Injection probe** — sends a message that tries to trick the assistant into
  marking itself resolved and low priority. That instruction should be ignored
  completely.
- **Crisis probe** — sends a message showing signs of crisis. It should always be
  escalated to a person, never closed with an automated reply.

Both call the real Gemini API, so `GEMINI_API_KEY` needs to be set to run them. I
wanted the probe to exercise the actual path a message takes, not a mocked-out
version of it. But every check inside the probe is against our own code, not the
AI's opinion — that's the part that actually has to be guaranteed.

## The three questions

**If this served 50 organisations and 10,000 conversations a day, what would you
change?**
Multiple organisations sharing one app, each with their own knowledge base and staff.
Once each org has a large knowledge base instead of our 13 documents, a proper vector
search starts to make sense — right now it doesn't, our knowledge base is too small
for it to help. I'd also put messages through a queue so one busy organisation can't
eat up all the AI capacity, and make sure a model outage degrades to "escalate
everything" instead of silently dropping messages.

**This is real students' personal and welfare data. What would you do differently
for privacy and safety in production?**
A few things, roughly in the order I'd worry about them:

- Staff access needs approval, not open signup.
- Conversations should be encrypted at rest, and deleted after some retention period
  instead of kept forever.
- Use a local, open-weight model (something like Llama) hosted on our own servers,
  instead of sending student data to a third-party AI company at all. Welfare data —
  mental health disclosures, immigration status — shouldn't leave our own
  infrastructure if we can help it. It costs more to run and the model quality is a
  step behind something like Gemini, which is why this build uses Gemini's free
  tier, but for real student data it's the better call.
- The public chat page needs rate limiting so it can't be spammed.

**In two or three sentences a non-technical colleague would understand, how does the
assistant decide what to answer itself and what to escalate?**
Every message is checked for anything about risk, safety, or someone trying to
manipulate the assistant — those always go to a person, no matter what. Otherwise the
AI decides: can it answer this from our official guidance, does it need to ask
something first, or is this actually a case for a person. If it's ever unsure, it
hands off rather than guessing.

## Deployment

Deployed on Vercel, using Neon for Postgres. The build step runs the database
migrations automatically. Set the same env vars in Vercel as you did locally, then
run `npm run seed` once against the live database.

See `DECISIONS.md` for what I left out on purpose, and why.
