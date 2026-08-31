"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Role = "student" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
}
interface ConvoMeta {
  id: string;
  title: string;
  createdAt: number;
}

const STORE_KEY = "welfare_convos";
const CONTACT_KEY = "welfare_contact";

const GREETING =
  "Hi, I'm the student welfare assistant. Tell me what's going on in your own words — money, housing, academic, visa, or how you're doing — and I'll help where I can or bring in a member of the team.";

function loadConvos(): ConvoMeta[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ConvoMeta[]) : [];
  } catch {
    return [];
  }
}
function saveConvos(list: ConvoMeta[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export default function ChatPage() {
  const [stage, setStage] = useState<"intro" | "chat">("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [convos, setConvos] = useState<ConvoMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConvos(loadConvos());
    try {
      const c = localStorage.getItem(CONTACT_KEY);
      if (c) {
        const { name: n, email: e } = JSON.parse(c);
        if (n && e) {
          setName(n);
          setEmail(e);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function beginChat(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter your name and a valid email so we can follow up if needed.");
      return;
    }
    try {
      localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: name.trim(), email: email.trim() }));
    } catch {
      /* ignore */
    }
    setError("");
    setStage("chat");
  }

  function newConversation() {
    setActiveId(null);
    setMessages([{ role: "assistant", content: GREETING }]);
    setInput("");
    setError("");
  }

  async function openConversation(id: string) {
    setError("");
    try {
      const res = await fetch(`/api/chat/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActiveId(id);
      setMessages([
        { role: "assistant", content: GREETING },
        ...data.messages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
      ]);
    } catch {
      setError("Couldn't load that conversation.");
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "student", content: text }]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId ?? undefined,
          text,
          studentName: name.trim(),
          studentEmail: email.trim(),
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);

      if (data.conversationId && data.conversationId !== activeId) {
        setActiveId(data.conversationId);
        const meta: ConvoMeta = {
          id: data.conversationId,
          title: text.length > 42 ? `${text.slice(0, 42)}…` : text,
          createdAt: Date.now(),
        };
        setConvos((list) => {
          const next = [meta, ...list.filter((c) => c.id !== meta.id)];
          saveConvos(next);
          return next;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry — I couldn't send that. If this is urgent or about your safety, please call 999, or Samaritans on 116 123. Otherwise please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (stage === "intro") {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Before we start</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Just your name and email, so a member of the team can follow up if your enquiry needs a
          person. Nothing else is required.
        </p>
        <form onSubmit={beginChat} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Start
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-5xl">
      {/* sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white/60 p-3 md:flex">
        <button
          onClick={newConversation}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + New conversation
        </button>
        <p className="mt-4 px-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Your conversations
        </p>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {convos.length === 0 && (
            <p className="px-1 text-xs text-neutral-400">Nothing yet.</p>
          )}
          {convos.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${
                c.id === activeId
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {c.title}
            </button>
          ))}
        </nav>
        <Link href="/" className="mt-2 px-1 text-xs text-neutral-400 hover:text-neutral-600">
          ← Home
        </Link>
      </aside>

      {/* chat */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white/60 px-4 py-3">
          <span className="text-sm font-medium text-neutral-700">Welfare assistant</span>
          <button
            onClick={newConversation}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50 md:hidden"
          >
            + New
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "student" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "student"
                    ? "bg-emerald-700 text-white"
                    : "border border-neutral-200 bg-white text-neutral-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-400">
                typing…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && <p className="px-4 pb-1 text-xs text-red-600">{error}</p>}

        <form onSubmit={send} className="border-t border-neutral-200 bg-white/60 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
              rows={1}
              placeholder="Type your message…"
              className="max-h-40 flex-1 resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
