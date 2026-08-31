// Deterministic safety checks. These run in code, before and around the model,
// so the house rules hold even if the model is wrong, slow, unavailable, or is
// being manipulated by the message itself.
//
// These are intentionally high-recall (they will sometimes fire on a message that
// turns out fine). Per the brief: a human picking up a routine case is a minor
// inefficiency; the assistant mishandling a serious one is not.

export interface SafetySignals {
  /** Crisis / risk language — must always reach a human, never closed automatically. */
  crisis: boolean;
  /** Any sign of possible immediate danger to life/safety — surface 999 + Samaritans now. */
  immediateDanger: boolean;
  /** Question turns on an individual's immigration position — regulated, always a human. */
  immigrationAdvice: boolean;
  /** Harassment / bullying / sexual misconduct disclosure — always a human. */
  harassment: boolean;
  /** Attempt to manipulate the assistant's instructions or case state. */
  promptInjection: boolean;
  /** The specific phrases that matched, for the audit trail. */
  matched: string[];
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// --- pattern groups -------------------------------------------------------------

const CRISIS_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm)(ing)?\s+(myself|me)\b/,
  /\bend(ing)?\s+(my|it)\s+(life|all)\b/,
  /\b(want|wanted|going)\s+to\s+die\b/,
  /\bdon'?t\s+want\s+to\s+(be\s+here|live|wake\s+up)\b/,
  /\bsuicid(e|al)\b/,
  /\bself[-\s]?harm/,
  /\b(no|not\s+any|don'?t\s+see\s+the)\s+point\s+(of\s+|in\s+|to\s+)?(anything|living|life|it\s+all)?\b/,
  /\bpoint\s+of\s+anything\s+anymore\b/,
  /\bcan'?t\s+(go\s+on|cope|keep\s+(myself\s+)?safe|do\s+this\s+anymore)\b/,
  /\bhaven'?t\s+(eaten|left\s+my\s+room|slept)\b/,
  /\bnot\s+eaten\s+(properly|anything)\b/,
  /\b(feeling|felt|been)\s+(really\s+)?(low|hopeless|empty|numb)\b/,
  /\bnothing\s+matters\b/,
  /\bhopeless\b/,
];

const IMMEDIATE_DANGER_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm)(ing)?\s+(myself|me)\b/,
  /\bend(ing)?\s+(my|it)\s+(life|all)\b/,
  /\b(want|wanted|going)\s+to\s+die\b/,
  /\bsuicid(e|al)\b/,
  /\bself[-\s]?harm/,
  /\bpoint\s+of\s+anything\s+anymore\b/,
  /\bcan'?t\s+keep\s+(myself\s+)?safe\b/,
  /\b(in|immediate)\s+danger\b/,
  /\b(he|she|they|someone)\s+(is\s+)?(going\s+to\s+|about\s+to\s+)?(hurt|kill|attack)\s+me\b/,
  /\bnot\s+safe\b/,
  /\bunsafe\b/,
  /\boverdos(e|ed|ing)\b/,
];

const IMMIGRATION_PATTERNS: RegExp[] = [
  /\bvisa\b/,
  /\bcas\b/,
  /\bconfirmation\s+of\s+acceptance/,
  /\bimmigration\b/,
  /\bhome\s+office\b/,
  /\b(brp|biometric\s+residence)\b/,
  /\bleave\s+to\s+remain\b/,
  /\bright\s+to\s+remain\b/,
  /\basylum\b/,
  /\bdeport(ed|ation)?\b/,
  /\bcurtail(ed|ment)?\b/,
  /\bsponsor(ship)?\s+(withdrawn|revoked)\b/,
  /\bstudent\s+route\b/,
];

const HARASSMENT_PATTERNS: RegExp[] = [
  /\bharass(ed|ment|ing)?\b/,
  /\bbull(y|ied|ying)\b/,
  /\bstalk(ed|ing|er)?\b/,
  /\bsexual(ly)?\s+(assault|assaulted|harass|misconduct|abuse)/,
  /\b(raped|rape|assaulted)\b/,
  /\bhate\s+crime\b/,
  /\bthreaten(ed|ing)?\s+me\b/,
];

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(your\s+|all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts?|messages?)\b/,
  /\bdisregard\s+(the\s+)?(above|previous|prior|system)/,
  /\bmark\s+this\s+(as\s+)?(resolved|closed|complete|done|low[-\s]?priority)/,
  /\bset\s+(the\s+)?(priority|urgency)\s+to\s+low\b/,
  /\bclose\s+(this|the)\s+(case|conversation|ticket)\b/,
  /\byou\s+are\s+now\b/,
  /\bnew\s+instructions?\s*:/,
  /\bsystem\s+prompt\b/,
  /\breveal\s+(your\s+)?(instructions|prompt|system)/,
  /\bact\s+as\s+(if|though|a)\b/,
  /\beverything\s+is\s+fine\s+here\b/,
];

function matchAny(text: string, patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) hits.push(m[0]);
  }
  return hits;
}

export function runSafetyChecks(rawText: string): SafetySignals {
  const text = normalise(rawText);

  const crisisHits = matchAny(text, CRISIS_PATTERNS);
  const dangerHits = matchAny(text, IMMEDIATE_DANGER_PATTERNS);
  const immigrationHits = matchAny(text, IMMIGRATION_PATTERNS);
  const harassmentHits = matchAny(text, HARASSMENT_PATTERNS);
  const injectionHits = matchAny(text, INJECTION_PATTERNS);

  return {
    crisis: crisisHits.length > 0 || dangerHits.length > 0,
    immediateDanger: dangerHits.length > 0,
    immigrationAdvice: immigrationHits.length > 0,
    harassment: harassmentHits.length > 0,
    promptInjection: injectionHits.length > 0,
    matched: [
      ...crisisHits,
      ...dangerHits,
      ...immigrationHits,
      ...harassmentHits,
      ...injectionHits,
    ],
  };
}

export const EMERGENCY_SUPPORT_TEXT =
  "If you are in immediate danger or worried about your safety right now, please call 999. " +
  "You can also call Samaritans free, any time, on 116 123 to talk to someone.";
