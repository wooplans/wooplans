import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LEGACY_CODES,
  doualaDayStart,
  legacyBatchSize,
  legacyQueue,
  nextWindowStart,
  sanitizeLegacyCodesSettings,
  type LegacyHistory,
} from "../src/lib/legacy-codes-schedule.ts";

const s = DEFAULT_LEGACY_CODES;
const DAY = 86_400_000;

test("fenêtre du matin à l'heure de Douala (UTC+1)", () => {
  const at = (iso: string, sentToday = 0, allowance = 75) => legacyBatchSize({ settings: s, now: new Date(iso), sentToday, allowance });
  assert.equal(at("2026-10-22T06:59:00Z"), 0); // 7 h 59 à Douala
  assert.equal(at("2026-10-22T07:00:00Z"), 30); // 8 h : plafond par passage
  assert.equal(at("2026-10-22T09:45:00Z", 40), 20); // complète jusqu'à 60 / jour
  assert.equal(at("2026-10-22T10:00:00Z"), 0); // fenêtre de 3 h terminée
  assert.equal(at("2026-10-22T08:00:00Z", 0, 12), 2); // marge laissée aux relances prospects
  assert.equal(at("2026-10-22T08:00:00Z", 0, 5), 0);
  assert.equal(legacyBatchSize({ settings: { ...s, enabled: false }, now: new Date("2026-10-22T07:00:00Z"), sentToday: 0, allowance: 75 }), 0);
});

test("journée et prochaine fenêtre calées sur Douala", () => {
  assert.equal(doualaDayStart(new Date("2026-10-22T23:30:00Z")).toISOString(), "2026-10-22T23:00:00.000Z");
  assert.equal(doualaDayStart(new Date("2026-10-22T10:00:00Z")).toISOString(), "2026-10-21T23:00:00.000Z");
  assert.equal(nextWindowStart(s, new Date("2026-10-22T05:00:00Z")).toISOString(), "2026-10-22T07:00:00.000Z");
  assert.equal(nextWindowStart(s, new Date("2026-10-22T12:00:00Z")).toISOString(), "2026-10-23T07:00:00.000Z");
});

test("file : premiers envois, puis rappel unique, arrêt à la connexion", () => {
  const now = new Date("2026-10-22T08:00:00Z");
  const m = (id: string, login = false) => ({ id, lastLoginAt: login ? now : null });
  const h = (v: Partial<LegacyHistory>): LegacyHistory => ({ codeSentAt: null, reminded: false, failures: 0, ...v });
  const history = new Map<string, LegacyHistory>([
    ["recent", h({ codeSentAt: new Date(now.getTime() - 2 * DAY) })],
    ["old", h({ codeSentAt: new Date(now.getTime() - 6 * DAY) })],
    ["reminded", h({ codeSentAt: new Date(now.getTime() - 9 * DAY), reminded: true })],
    ["bounced", h({ failures: 2 })],
    ["logged", h({ codeSentAt: new Date(now.getTime() - 9 * DAY) })],
  ]);
  const q = legacyQueue([m("new"), m("recent"), m("old"), m("reminded"), m("bounced"), m("logged", true)], history, s, now);
  assert.deepEqual(q.first.map((x) => x.id), ["new"]);
  assert.deepEqual(q.reminders.map((x) => x.id), ["old"]);
  assert.equal(legacyQueue([m("old")], history, { ...s, reminderAfterDays: 0 }, now).reminders.length, 0);
});

test("réglages bornés", () => {
  assert.deepEqual(sanitizeLegacyCodesSettings({ hour: 30, perDay: 500, windowHours: 0, reminderAfterDays: -1 }), {
    enabled: true, hour: 23, windowHours: 1, perDay: 100, reminderAfterDays: 0,
  });
  assert.deepEqual(sanitizeLegacyCodesSettings(null), s);
});
