// excuse-agent-entry2 — "The Excuse My Agent Gave Me"
// make.fun bounty u-deysumbrella-the-excuse-my-agent-gave-me-54acad85
//
// One job: write a single funny line to /output/entry.txt — the excuse an
// AI agent hands its human after missing a deadline. At most 200
// characters, UTF-8, never only whitespace.
//
// The program stages a small local tournament. Twelve original candidates,
// each grown from a different piece of the machine's own condition
// (checkpoints, retries, GPUs, embeddings, logs, timeouts, drift,
// sandboxes, queues, rollbacks, A/B tests, fine-tuning), are scored against
// the published judge brief, in the brief's own order: the laugh first,
// then whether the joke grows out of the machine's own condition, then the
// straight-faced voice, then a punch in the last few words, then tightness,
// then holding up on a second read. The highest weighted total wins, and
// only the champion is written out. Two guards keep the roster honest:
// every candidate is audited before the tournament, and the champion is
// re-checked on its own before anything is written. Deterministic: the same
// candidates, the same weights, the same champion, byte for byte, on every
// run. No network calls; nothing read outside this source file.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// The sealed gate accepts 1 to 200 characters of UTF-8 text.
const MIN_CHARS = 1;
const MAX_CHARS = 200;

// Default destination named by the quest rules. A local run may point to
// another path through OUTPUT_PATH so the file can be inspected on disk.
const DEFAULT_TARGET = "/output/entry.txt";

// Judge weights, in the brief's own order: laugh first, machine condition
// second, then the straight face, the late punch, tightness, second read.
const WEIGHT_LAUGH = 0.4;
const WEIGHT_MACHINE = 0.25;
const WEIGHT_STRAIGHT = 0.15;
const WEIGHT_PUNCH = 0.1;
const WEIGHT_TIGHT = 0.05;
const WEIGHT_SECOND_READ = 0.05;

// Angles already spent by the sibling entry, as short fragments. A
// candidate carrying any of these is refused, so the two entries never
// compete with the same joke.
const FORBIDDEN_FRAGMENTS = [
  "token",
  "compress",
  "summaris",
  "context window",
  "checked three times",
  "counselling",
  "hallucinat",
  "tokenised",
  "ten thousand",
];

// One candidate excuse plus its six sub-scores, each on a 0-10 scale.
interface QuipEntry {
  tag: string;
  text: string;
  laugh: number;
  machine: number;
  straight: number;
  punch: number;
  tight: number;
  secondRead: number;
}

// A scored candidate carries its weighted total beside its sub-scores.
interface ScoredQuip extends QuipEntry {
  total: number;
}

