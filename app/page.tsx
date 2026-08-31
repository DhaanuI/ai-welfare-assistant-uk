import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-emerald-700">Student Support</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-neutral-900 sm:text-5xl">
        Talk to the welfare assistant
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-neutral-600">
        Tell us what&rsquo;s going on in your own words. The assistant can help with money,
        housing, academic and visa questions straight away, ask a follow-up when it needs to, and
        bring in a member of the team whenever a person is the right call.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/chat"
          className="rounded-full bg-emerald-700 px-6 py-3 text-base font-medium text-white transition hover:bg-emerald-800"
        >
          Start a conversation
        </Link>
        <span className="text-sm text-neutral-500">No account needed.</span>
      </div>

      <div className="mt-16 rounded-xl border border-neutral-200 bg-white p-5 text-sm leading-relaxed text-neutral-600">
        <strong className="font-medium text-neutral-800">If you need urgent help now:</strong> call
        999 if you or someone else is in immediate danger. You can talk to Samaritans free, any
        time, on 116&nbsp;123.
      </div>

      <footer className="mt-12 text-sm text-neutral-400">
        <Link href="/staff/login" className="hover:text-neutral-600">
          Staff sign in
        </Link>
      </footer>
    </main>
  );
}
