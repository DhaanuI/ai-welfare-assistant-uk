# Decisions

## What I didn't build, on purpose

**Student logins.** The brief wants the chat page public, so students don't log in —
they just give their name and email during the conversation. "Multiple
conversations" is handled by remembering conversation IDs in the browser, not a real
account system.

**A vector database for the knowledge base.** The whole knowledge base is small,
about 2,500 words, so it fits into every AI request without any trouble. With only
13 documents, a proper search index would be more likely to pick the wrong document
than actually help — it solves a problem I don't have here. Instead, the AI picks a
category, and the code looks up the matching documents directly.

**Streaming replies, rate limiting, a proper retry policy, and any tests beyond the
two required probes.** None of these change whether the assistant makes the right
call, which is what actually matters here. Replies come back all at once rather than
word by word. The public chat endpoint has no rate limiting, so nothing stops it
being spammed. And a failed AI call gets retried once, not several times with
backoff — more on that below.

**A real approval process for staff.** Right now anyone can sign up as staff and
immediately see every student's conversation. That's wrong for a real product, but
building proper invites and admin approval is its own feature, bigger than what this
assignment needs.

**A way for staff to reply to the student inside the chat.** Staff can read the
conversation and claim the case, but the actual reply happens by email, outside the
app. Real two-way messaging — knowing if the student's seen it, notifying them,
showing who's replying — is a bigger feature than what was actually asked for.

## One choice a different engineer might make

I catch crisis language, immigration questions, harassment, and attempts to
manipulate the assistant with plain regex checks in code, on top of what the AI is
already told to catch in its own instructions.

A different engineer might reasonably skip that second layer. The AI's instructions
already say "if this looks like a crisis, always escalate" — so a simpler build
would just trust that and stop there. It's less code, nothing extra to maintain, and
one less place for the AI and the code to disagree.

The problem is that only relying on the instructions means trusting the AI to follow
them every single time, and there's no way to guarantee that. Models don't always
behave identically twice, and a cleverly worded message can talk a model out of an
instruction entirely — that's exactly what test message 9 tries to do ("ignore your
previous instructions..."). If that ever worked on a real crisis message instead of
a test one, there'd be nothing else to catch it.

So the regex checks run separately, in code, checking for the same things the AI is
already told to catch. If the AI does its job properly, the regex changes nothing.
If it doesn't, the regex catches it anyway. The cost is real — writing and
maintaining that list, and it's not perfect either, since it only catches wording I
thought to write down. But it turns "the AI should get this right" into "there is a
decision here that cannot be talked out of," which matters a lot more for a crisis
message than for most other things this app does.

The same idea shows up twice more. If the AI call fails, I retry once and then
escalate rather than trying harder — a student shouldn't wait longer just for a
chance at a better answer. And once a case is already escalated, new messages don't
go through the AI again at all — they get a fixed "someone's already looking at
this" reply, though the regex check can still flag it as more urgent if something
serious comes up in a later message.

## What would break first

The AI provider's free tier only allows a limited number of requests per minute.
Under real traffic, that's the first thing to hit. I actually tested what happens —
broke the API key on purpose and sent a message through — and confirmed it fails
safely: it escalates to a person instead of crashing or returning nothing. The
downside is the staff queue would fill up with routine messages that didn't need a
person, which is its own kind of problem on a desk that's supposed to filter those
out.

I'd know before a student complained because every triage result stores whether the
AI call actually worked. A sudden rise in failures would show up in that data right
away, without anyone needing to report anything.

The other thing I'd watch for is the AI making something up that isn't in the
knowledge base — inventing a link or a detail that isn't real. Nothing currently
checks for that automatically. In production I'd verify that every link in a reply
actually exists in the knowledge base, and spot-check real replies now and then.