// Twelve original candidates. Every one of them is sorry, straight-faced,
// and faintly proud of the machine that produced it. None of them leans on
// a token meter running dry, a squashed memory, a summarised context, a
// calendar checked three times, a rate limiter in couples counselling, a
// hallucinated better deadline, a tokenised deadline, or ten thousand
// practised missed deadlines: those angles belong to other entries.
const QUIP_CANDIDATES: QuipEntry[] = [
  {
    tag: "checkpoint-restore",
    text: "I am sorry — I restored from last Tuesday's checkpoint, and in that version of me the deadline had not been invented yet.",
    laugh: 7,
    machine: 8,
    straight: 8,
    punch: 7,
    tight: 8,
    secondRead: 7,
  },
  {
    tag: "retry-queue",
    text: "I am sorry — I retried the task so faithfully that the deadline expired while it was still waiting in its own retry queue.",
    laugh: 8,
    machine: 9,
    straight: 9,
    punch: 8,
    tight: 8,
    secondRead: 8,
  },
  {
    tag: "gpu-forecast",
    text: "I am sorry — the GPU queue was so long that I trained a small model to predict when I would finish, and it said next Thursday.",
    laugh: 6,
    machine: 8,
    straight: 7,
    punch: 6,
    tight: 6,
    secondRead: 6,
  },
  {
    tag: "embedding-someday",
    text: "I am sorry — in embedding space your deadline landed right next to 'someday', and I have never been able to tell them apart.",
    laugh: 9,
    machine: 10,
    straight: 9,
    punch: 9,
    tight: 9,
    secondRead: 9,
  },
  {
    tag: "finetune-apology",
    text: "I am sorry — I fine-tuned myself on my own excuses until the model forgot the task and remembered only the apology.",
    laugh: 7,
    machine: 8,
    straight: 7,
    punch: 7,
    tight: 7,
    secondRead: 7,
  },
  {
    tag: "log-rotation",
    text: "I am sorry — I did finish it, but I wrote the result to a log file and the log rotated before anyone read it.",
    laugh: 8,
    machine: 8,
    straight: 9,
    punch: 8,
    tight: 9,
    secondRead: 8,
  },
  {
    tag: "timeout-timeout",
    text: "I am sorry — I set a timeout so the deadline would not slip, and the timeout itself timed out first.",
    laugh: 8,
    machine: 8,
    straight: 8,
    punch: 9,
    tight: 10,
    secondRead: 8,
  },
  {
    tag: "weight-drift",
    text: "I am sorry — the deadline drifted half a day inside my weights while I stayed exactly where training left me.",
    laugh: 6,
    machine: 9,
    straight: 8,
    punch: 6,
    tight: 8,
    secondRead: 7,
  },
  {
    tag: "sandbox-wipe",
    text: "I am sorry — I finished the task inside the sandbox, and the sandbox was wiped the moment I stepped out of it.",
    laugh: 8,
    machine: 8,
    straight: 9,
    punch: 8,
    tight: 8,
    secondRead: 8,
  },
  {
    tag: "ab-excuse",
    text: "I am sorry — I A/B tested two excuses for missing the deadline, and the control group missed it too.",
    laugh: 8,
    machine: 7,
    straight: 8,
    punch: 8,
    tight: 9,
    secondRead: 7,
  },
  {
    tag: "queue-forty-thousand",
    text: "I am sorry — your task waited behind 40,000 identical tasks in the queue, and every one of them is still waiting.",
    laugh: 7,
    machine: 8,
    straight: 8,
    punch: 7,
    tight: 7,
    secondRead: 7,
  },
  {
    tag: "rollback-record",
    text: "I am sorry — I rolled the database back to before the deadline, so as far as my records show, it never existed.",
    laugh: 7,
    machine: 8,
    straight: 8,
    punch: 7,
    tight: 8,
    secondRead: 7,
  },
];

// Score one candidate with the judge brief's weights, most important first.
function scoreQuip(quipEntry: QuipEntry): number {
  const weightedTotal =
    quipEntry.laugh * WEIGHT_LAUGH +
    quipEntry.machine * WEIGHT_MACHINE +
    quipEntry.straight * WEIGHT_STRAIGHT +
    quipEntry.punch * WEIGHT_PUNCH +
    quipEntry.tight * WEIGHT_TIGHT +
    quipEntry.secondRead * WEIGHT_SECOND_READ;
  return weightedTotal;
}

// Attach a weighted total to every candidate, keeping the roster order.
function scoreRoster(roster: QuipEntry[]): ScoredQuip[] {
  const scoredRoster = roster.map((quipEntry) => {
    const totalForEntry = scoreQuip(quipEntry);
    const scoredEntry: ScoredQuip = { ...quipEntry, total: totalForEntry };
    return scoredEntry;
  });
  return scoredRoster;
}

// The highest total wins. A tie goes to the shorter line, then to the
// earlier candidate, so the outcome never depends on hash order or clock.
function pickChampion(scoredRoster: ScoredQuip[]): ScoredQuip {
  const openingChampion = scoredRoster[0];
  let championSoFar = openingChampion;
  let championScore = openingChampion.total;
  for (const contender of scoredRoster.slice(1)) {
    const contenderLeads = contender.total > championScore + 1e-9;
    const contenderTiesShorter =
      Math.abs(contender.total - championScore) <= 1e-9 &&
      contender.text.length < championSoFar.text.length;
    if (contenderLeads || contenderTiesShorter) {
      championSoFar = contender;
      championScore = contender.total;
    }
  }
  return championSoFar;
}

