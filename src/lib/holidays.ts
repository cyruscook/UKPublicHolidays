export type Territory = 'England and Wales' | 'Scotland' | 'Northern Ireland';
export type Proclamations = Record<string, Partial<Record<Territory, string[]>>>;

export interface Holiday {
	date: string;
	territories: Territory[];
	reasonsByTerritory: Partial<Record<Territory, string[]>>;
	proclamationsByTerritory: Partial<Record<Territory, string[]>>;
}

export const territoryOrder: Territory[] = ['England and Wales', 'Scotland', 'Northern Ireland'];

const toDateString = (year: number, month: number, day: number) =>
	`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const dayOfWeek = (year: number, month: number, day: number) =>
	new Date(Date.UTC(year, month - 1, day)).getUTCDay();

const addDays = (date: string, days: number) => {
	const value = new Date(`${date}T00:00:00Z`);
	value.setUTCDate(value.getUTCDate() + days);
	return value.toISOString().slice(0, 10);
};

const firstMonday = (year: number, month: number) =>
	toDateString(year, month, 1 + ((8 - dayOfWeek(year, month, 1)) % 7));

const lastMonday = (year: number, month: number) => {
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	return toDateString(year, month, lastDay - ((dayOfWeek(year, month, lastDay) + 6) % 7));
};

// Meeus/Jones/Butcher Gregorian computus.
const easterSunday = (year: number) => {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return toDateString(year, month, day);
};


export function buildHolidays(proclaimed: Proclamations, proclaimedNot: Proclamations): Holiday[] {
	const proclaimedDates = Object.values(proclaimed)
		.flatMap((territories) => Object.values(territories).flatMap((dates) => dates ?? []))
		.sort();
	if (!proclaimedDates.length) return [];

	const firstDate = proclaimedDates[0];
	const lastDate = proclaimedDates.at(-1) as string;
	const firstYear = Number(firstDate.slice(0, 4));
	const lastYear = Number(lastDate.slice(0, 4));
	const excluded = new Set<string>();
	for (const territories of Object.values(proclaimedNot)) {
		for (const [territory, dates] of Object.entries(territories) as [Territory, string[]][]) {
			for (const date of dates) excluded.add(`${territory}|${date}`);
		}
	}

	const byDate = new Map<string, Map<Territory, Set<string>>>();
	const proclamationsByDate = new Map<string, Map<Territory, Set<string>>>();
	const add = (date: string, territory: Territory, reason: string) => {
		if (date < firstDate || date > lastDate) return;
		let byTerritory = byDate.get(date);
		if (!byTerritory) {
			byTerritory = new Map();
			byDate.set(date, byTerritory);
		}
		let reasons = byTerritory.get(territory);
		if (!reasons) {
			reasons = new Set();
			byTerritory.set(territory, reasons);
		}
		reasons.add(reason);
	};
	const addStatutory = (date: string, territory: Territory, reason: string) => {
		if (!excluded.has(`${territory}|${date}`)) add(date, territory, `${reason} (statutory bank holiday)`);
	};

	for (const [notice, territories] of Object.entries(proclaimed)) {
		for (const [territory, dates] of Object.entries(territories) as [Territory, string[]][]) {
			for (const date of dates) {
				add(date, territory, 'Proclaimed bank holiday');
				let byTerritory = proclamationsByDate.get(date);
				if (!byTerritory) {
					byTerritory = new Map();
					proclamationsByDate.set(date, byTerritory);
				}
				let notices = byTerritory.get(territory);
				if (!notices) {
					notices = new Set();
					byTerritory.set(territory, notices);
				}
				notices.add(notice);
			}
		}
	}

	for (let year = firstYear; year <= lastYear; year += 1) {
		const easter = easterSunday(year);
		const goodFriday = addDays(easter, -2);
		const easterMonday = addDays(easter, 1);
		const mayLastMonday = lastMonday(year, 5);
		const augustLastMonday = lastMonday(year, 8);
		const christmas = toDateString(year, 12, 25);
		const boxingDay = toDateString(year, 12, 26);
		const christmasIsSunday = dayOfWeek(year, 12, 25) === 0;
		const boxingDayIsSunday = dayOfWeek(year, 12, 26) === 0;

		for (const territory of ['England and Wales', 'Northern Ireland'] as Territory[]) {
			addStatutory(easterMonday, territory, 'Easter Monday');
			addStatutory(mayLastMonday, territory, 'Last Monday in May');
			addStatutory(augustLastMonday, territory, 'Last Monday in August');
			if (!boxingDayIsSunday) addStatutory(boxingDay, territory, '26 December');
			if (christmasIsSunday || boxingDayIsSunday) {
				addStatutory(toDateString(year, 12, 27), territory, '27 December substitute');
			}
			add(goodFriday, territory, 'Good Friday (common law holiday)');
			add(christmas, territory, 'Christmas Day (common law holiday)');
		}

		const stPatricksDay = toDateString(year, 3, 17);
		const stPatricksIsSunday = dayOfWeek(year, 3, 17) === 0;
		addStatutory(
			stPatricksIsSunday ? toDateString(year, 3, 18) : stPatricksDay,
			'Northern Ireland',
			stPatricksIsSunday ? 'St Patrick’s Day substitute' : 'St Patrick’s Day',
		);

		const newYearsDay = toDateString(year, 1, 1);
		const secondJanuary = toDateString(year, 1, 2);
		const newYearsDayIsSunday = dayOfWeek(year, 1, 1) === 0;
		const secondJanuaryIsSunday = dayOfWeek(year, 1, 2) === 0;
		addStatutory(
			newYearsDayIsSunday ? toDateString(year, 1, 3) : newYearsDay,
			'Scotland',
			newYearsDayIsSunday ? 'New Year’s Day substitute' : 'New Year’s Day',
		);
		addStatutory(
			secondJanuaryIsSunday ? toDateString(year, 1, 3) : secondJanuary,
			'Scotland',
			secondJanuaryIsSunday ? '2 January substitute' : '2 January',
		);
		addStatutory(goodFriday, 'Scotland', 'Good Friday');
		addStatutory(firstMonday(year, 5), 'Scotland', 'First Monday in May');
		addStatutory(firstMonday(year, 8), 'Scotland', 'First Monday in August');

		const stAndrewsDay = toDateString(year, 11, 30);
		const stAndrewsWeekday = dayOfWeek(year, 11, 30);
		addStatutory(
			stAndrewsWeekday === 0 ? addDays(stAndrewsDay, 1) : stAndrewsWeekday === 6 ? addDays(stAndrewsDay, 2) : stAndrewsDay,
			'Scotland',
			stAndrewsWeekday === 0 || stAndrewsWeekday === 6 ? 'St Andrew’s Day substitute' : 'St Andrew’s Day',
		);
		addStatutory(
			christmasIsSunday ? boxingDay : christmas,
			'Scotland',
			christmasIsSunday ? 'Christmas Day substitute' : 'Christmas Day',
		);
	}

	return [...byDate.entries()]
		.map(([date, byTerritory]) => ({
			date,
			territories: territoryOrder.filter((territory) => byTerritory.has(territory)),
			reasonsByTerritory: Object.fromEntries(
				[...byTerritory].map(([territory, reasons]) => [territory, [...reasons]]),
			),
			proclamationsByTerritory: Object.fromEntries(
				[...(proclamationsByDate.get(date) ?? [])].map(([territory, notices]) => [territory, [...notices]]),
			),
		}))
		.sort((a, b) => a.date.localeCompare(b.date));
}
