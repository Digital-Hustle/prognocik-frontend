import type { BitrixSyncItem, BitrixSyncReport, BitrixSyncRq } from "@/entities/Bitrix24";
import type { Account } from "@/entities/Company";
import type { Employee } from "@/entities/Employee";
import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import type { CalendarItem } from "@/entities/PaymentCalendar";
import { addDays } from "@/shared/lib/date/date";
import { amount, cents, closedDay, makePlan, now } from "./data";
import type { AccountData } from "./data";

/** Налоговый календарь для демо: справочные даты, без сумм (как в боевом контракте) */
export function demoTaxCalendar(year: number) {
	const d = (m: number, day: number) => `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	const items: Array<[string, string, string, string]> = [];
	for (let m = 1; m <= 12; m++) {
		items.push([d(m, 28), "Уплата НДС (1/3 за прошлый квартал)", "VAT", "VAT_PAYER"]);
		items.push([d(m, 25), "Уплата НДФЛ за удержанный период", "NDFL", "EMPLOYER"]);
	}
	items.push([d(4, 28), "Авансовый платёж по УСН за 1 квартал", "USN_ADVANCE", "USN"]);
	items.push([d(7, 28), "Авансовый платёж по УСН за полугодие", "USN_ADVANCE", "USN"]);
	items.push([d(10, 28), "Авансовый платёж по УСН за 9 месяцев", "USN_ADVANCE", "USN"]);
	items.push([d(3, 28), "Налог на прибыль за прошлый год", "PROFIT", "LEGAL_ENTITY"]);
	return {
		year,
		items: items
			.sort((a, b) => (a[0] < b[0] ? -1 : 1))
			.map(([dueDate, title, taxCode, audience]) => ({
				dueDate,
				title,
				taxCode,
				audience,
				sourceUrl: "https://www.nalog.gov.ru/rn77/taxation/calendar/",
			})),
	};
}

const DEALS: Array<{
	id: string;
	kind: "DEAL" | "INVOICE";
	title: string;
	sum: string;
	days: number;
	p: number | null;
}> = [
	{ id: "D-1042", kind: "DEAL", title: "Поставка оборудования — ООО «Вектор»", sum: "850000.00", days: 6, p: 70 },
	{ id: "D-1051", kind: "DEAL", title: "Сопровождение проекта — АО «Север»", sum: "320000.00", days: 12, p: 50 },
	{ id: "D-1063", kind: "DEAL", title: "Лицензии на 3 года — ИП Орлов", sum: "480000.00", days: 21, p: 90 },
	{ id: "INV-318", kind: "INVOICE", title: "Счёт № 318 — ООО «Прогресс»", sum: "210000.00", days: 4, p: null },
	{ id: "INV-322", kind: "INVOICE", title: "Счёт № 322 — ООО «Линия»", sum: "145500.00", days: 9, p: null },
];

const planFor = (plans: ExpectedPayment[], externalId: string) =>
	plans.find((p) => p.sourceDocument?.externalSystem === "BITRIX24" && p.sourceDocument.externalId === externalId);

export function demoBitrixStatus(data: AccountData) {
	const active = data.plans.filter(
		(p) =>
			p.sourceDocument?.externalSystem === "BITRIX24" && (p.status === "OPEN" || p.status === "PARTIALLY_SETTLED")
	);
	return {
		webhookConfigured: false,
		configuredPortal: null,
		allowedHostSuffixes: [".bitrix24.ru", ".bitrix24.com"],
		demoAvailable: true,
		activePlans: active.length,
		activeAmount: amount(active.reduce((s, p) => s + cents(p.remainingAmount), 0n)),
		lastSyncedAt: data.plans.some((p) => p.sourceDocument?.externalSystem === "BITRIX24") ? now() : null,
	};
}

/** Демо-синхронизация: повторный запуск ничего не меняет, один документ «выигран» и пропускается */
export function demoBitrixSync(account: Account, data: AccountData, rq: BitrixSyncRq): BitrixSyncReport {
	const horizon = rq.horizonDays ?? 30;
	const dryRun = Boolean(rq.dryRun);
	const items: BitrixSyncItem[] = [];
	const rows = DEALS.filter((x) => (x.kind === "DEAL" ? rq.includeDeals !== false : rq.includeInvoices !== false));
	for (const x of rows) {
		const dueDate = addDays(closedDay, x.days);
		const weight = rq.weightByProbability && x.p ? x.p / 100 : 1;
		const planAmount = amount(BigInt(Math.round(Number(cents(x.sum)) * weight)));
		const base = {
			kind: x.kind,
			externalId: x.id,
			title: x.title,
			documentAmount: x.sum,
			dueDate,
			stage: "OPEN" as const,
			probability: x.kind === "DEAL" ? x.p : null,
		};
		if (x.days > horizon) {
			items.push({ ...base, planAmount: null, action: "SKIPPED", reason: "OUT_OF_HORIZON", planId: null });
			continue;
		}
		const existing = planFor(data.plans, x.id);
		if (!existing) {
			let planId: string | null = null;
			if (!dryRun) {
				const plan = makePlan(account, {
					title: x.title,
					direction: "IN",
					amount: planAmount,
					remainingAmount: planAmount,
					dueDate,
					categoryCode: "CUSTOMERS",
					counterpartyKey: null,
					source: x.kind === "DEAL" ? "CONTRACT" : "INVOICE",
					sourceDocument: {
						externalSystem: "BITRIX24",
						externalId: x.id,
						documentNumber: x.id,
						issuedDate: closedDay,
					},
				});
				data.plans.unshift(plan);
				planId = plan.id;
			}
			items.push({ ...base, planAmount, action: "CREATED", reason: null, planId });
		} else if (existing.status === "CANCELLED") {
			if (!dryRun) {
				existing.status = "OPEN";
				existing.amount = planAmount;
				existing.remainingAmount = planAmount;
				existing.version++;
			}
			items.push({ ...base, planAmount, action: "REOPENED", reason: null, planId: existing.id });
		} else if (existing.amount !== planAmount) {
			if (!dryRun) {
				existing.amount = planAmount;
				existing.remainingAmount = planAmount;
				existing.version++;
			}
			items.push({ ...base, planAmount, action: "UPDATED", reason: null, planId: existing.id });
		} else {
			items.push({ ...base, planAmount, action: "UNCHANGED", reason: null, planId: existing.id });
		}
	}
	items.push({
		kind: "DEAL",
		externalId: "D-0987",
		title: "Монтаж линии — ООО «Альфа»",
		documentAmount: "1200000.00",
		planAmount: null,
		dueDate: addDays(closedDay, -3),
		stage: "WON",
		probability: 100,
		action: "SKIPPED",
		reason: "WON",
		planId: null,
	});
	const count = (a: BitrixSyncItem["action"]) => items.filter((i) => i.action === a).length;
	const changed = count("CREATED") + count("UPDATED") + count("REOPENED") + count("CANCELLED") > 0;
	return {
		mode: rq.mode ?? "LIVE",
		portal: "demo.bitrix24.ru",
		dryRun,
		from: closedDay,
		to: addDays(closedDay, horizon),
		fetched: items.length,
		created: count("CREATED"),
		updated: count("UPDATED"),
		reopened: count("REOPENED"),
		cancelled: count("CANCELLED"),
		unchanged: count("UNCHANGED"),
		skipped: count("SKIPPED"),
		dataChanged: changed && !dryRun,
		items,
	};
}

/** Календарь платежей из открытых исходящих планов плюс расчётные даты подтверждённых регулярных платежей */
export function demoPaymentCalendar(account: Account, data: AccountData, from: string, to: string, companyId: string) {
	const days: Array<{ date: string; totals: ReturnType<typeof totals>; items: CalendarItem[] }> = [];
	const open = data.plans.filter(
		(p) => p.direction === "OUT" && (p.status === "OPEN" || p.status === "PARTIALLY_SETTLED")
	);
	const toItem = (p: ExpectedPayment): CalendarItem => ({
		id: p.id,
		kind: "PLANNED" as const,
		expectedPaymentId: p.id,
		recurringPatternId: null,
		title: p.title,
		dueDate: p.dueDate,
		nominalDate: null,
		categoryCode: p.categoryCode,
		counterpartyKey: p.counterpartyKey,
		source: p.source,
		sourceDocument: p.sourceDocument,
		status: p.status,
		amount: p.amount,
		settledAmount: p.settledAmount,
		remainingAmount: p.remainingAmount,
		overdue: p.overdue,
		version: p.version,
	});
	function totals(
		items: Array<{ amount: string; settledAmount: string | null; remainingAmount: string; overdue: boolean }>
	) {
		const sum = (f: (i: (typeof items)[number]) => bigint) => items.reduce((s, i) => s + f(i), 0n);
		return {
			amount: amount(sum((i) => cents(i.amount))),
			settledAmount: amount(sum((i) => cents(i.settledAmount ?? "0.00"))),
			remainingAmount: amount(sum((i) => cents(i.remainingAmount))),
			overdueAmount: amount(sum((i) => (i.overdue ? cents(i.remainingAmount) : 0n))),
		};
	}
	for (let d = from; d <= to; d = addDays(d, 1)) {
		const items = open.filter((p) => p.dueDate === d).map(toItem);
		const dom = Number(d.slice(8));
		for (const r of data.recurring.filter((x) => x.status === "CONFIRMED" && x.direction === "OUT")) {
			if (r.schedule.frequency === "MONTHLY" && r.schedule.dayOfMonth === dom)
				items.push({
					id: `RECURRING:${r.id}:${d}`,
					kind: "RECURRING" as const,
					expectedPaymentId: null,
					recurringPatternId: r.id,
					title: r.categoryCode,
					dueDate: d,
					nominalDate: d,
					categoryCode: r.categoryCode,
					counterpartyKey: r.counterpartyKey,
					source: null,
					sourceDocument: null,
					status: null,
					amount: r.amount,
					settledAmount: null,
					remainingAmount: r.amount,
					overdue: false,
					version: r.version,
				});
		}
		days.push({ date: d, totals: totals(items), items });
	}
	const overdueBefore = open.filter((p) => p.dueDate < from).map(toItem);
	return {
		companyId,
		accountId: account.id,
		currency: "RUB",
		timezone: "Europe/Moscow",
		today: closedDay,
		dataVersion: 0,
		fromDate: from,
		toDate: to,
		totals: totals(days.flatMap((d) => d.items)),
		days,
		overdueBeforeRangeAmount: totals(overdueBefore).remainingAmount,
		overdueBeforeRange: overdueBefore,
		warnings: ["SIMPLIFIED_BUSINESS_CALENDAR", "RECURRING_SETTLEMENT_UNKNOWN"],
	};
}

const employeesByCompany = new Map<string, Employee[]>();
export function demoEmployees(companyId: string): Employee[] {
	let list = employeesByCompany.get(companyId);
	if (!list) {
		list = [
			{
				id: crypto.randomUUID(),
				companyId,
				fullName: "Иван Петров",
				position: "Разработчик",
				note: "Оклад за полный месяц",
				archived: false,
				recurringPayment: null,
				version: 1,
				createdAt: now(),
				updatedAt: now(),
			},
			{
				id: crypto.randomUUID(),
				companyId,
				fullName: "Мария Соколова",
				position: "Бухгалтер",
				note: null,
				archived: false,
				recurringPayment: null,
				version: 1,
				createdAt: now(),
				updatedAt: now(),
			},
		];
		employeesByCompany.set(companyId, list);
	}
	return list;
}
