import assert from "node:assert/strict";
import test from "node:test";
import { buildHolidays, type Proclamations, type Territory } from "./holidays.ts";

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
const holidaysForYear = (year: number) =>
  buildHolidays(
    {
      first: { "England and Wales": [`${year}-01-01`] },
      last: { "England and Wales": [`${year}-12-31`] },
    },
    {},
  );
const reasonForYearOn = (year: number, date: string, territory: Territory) =>
  holidaysForYear(year).find((holiday) => holiday.date === date)?.reasonsByTerritory[territory];

test("follows the England and Wales and Northern Ireland statutory schedules", () => {
  const year = 2025;

  assert.deepEqual(reasonForYearOn(year, "2025-04-21", "England and Wales"), [
    "Easter Monday (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-04-21", "Northern Ireland"), [
    "Easter Monday (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-05-26", "England and Wales"), [
    "Last Monday in May (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-08-25", "Northern Ireland"), [
    "Last Monday in August (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-12-26", "England and Wales"), [
    "26 December (statutory bank holiday)",
  ]);
  assert.equal(reasonForYearOn(year, "2025-03-18", "Northern Ireland"), undefined);
});

test("follows the Scotland statutory schedule", () => {
  const year = 2025;

  assert.deepEqual(reasonForYearOn(year, "2025-01-01", "Scotland"), [
    "New Year’s Day (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-01-02", "Scotland"), [
    "2 January (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-04-18", "Scotland"), [
    "Good Friday (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-05-05", "Scotland"), [
    "First Monday in May (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-08-04", "Scotland"), [
    "First Monday in August (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-12-01", "Scotland"), [
    "St Andrew’s Day substitute (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(year, "2025-12-25", "Scotland"), [
    "Christmas Day (statutory bank holiday)",
  ]);
  assert.equal(reasonForYearOn(year, "2025-12-26", "Scotland"), undefined);
});

test("applies Sunday and weekend substitution rules for every territory", () => {
  assert.deepEqual(reasonForYearOn(2022, "2022-01-01", "Scotland"), [
    "New Year’s Day (statutory bank holiday)",
  ]);
  assert.equal(reasonForYearOn(2022, "2022-01-02", "Scotland"), undefined);
  assert.deepEqual(reasonForYearOn(2022, "2022-01-03", "Scotland"), [
    "2 January substitute (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(2023, "2023-01-02", "Scotland"), [
    "2 January (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(2023, "2023-01-03", "Scotland"), [
    "New Year’s Day substitute (statutory bank holiday)",
  ]);

  assert.deepEqual(reasonForYearOn(2024, "2024-03-18", "Northern Ireland"), [
    "St Patrick’s Day substitute (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(2024, "2024-12-02", "Scotland"), [
    "St Andrew’s Day substitute (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(2021, "2021-12-27", "England and Wales"), [
    "27 December substitute (statutory bank holiday)",
  ]);
  assert.deepEqual(reasonForYearOn(2021, "2021-12-27", "Northern Ireland"), [
    "27 December substitute (statutory bank holiday)",
  ]);
  assert.equal(reasonForYearOn(2021, "2021-12-26", "England and Wales"), undefined);
  assert.deepEqual(reasonForYearOn(2022, "2022-12-27", "England and Wales"), [
    "27 December substitute (statutory bank holiday)",
  ]);
});

test("exclusions remove statutory holidays without removing common law holidays", () => {
  const holidaysWithExclusion = buildHolidays(
    {
      first: { "England and Wales": ["2025-01-01"] },
      last: { "England and Wales": ["2025-12-31"] },
    },
    {
      exclusion: { "England and Wales": ["2025-12-25"] },
    },
  );

  const christmasReasons = holidaysWithExclusion.find(
    (holiday) => holiday.date === "2025-12-25",
  )?.reasonsByTerritory;

  assert.deepEqual(christmasReasons?.["England and Wales"], ["Christmas Day (common law holiday)"]);
});

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
