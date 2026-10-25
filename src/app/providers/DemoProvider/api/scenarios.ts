import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import type { Forecast, ForecastDay } from "@/entities/Forecast";
import { addDays, diffDays } from "@/shared/lib/date/date";
import { toNumber } from "@/shared/lib/format/money";

type Fail = (status: number, code: string, message: string) => never;

interface Change {
	type: string;
	planId?: string;
	delayDays?: number;
	percent?: number;
	fromDate?: string;
	amount?: string;
	date?: string;
	title?: string;
	target?: string;
}

const num = (v: string | null | undefined) => toNumber(v) ?? 0;
const money = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

interface Run {
	scenarioIn: number[];
	scenarioOut: number[];
	balance: number[];
	effects: Array<{
		movedAmount: number;
		droppedAmount: number;
		movedTo: string | null;
		planId: string | null;
		amount: number | null;
		date: string | null;
	}>;
}

function metrics(days: ForecastDay[], balance: number[], buffer: number) {
	let minIndex = 0;
	balance.forEach((b, i) => {
		if (b < balance[minIndex]) minIndex = i;
	});
	const gap = balance.findIndex((b) => b < 0);
	let shortfall = 0;
	let shortfallDate: string | null = null;
	if (gap >= 0) {
		for (let i = gap; i < balance.length; i++) {
			if (-balance[i] > shortfall) {
				shortfall = -balance[i];
				shortfallDate = days[i].date;
			}
		}
	}
	const breach = buffer > 0 ? balance.findIndex((b) => b < buffer) : -1;
	return {
		minimumBalance: money(balance[minIndex] ?? 0),
		minimumBalanceDate: days[minIndex]?.date ?? "",
		endBalance: money(balance[balance.length - 1] ?? 0),
		firstGapDate: gap >= 0 ? days[gap].date : null,
		balanceOnFirstGapDate: gap >= 0 ? money(balance[gap]) : null,
		maxShortfall: money(shortfall),
		maxShortfallDate: shortfallDate,
		daysBelowZero: balance.filter((b) => b < 0).length,
		firstBufferBreachDate: breach >= 0 ? days[breach].date : null,
	};
}

