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
manipulate the assistant using plain regex patterns, not a trained model.

The alternative would be a small machine learning model trained on real examples of
crisis language, the kind some mental health apps use. It would probably catch
things my patterns miss — sarcasm, indirect phrasing, wording I just didn't think to
write down. A fixed list only catches what I anticipated; a trained model
generalises better.

But it needs real labelled training data, which for something like crisis detection
is sensitive and hard to get right. It needs hosting, versioning, retraining over
time. And it's still not a guarantee, just a different kind of mistake that's much
harder to explain afterwards. If my regex list gets something wrong, I can open the
file and see exactly why in ten seconds. A model rarely gives you that.

I went with regex because it needs no training data, always gives the same answer
for the same input (which is exactly what the probes test), and anyone can read the
whole list in a few minutes. It also doesn't need to be perfect on its own, because
it isn't the only check — the AI is already trying to catch the same things in its
own judgment. The regex is the backup underneath that, not a replacement for it.

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
