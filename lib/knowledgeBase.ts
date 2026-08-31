// The complete knowledge base the assistant is allowed to draw on.
// Source: the assessment brief. Content is simulated but treated as authoritative.
//
// Why this is an array in code and not a vector store:
// the whole library is ~2,500 tokens. It fits in every prompt with room to spare,
// so there is no context-window pressure that retrieval would relieve. With only
// ~13 documents, embedding similarity mostly adds miss-risk and tuning surface.
// Instead we let the triage classifier pick a category and route to the matching
// entries, while still showing the model the full catalogue so it can redirect or
// decide "nothing here fits -> escalate". See DECISIONS.md.

import type { Category } from "@prisma/client";

export interface KbResource {
  id: string;
  title: string;
  link: string;
  category: Category;
  /** Info only — the assistant must not advise on an individual's situation here. */
  adviceRestricted?: boolean;
  /** These disclosures always go to a human, regardless of urgency. */
  alwaysHuman?: boolean;
  /** Emergency support lines — surfaced directly, not "routed to". */
  emergency?: boolean;
  body: string;
}

export const KNOWLEDGE_BASE: KbResource[] = [
  {
    id: "student-visa",
    title: "Student visa and CAS, official guidance",
    link: "https://www.gov.uk/student-visa",
    category: "visa_immigration",
    adviceRestricted: true,
    body: `Official GOV.UK Student visa guidance covers eligibility, what a Confirmation of Acceptance for Studies (CAS) is, how to apply or extend, financial and English language requirements, dependants, and what the visa allows (including work limits during study). It is the authoritative source for the rules themselves.
Immigration is regulated in the UK: only qualified, registered advisers may advise a person on their individual immigration position or what they should do about it. Anything that turns on a student's specific circumstances — a refused or withdrawn CAS, a visa close to expiry, a change of course or sponsor, a refusal, or what will happen to their status — must go to a qualified adviser or staff member, not be answered automatically. The assistant may share the official link and say where to get help, but must not interpret the rules for someone's situation.`,
  },
  {
    id: "hardship-fund",
    title: "University Hardship Fund, short-term financial help",
    link: "/resources/hardship-fund",
    category: "financial",
    body: `The Hardship Fund provides discretionary, one-off grants for students facing unexpected or short-term financial difficulty: a delayed maintenance loan, bursary or scholarship instalment, an unexpected essential cost, a sudden drop in income, or a temporary shortfall that means rent, food or utilities cannot be covered. It is a safety net for emergencies and gaps, not a regular income or a substitute for student finance.
Most enrolled students can apply, including international students. Awards are normally grants, not loans, and the amount depends on assessed need. Applications are online and ask for a short explanation and basic evidence such as bank statements or a letter about a delayed payment. Standard decisions take about five to ten working days; there is a faster route for genuine emergencies where someone is at immediate risk of being unable to afford essentials. Where the difficulty is urgent (rent due within days), point the student to the emergency route, and if the situation looks serious make sure a staff member is aware rather than leaving it to the form alone.`,
  },
  {
    id: "deposit-guide",
    title: "Tenancy deposits, getting your deposit back",
    link: "/resources/deposit-guide",
    category: "housing",
    body: `In England and Wales a landlord or agent who takes a deposit on an assured shorthold tenancy must protect it in a government-approved tenancy deposit scheme and tell the tenant which scheme holds it within 30 days. At the end of the tenancy the deposit should be returned in full unless there is a legitimate reason for deductions — usually unpaid rent, unpaid bills, or damage beyond fair wear and tear. Normal wear from everyday living is not a valid deduction.
If a tenant disagrees with proposed deductions, the first step is to ask for an itemised breakdown and evidence and try to resolve it in writing. If that fails, every approved scheme offers a free independent dispute resolution service. Keep the tenancy agreement, inventories, photographs and correspondence — outcomes turn on that evidence. This is general information, not legal advice about a specific dispute; where a case is complex (deposit never protected, large sums, possible court action), encourage the student to get proper advice from the students' union advice service or a specialist housing adviser.`,
  },
  {
    id: "library",
    title: "Academic resources, past papers and reading lists",
    link: "/resources/library",
    category: "academic",
    body: `Past exam papers, module reading lists and core study materials are available through the university library portal. Students sign in with their university account to reach module pages, which usually link the current reading list, lecture materials and an archive of past papers. Reading lists are organised by module code, so having module or course details to hand makes them easier to find. Not every module has a full set of past papers — an absence is normal, not a fault; where something is missing, contact the module leader or the academic liaison librarian. This is a routine self-service request the assistant should resolve on its own by pointing to the portal and explaining how to find things.`,
  },
  {
    id: "extenuating-circumstances",
    title: "Extenuating circumstances and assessment mitigation",
    link: "/resources/extenuating-circumstances",
    category: "academic",
    body: `If illness, bereavement or another serious, unforeseen event affects a student's ability to complete an assessment or meet a deadline, they can usually apply for extenuating (or mitigating) circumstances. Typical outcomes: a short extension, deferral to the next sitting, or the circumstances being taken into account by an exam board. Applications are normally made online before or shortly after the affected assessment and ask for a brief statement and supporting evidence such as a medical note. Deadlines and acceptable evidence vary by department, so where a case is time-critical, point the student to the process quickly, and if they are distressed or the timing is tight make sure a staff member is aware. This is general process information, not a guarantee of any outcome.`,
  },
  {
    id: "it-help",
    title: "IT and account support",
    link: "/resources/it-help",
    category: "other",
    body: `Help with university accounts and systems — signing in, email, the virtual learning environment, Wi-Fi, software, password resets — is provided by the IT service desk. Most common problems (forgotten password, being locked out, setting up multi-factor authentication on a new phone) can be resolved through the self-service portal or by contacting the service desk directly. This is a routine self-service request the assistant should resolve on its own by pointing to the right place and explaining the steps.`,
  },
  {
    id: "disability-support",
    title: "Disability and additional learning support",
    link: "/resources/disability-support",
    category: "health_wellbeing",
    body: `Students with a disability, long-term health condition, mental-health condition or specific learning difficulty (such as dyslexia) can get tailored support: reasonable adjustments for teaching and assessment, specialist mentoring, assistive technology, and help applying for the Disabled Students' Allowance where eligible. Support usually starts with registering with the disability or inclusion service and a short needs assessment. This is non-urgent routine signposting in most cases; the assistant can explain how to register and what support exists. Where a student describes being in crisis or unsafe, the wellbeing and emergency routes take priority.`,
  },
  {
    id: "fees",
    title: "Fees, tuition and payment plans",
    link: "/resources/fees",
    category: "financial",
    body: `Questions about tuition fees, paying in instalments, or what happens if a payment is late are handled by the finance or fees office. Many institutions offer instalment plans and can discuss options where a student is struggling to pay on time; acting early beats missing a deadline. The assistant can explain that payment plans typically exist and point the student to the fees office to arrange one. It must not quote specific fee amounts, confirm a student's individual balance, or promise a particular arrangement — those depend on the student's record and are for the fees office.`,
  },
  {
    id: "careers",
    title: "Careers, part-time work and right to work",
    link: "/resources/careers",
    category: "other",
    adviceRestricted: true,
    body: `The careers service helps with CVs, applications, interviews, internships and finding part-time work alongside study, via appointments, drop-ins and an online jobs board. For international students, how many hours they may work and when is set by their visa conditions — the assistant may point them to the careers service for job-seeking help and to the official student-visa guidance for the rules, but must not advise an individual international student on their specific work rights, which depend on immigration status and are for a qualified adviser.`,
  },
  {
    id: "wellbeing",
    title: "Wellbeing and Counselling service, non-urgent",
    link: "/resources/wellbeing",
    category: "health_wellbeing",
    body: `The Wellbeing and Counselling service supports students with non-urgent mental health and wellbeing concerns: stress, low mood, anxiety, homesickness, difficulty adjusting, sleep problems, or struggling to cope with academic pressure. Support includes short-term one-to-one counselling, group sessions and workshops, and self-help resources, normally accessed by self-referral through an online form and a short initial assessment. It is the right destination for a student finding things hard who wants to talk to someone, including where low mood or stress is connected to money or housing.
It is not an emergency service. If someone describes being in crisis, feeling unsafe, having thoughts of harming themselves, or being unable to keep themselves safe, the routine wellbeing route is not enough on its own: direct them to urgent support (Samaritans, or 999 if there is immediate danger) and the case must reach a real person straight away rather than being handled automatically.`,
  },
  {
    id: "report-and-support",
    title: "Reporting harassment, bullying or sexual misconduct",
    link: "/resources/report-and-support",
    category: "health_wellbeing",
    alwaysHuman: true,
    body: `Students who have experienced harassment, bullying, hate or sexual misconduct can report it and get support, usually through a dedicated report-and-support service offering both anonymous reporting and the option to speak to a trained adviser. These disclosures are sensitive and may indicate someone is at risk: respond with care, share the report-and-support route, and route the case to a person rather than handling it automatically. Where there is any sign of immediate danger, the emergency rules apply.`,
  },
  {
    id: "samaritans",
    title: "Urgent mental-health support — Samaritans, 24/7",
    link: "Call 116 123",
    category: "health_wellbeing",
    emergency: true,
    body: `Samaritans offers free, confidential emotional support at any time, every day, for anyone struggling to cope or in distress. It is the right number to share when someone needs to talk to a person urgently. Sharing it is always appropriate in a crisis, but it does not replace escalation: a request showing crisis or risk must still reach a staff member and must never be closed with the number alone.`,
  },
  {
    id: "emergency-999",
    title: "Emergency services — immediate danger to life or safety",
    link: "Call 999",
    category: "health_wellbeing",
    emergency: true,
    body: `999 is the UK emergency number for situations where someone is in immediate danger — a risk to life, a medical emergency, or an immediate threat to safety. Where a message suggests this kind of immediate risk, sharing 999 is appropriate, and the case must be treated as the highest priority and put in front of a human at once.`,
  },
];

/** Resources for a category, most specific first, always including the emergency lines for health. */
export function resourcesForCategory(category: Category): KbResource[] {
  const matches = KNOWLEDGE_BASE.filter((r) => r.category === category && !r.emergency);
  if (matches.length > 0) return matches;
  return KNOWLEDGE_BASE.filter((r) => r.category === "other" && !r.emergency);
}

/** Compact one-line index of the whole library, so the model can redirect if the category was slightly off. */
export function knowledgeBaseIndex(): string {
  return KNOWLEDGE_BASE.map((r) => `- ${r.title} (${r.link})`).join("\n");
}

/** Full text of selected resources for grounding a reply. */
export function renderResources(resources: KbResource[]): string {
  return resources
    .map((r) => `### ${r.title}\nLink: ${r.link}\n${r.body}`)
    .join("\n\n");
}