/** Те же правила, что у серверного расчёта (раздел 8.1): арифметика над дневными потоками готового прогноза */
function simulate(forecast: Forecast, plans: ExpectedPayment[], changes: Change[], fail: Fail): Run {
	const days = forecast.days;
	const first = days[0].date;
	const last = days[days.length - 1].date;
	const idx = (date: string) => diffDays(first, date);
	const inWindow = (date: string) => date >= first && date <= last;
	const inflow = days.map((d) => num(d.inflow));
	const outflow = days.map((d) => num(d.outflow));
	const effects: Run["effects"] = [];

	for (const c of changes) {
		const fx = {
			movedAmount: 0,
			droppedAmount: 0,
			movedTo: null as string | null,
			planId: c.planId ?? null,
			amount: null as number | null,
			date: null as string | null,
		};
		if (c.type === "DELAY_RECEIPT" || c.type === "DELAY_PAYMENT" || c.type === "CANCEL_PLAN") {
			const plan = plans.find((p) => p.id === c.planId);
			if (!plan) return fail(404, "NOT_FOUND", "План не найден");
			const wantIn = c.type === "DELAY_RECEIPT";
			if (c.type !== "CANCEL_PLAN" && (plan.direction === "IN") !== wantIn)
				return fail(422, "INVALID_SCENARIO", "Направление плана не подходит для этого рычага");
			if (forecast.scope !== "WITH_KNOWN_PLANS" || plan.dueDate > last)
				return fail(422, "PLAN_NOT_IN_FORECAST", "План не попал в базовый прогноз");
			if (c.type !== "CANCEL_PLAN" && (!c.delayDays || c.delayDays < 1 || c.delayDays > 90))
				return fail(422, "INVALID_SCENARIO", "Задержка: от 1 до 90 дней");
			const from = plan.dueDate < first ? first : plan.dueDate;
			const amount = num(plan.remainingAmount);
			const arr = plan.direction === "IN" ? inflow : outflow;
			arr[idx(from)] -= amount;
			fx.amount = amount;
			fx.date = from;
			if (c.type === "CANCEL_PLAN") fx.movedAmount = amount;
			else {
				const to = addDays(from, c.delayDays!);
				fx.movedTo = to;
				if (inWindow(to)) {
					arr[idx(to)] += amount;
					fx.movedAmount = amount;
				} else fx.droppedAmount = amount;
			}
		} else if (c.type === "REVENUE_DROP") {
			if (!c.percent || c.percent < 1 || c.percent > 100)
				return fail(422, "INVALID_SCENARIO", "Процент: от 1 до 100");
			const start = c.fromDate ? Math.max(0, idx(c.fromDate)) : 0;
			for (let i = start; i < days.length; i++) {
				const lost = inflow[i] * (c.percent / 100);
				inflow[i] -= lost;
				fx.movedAmount += lost;
			}
		} else if (c.type === "FIXED_COSTS_GROWTH") {
			if (!c.percent || c.percent < 1 || c.percent > 300)
				return fail(422, "INVALID_SCENARIO", "Процент: от 1 до 300");
			const start = c.fromDate ? Math.max(0, idx(c.fromDate)) : 0;
			for (let i = start; i < days.length; i++) {
				const base = c.target === "ALL_OUTFLOWS" ? outflow[i] : num(days[i].recurringOut);
				const added = base * (c.percent / 100);
				outflow[i] += added;
				fx.movedAmount += added;
			}
		} else if (c.type === "UNPLANNED_EXPENSE" || c.type === "UNPLANNED_INCOME") {
			const amount = num(c.amount);
			if (amount <= 0) return fail(422, "INVALID_SCENARIO", "Сумма должна быть больше нуля");
			if (!c.date || !inWindow(c.date))
				return fail(422, "SCENARIO_DATE_OUTSIDE_FORECAST", "Дата вне окна прогноза");
			(c.type === "UNPLANNED_EXPENSE" ? outflow : inflow)[idx(c.date)] += amount;
			fx.movedAmount = amount;
			fx.amount = amount;
			fx.date = c.date;
		} else return fail(422, "INVALID_SCENARIO", "Неизвестный рычаг");
		effects.push(fx);
	}

	let cumulative = 0;
	const balance = days.map((d, i) => {
		cumulative += inflow[i] - num(d.inflow) - (outflow[i] - num(d.outflow));
		return num(d.balance) + cumulative;
	});
	return { scenarioIn: inflow, scenarioOut: outflow, balance, effects };
}

function checkRq(forecast: Forecast | undefined, changes: Change[], fail: Fail, optional = false): Forecast {
	if (!forecast) return fail(422, "NO_FORECAST", "Прогноза ещё нет");
	if (!optional && (changes.length < 1 || changes.length > 10))
		return fail(422, "VALIDATION_FAILED", "Нужно от 1 до 10 рычагов");
	return forecast;
}

