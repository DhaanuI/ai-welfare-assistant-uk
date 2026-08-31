# Decisions

## What I deliberately did not build

**Student accounts.** The brief says the chat page is public and contact details can
be collected in the conversation, so students are unauthenticated. Name and email are
taken up front and stored on the conversation; "multiple conversations" is handled
with a list of conversation IDs in the browser's `localStorage` rather than login.
Real auth is the right call in production (see the privacy answer in the README) but
it adds a whole surface — sessions, password reset, verification — that the graded
core doesn't need.

**A vector store / embeddings RAG pipeline.** The entire knowledge base is ~2,500
tokens. It fits in every prompt, so there is no context-window pressure for retrieval
to relieve. With ~13 documents, embedding similarity mostly adds miss-risk and a
tuning surface (chunk size, k, threshold) with no upside. Instead the triage step
classifies the message into a category and the reply step is grounded in that
category's resources, plus a one-line index of the whole library so the model can
redirect if the category was slightly off. The knowledge base lives in
`lib/knowledgeBase.ts` as typed data.

**Streaming replies, retries/queues, rate limiting, and tests beyond the two
probes.** All sensible, none load-bearing for a "working core built well" at this
scale. The reply is returned in one response; the model call has a timeout and a
single retry.

**Staff identity beyond a shared seeded login.** There is a `StaffUser` table and JWT
sessions, but no invite flow or SSO. Two staff users are seeded so the concurrent
claim can be demonstrated.

## A decision a reasonable engineer would make differently

**Validating the model's triage output with a Zod schema rather than a second
"judge" model call.** A second model pass could catch subtler mistakes — a
plausible-looking but wrong category, or a disposition that doesn't match the
reasoning. What it costs is latency (a second round-trip on every message), money
(double the token spend), and a second thing that can time out or fail. Given that
the house rules — crisis, immigration, harassment, injection, "KB can't answer" — are
enforced deterministically in code regardless of what the model says, the schema
check is enough to guarantee the output is *structurally* usable, and the code layer
guarantees it is *safe*. I'd revisit the judge call if we saw real misclassifications
that the deterministic rules didn't catch.

**Escalating on a model timeout instead of retrying harder.** One retry, then fall
back to a result that escalates. A longer retry budget would resolve more cases
automatically during a slow patch, at the cost of making a stressed student wait
10–20 seconds for a reply. A welfare desk should fail towards a human, so the wait
isn't worth it.

## What would break first

**Triage latency and model rate limits under real load.** The free Gemini tier has
low request-per-minute limits; a modest burst of students would start hitting 429s.
The fallback handles it safely — everything escalates — but the dashboard would flood
with cases that didn't need a human, which is its own failure on a welfare desk.

I'd know before a student told me because `TriageResult.modelOk` is stored on every
row: a dashboard count of `modelOk = false` over the last hour, alerting past a
threshold, shows the fallback firing in near real time. The fix is a request queue
with a concurrency cap and a paid model tier.

The second thing to watch is **grounding drift** — the model inventing a resource or
giving advice the library doesn't support. There's no automated catch for that yet;
in production I'd add a check that every link in a reply exists in the knowledge base
and sample replies for review.
