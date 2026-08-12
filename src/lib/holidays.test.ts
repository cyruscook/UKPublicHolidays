import assert from "node:assert/strict";
import test from "node:test";
import { buildHolidays, type Proclamations } from "./holidays.ts";

const proclaimed: Proclamations = {
  "https://www.thegazette.co.uk/id/notice/first": {
    "England and Wales": ["2021-01-01"],
  },
  "https://www.thegazette.co.uk/id/notice/also-first": {
    "England and Wales": ["2021-01-01"],
  },
  "https://www.thegazette.co.uk/id/notice/last": {
    "England and Wales": ["2027-12-31"],
  },
};
const proclaimedNot: Proclamations = {
  "notice:moved-may": {
    "England and Wales": ["2022-05-30"],
    "Northern Ireland": ["2022-05-30"],
  },
  "notice:moved-boxing-day": {
    "England and Wales": ["2026-12-26"],
    "Northern Ireland": ["2026-12-26"],
  },
  "notice:moved-second-january": { Scotland: ["2027-01-02"] },
};
const holidays = buildHolidays(proclaimed, proclaimedNot);
const holidayOn = (date: string) => holidays.find((holiday) => holiday.date === date);

test("preserves every proclamation notice for its territory and date", () => {
  assert.deepEqual(holidayOn("2021-01-01")?.proclamationsByTerritory, {
    "England and Wales": [
      "https://www.thegazette.co.uk/id/notice/first",
      "https://www.thegazette.co.uk/id/notice/also-first",
    ],
  });
});

test("applies each territory statutory schedule", () => {
  assert.deepEqual(holidayOn("2025-03-17")?.reasonsByTerritory, {
    "Northern Ireland": ["St Patrick’s Day (statutory bank holiday)"],
  });
  assert.deepEqual(holidayOn("2025-04-21")?.territories, ["England and Wales", "Northern Ireland"]);
  assert.deepEqual(holidayOn("2025-08-04")?.territories, ["Scotland"]);
  assert.deepEqual(holidayOn("2025-08-25")?.territories, ["England and Wales", "Northern Ireland"]);
  assert.deepEqual(holidayOn("2025-12-01")?.territories, ["Scotland"]);
});

test("explains common law and statutory holidays by territory", () => {
  assert.deepEqual(holidayOn("2025-04-18")?.reasonsByTerritory, {
    "England and Wales": ["Good Friday (common law holiday)"],
    Scotland: ["Good Friday (statutory bank holiday)"],
    "Northern Ireland": ["Good Friday (common law holiday)"],
  });
  assert.deepEqual(holidayOn("2025-12-25")?.reasonsByTerritory, {
    "England and Wales": ["Christmas Day (common law holiday)"],
    Scotland: ["Christmas Day (statutory bank holiday)"],
    "Northern Ireland": ["Christmas Day (common law holiday)"],
  });
});

test("removes statutory dates proclaimed not to be bank holidays", () => {
  assert.equal(holidayOn("2022-05-30"), undefined);
  assert.equal(holidayOn("2026-12-26"), undefined);
  assert.equal(holidayOn("2027-01-02"), undefined);
});

test("applies Sunday substitutions exactly as specified by statute", () => {
  assert.deepEqual(holidayOn("2022-12-25")?.reasonsByTerritory, {
    "England and Wales": ["Christmas Day (common law holiday)"],
    "Northern Ireland": ["Christmas Day (common law holiday)"],
  });
  assert.deepEqual(holidayOn("2022-12-26")?.reasonsByTerritory, {
    "England and Wales": ["26 December (statutory bank holiday)"],
    Scotland: ["Christmas Day substitute (statutory bank holiday)"],
    "Northern Ireland": ["26 December (statutory bank holiday)"],
  });
  assert.deepEqual(holidayOn("2022-12-27")?.territories, ["England and Wales", "Northern Ireland"]);
  assert.deepEqual(holidayOn("2023-01-02")?.territories, ["Scotland"]);
  assert.deepEqual(holidayOn("2023-01-03")?.territories, ["Scotland"]);
});

test("only includes generated holidays between the first and last proclamation", () => {
  const bounded = buildHolidays(
    {
      first: { Scotland: ["2025-04-18"] },
      last: { Scotland: ["2025-12-25"] },
    },
    {},
  );

  assert.equal(bounded.at(0)?.date, "2025-04-18");
  assert.equal(bounded.at(-1)?.date, "2025-12-25");
  assert.equal(
    bounded.some((holiday) => holiday.date === "2025-03-17"),
    false,
  );
  assert.equal(
    bounded.some((holiday) => holiday.date === "2025-12-26"),
    false,
  );
});