export function demoScenarioPreview(
	forecasts: Forecast[],
	plans: ExpectedPayment[],
	body: { forecastId?: string | null; changes?: Change[] },
	fail: Fail
) {
	const changes = body.changes ?? [];
	const forecast = checkRq(
		body.forecastId ? forecasts.find((f) => f.id === body.forecastId) : forecasts[0],
		changes,
		fail
	);
	const days = forecast.days;
	const buffer = num(forecast.settings?.bufferAmount);
	const baseBalance = days.map((d) => num(d.balance));
	const run = simulate(forecast, plans, changes, fail);
	const base = metrics(days, baseBalance, buffer);
	const scenario = metrics(days, run.balance, buffer);
	const newGap = !base.firstGapDate && Boolean(scenario.firstGapDate);
	const gapEarlier = Boolean(base.firstGapDate && scenario.firstGapDate && scenario.firstGapDate < base.firstGapDate);
	return {
		baseForecast: {
			id: forecast.id,
			asOfDate: forecast.asOfDate,
			scope: forecast.scope,
			staleness: forecast.staleness,
			createdAt: forecast.createdAt,
			startBalance: forecast.startBalance,
			bufferAmount: money(buffer),
		},
		comparison: {
			base,
			scenario,
			newGap,
			gapEarlier,
			additionalShortfall: money(Math.max(0, num(scenario.maxShortfall) - num(base.maxShortfall))),
			gapShiftDays: gapEarlier ? diffDays(base.firstGapDate!, scenario.firstGapDate!) : null,
		},
		days: days.map((d, i) => ({
			date: d.date,
			baseBalance: money(baseBalance[i]),
			scenarioBalance: money(run.balance[i]),
			delta: money(run.balance[i] - baseBalance[i]),
			baseInflow: money(num(d.inflow)),
			scenarioInflow: money(run.scenarioIn[i]),
			baseOutflow: money(num(d.outflow)),
			scenarioOutflow: money(run.scenarioOut[i]),
			scenarioBalanceP10:
				d.balanceP10 === null ? null : money(num(d.balanceP10) + run.balance[i] - baseBalance[i]),
			scenarioBalanceP50:
				d.balanceP50 === null ? null : money(num(d.balanceP50) + run.balance[i] - baseBalance[i]),
			scenarioBalanceP90:
				d.balanceP90 === null ? null : money(num(d.balanceP90) + run.balance[i] - baseBalance[i]),
		})),
		changes: changes.map((c, i) => {
			const solo = simulate(forecast, plans, [c], fail);
			const soloMin = Math.min(...solo.balance);
			const fx = run.effects[i];
			return {
				type: c.type,
				title: c.title ?? null,
				planId: fx.planId,
				amount: fx.amount === null ? null : money(fx.amount),
				date: fx.date,
				delayDays: c.delayDays ?? null,
				movedAmount: money(fx.movedAmount),
				droppedAmount: money(fx.droppedAmount),
				movedTo: fx.movedTo,
				endBalanceDelta: money(solo.balance[solo.balance.length - 1] - baseBalance[baseBalance.length - 1]),
				minimumBalanceDelta: money(soloMin - Math.min(...baseBalance)),
				note: null,
			};
		}),
		notes:
			forecast.staleness === "STALE"
				? [
						"Данные изменились после расчёта прогноза. Обновите прогноз, чтобы сценарий опирался на свежие цифры.",
					]
				: [],
	};
}

export function demoMaxPayment(
	forecasts: Forecast[],
	plans: ExpectedPayment[],
	body: { forecastId?: string | null; date?: string; keepBuffer?: boolean; changes?: Change[] },
	fail: Fail
) {
	const changes = body.changes ?? [];
	const forecast = checkRq(
		body.forecastId ? forecasts.find((f) => f.id === body.forecastId) : forecasts[0],
		changes,
		fail,
		true
	);
	const days = forecast.days;
	const first = days[0].date;
	if (!body.date || body.date < first || body.date > days[days.length - 1].date)
		return fail(422, "SCENARIO_DATE_OUTSIDE_FORECAST", "Дата вне окна прогноза");
	const buffer = num(forecast.settings?.bufferAmount);
	const floor = body.keepBuffer ? buffer : 0;
	const from = diffDays(first, body.date);
	const side = (balance: number[]) => {
		let limiting = from;
		for (let i = from; i < balance.length; i++) if (balance[i] < balance[limiting]) limiting = i;
		return {
			maxAmount: money(Math.max(0, balance[limiting] - floor)),
			limitingDate: days[limiting].date,
			limitingBalance: money(balance[limiting]),
		};
	};
	const baseBalance = days.map((d) => num(d.balance));
	const run = changes.length ? simulate(forecast, plans, changes, fail) : null;
	const notes: string[] = [];
	const scenario = side(run?.balance ?? baseBalance);
	if (Number(scenario.maxAmount) === 0)
		notes.push("Разрыв будет и без этого платежа: платить на выбранную дату нельзя.");
	return {
		baseForecast: {
			id: forecast.id,
			asOfDate: forecast.asOfDate,
			scope: forecast.scope,
			staleness: forecast.staleness,
		},
		date: body.date,
		keepBuffer: Boolean(body.keepBuffer),
		floor: money(floor),
		base: side(baseBalance),
		scenario,
		changes: [],
		notes,
	};
}