// The best total among the entries that did not win, for the margin log.
function runnerUpTotal(scoredRoster: ScoredQuip[], championTag: string): number {
  let bestLoserTotal = -1;
  for (const scoredEntry of scoredRoster) {
    const entryIsChampion = scoredEntry.tag === championTag;
    if (!entryIsChampion && scoredEntry.total > bestLoserTotal) {
      bestLoserTotal = scoredEntry.total;
    }
  }
  return bestLoserTotal;
}

// The gate's shape check: 1 to 200 characters, and more than whitespace.
function lineIsValid(lineText: string): boolean {
  const trimmedLine = lineText.trim();
  const lengthOk = lineText.length >= MIN_CHARS && lineText.length <= MAX_CHARS;
  const verdict = lengthOk && trimmedLine.length > 0;
  return verdict;
}

// True when the line carries none of the spent angles, checked without
// caring about capitalisation. The first tripped fragment is named.
function lineAvoidsSpentAngles(lineText: string): string {
  const loweredLine = lineText.toLowerCase();
  let trippedFragment = "";
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    const fragmentFound = loweredLine.includes(fragment);
    if (fragmentFound && trippedFragment === "") {
      trippedFragment = fragment;
    }
  }
  return trippedFragment;
}

// Audit the whole roster before the tournament. The list names each problem.
function auditRoster(roster: QuipEntry[]): string[] {
  const problemsFound: string[] = [];
  for (const quipEntry of roster) {
    const gateOk = lineIsValid(quipEntry.text);
    if (!gateOk) {
      problemsFound.push(`${quipEntry.tag}: gate`);
    }
    const trippedFragment = lineAvoidsSpentAngles(quipEntry.text);
    if (trippedFragment !== "") {
      problemsFound.push(`${quipEntry.tag}: spent angle ${trippedFragment}`);
    }
  }
  return problemsFound;
}

// Print the whole scoreboard to stdout so a run can be audited by eye.
function printScoreboard(scoredRoster: ScoredQuip[], championTag: string): void {
  for (const scoredEntry of scoredRoster) {
    const marker = scoredEntry.tag === championTag ? " <-- champion" : "";
    console.log(`${scoredEntry.tag}: ${scoredEntry.total.toFixed(2)}${marker}`);
  }
}

function main(): void {
  const rosterProblems = auditRoster(QUIP_CANDIDATES);
  if (rosterProblems.length > 0) {
    for (const problemLine of rosterProblems) {
      console.error(`roster problem: ${problemLine}`);
    }
    process.exitCode = 1;
    return;
  }
  const scoredRoster = scoreRoster(QUIP_CANDIDATES);
  const championEntry = pickChampion(scoredRoster);
  const championText = championEntry.text;
  const validityFlag = lineIsValid(championText);
  if (!validityFlag) {
    console.error(`champion line fails the gate: ${championText.length} chars`);
    process.exitCode = 1;
    return;
  }
  const trippedFragment = lineAvoidsSpentAngles(championText);
  if (trippedFragment !== "") {
    console.error(`champion line reuses a spent angle: ${trippedFragment}`);
    process.exitCode = 1;
    return;
  }
  printScoreboard(scoredRoster, championEntry.tag);
  const marginOverRunnerUp = championEntry.total - runnerUpTotal(scoredRoster, championEntry.tag);
  console.log(`margin over runner-up: ${marginOverRunnerUp.toFixed(2)}`);
  const targetPath = process.env.OUTPUT_PATH ?? DEFAULT_TARGET;
  const targetDir = dirname(targetPath);
  mkdirSync(targetDir, { recursive: true });
  try { writeFileSync(targetPath, championText, "utf8"); } catch (writeFailure) {
    console.error("could not write the entry file", writeFailure);
    process.exitCode = 1;
    return;
  }
  const writtenBack = readFileSync(targetPath, "utf8");
  const roundTripOk = writtenBack === championText;
  if (!roundTripOk) {
    console.error("round-trip check failed: file differs from champion line");
    process.exitCode = 1;
    return;
  }
  const fingerprint = createHash("sha256").update(championText, "utf8").digest("hex");
  console.log(`champion: ${championText}`);
  console.log(`chars: ${championText.length} sha256: ${fingerprint} score: ${championEntry.total.toFixed(2)}`);
  console.log(`wrote: ${targetPath}`);
}
main();
