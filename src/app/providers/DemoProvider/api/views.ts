import type { CategoryAnalytics, CounterpartyAnalytics } from "@/entities/Analytics";
import type { ChatRq, ChatRs } from "@/entities/Assistant";
import type { Account, Company } from "@/entities/Company";
import type { Dashboard, Forecast, GapDetails } from "@/entities/Forecast";
import type { Payment } from "@/entities/Payment";
import type { PlanFact, PlanFactTotals } from "@/entities/PlanFact";
import { addDays, diffDays, todayIso } from "@/shared/lib/date/date";
import { amount, cents, closedDay, now, total } from "./data";
import type { AccountData } from "./data";

export function filteredPayments(data: AccountData, params: URLSearchParams): Payment[] {
	const from = params.get("fromDate"),
		to = params.get("toDate"),
		direction = params.get("direction"),
		category = params.get("categoryCode");
	const search = params.get("q")?.trim().toLocaleLowerCase("ru");
	return data.payments
		.filter(
			(p) =>
				p.status === "ACTIVE" &&
				(!from || p.operationDate >= from) &&
				(!to || p.operationDate <= to) &&
				(!direction || p.direction === direction) &&
				(!category || p.categoryCode === category) &&
				(!search ||
					[p.purpose, p.counterpartyName, p.counterpartyInn].some((v) =>
						v?.toLocaleLowerCase("ru").includes(search)
					))
		)
		.sort((a, b) =>
			params.get("sort")?.includes("asc")
				? a.operationDate.localeCompare(b.operationDate)
				: b.operationDate.localeCompare(a.operationDate)
		);
}

export function analytics(
	account: Account,
	data: AccountData,
	params: URLSearchParams,
	counterparties: boolean
): CategoryAnalytics | CounterpartyAnalytics {
	const payments = filteredPayments(data, params);
	const totals = (["IN", "OUT"] as const)
		.filter((direction) => !params.get("direction") || direction === params.get("direction"))
		.map((direction) => {
			const rows = payments.filter((p) => p.direction === direction);
			return { direction, amount: total(rows.map((p) => p.amount)), paymentCount: rows.length };
		});
	const groups = new Map<string, Payment[]>();
	for (const payment of payments) {
		const key = `${payment.direction}:${counterparties ? payment.counterpartyKey : payment.categoryCode}`;
		groups.set(key, [...(groups.get(key) ?? []), payment]);
	}
	const items = [...groups.values()]
		.map((rows) => {
			const first = rows[0];
			const sum = total(rows.map((p) => p.amount));
			const all = totals.find((t) => t.direction === first.direction)!.amount;
			return {
				direction: first.direction,
				amount: sum,
				paymentCount: rows.length,
				sharePercent: cents(all) ? ((Number(cents(sum)) / Number(cents(all))) * 100).toFixed(2) : "0.00",
				categoryCode: first.categoryCode,
				counterpartyKey: first.counterpartyKey,
				counterpartyInn: first.counterpartyInn,
				counterpartyName: first.counterpartyName,
			};
		})
		.sort((a, b) => Number(cents(b.amount) - cents(a.amount)));
	return {
		companyId: account.companyId,
		accountId: account.id,
		fromDate: params.get("fromDate") ?? addDays(closedDay, -29),
		toDate: params.get("toDate") ?? closedDay,
		direction: params.get("direction") === "IN" ? "IN" : params.get("direction") === "OUT" ? "OUT" : null,
		totals,
		items,
	};
}

export function dashboard(company: Company, account: Account, data: AccountData): Dashboard {
	const forecast = data.forecasts[0] ?? null;
	for (const gap of forecast?.gaps ?? []) {
		if (!data.alerts.some((alert) => alert.gapId === gap.id))
			data.alerts.push({
				id: gap.id,
				companyId: company.id,
				accountId: account.id,
				forecastId: forecast!.id,
				gapId: gap.id,
				planId: null,
				code: "CASH_GAP",
				title: "Возможен кассовый разрыв",
				message: "Платежи поставщикам опережают поступления от клиентов",
				fromDate: gap.fromDate,
				toDate: gap.toDate,
				amount: gap.expectedShortfall,
				probability: gap.probability,
				active: true,
				acknowledgedAt: null,
				staleness: forecast!.staleness,
				inputDataVersion: company.dataVersion,
				createdAt: now(),
			});
	}
	return {
		companyId: company.id,
		accountId: account.id,
		asOfDate: closedDay,
		lastDataDate:
			account.latestBalanceDate && account.latestBalanceDate < closedDay
				? account.latestBalanceDate
				: account.latestBalanceDate
					? closedDay
					: null,
		suggestedAsOfDate:
			account.latestBalanceDate && account.latestBalanceDate < closedDay ? account.latestBalanceDate : closedDay,
		dataVersion: company.dataVersion,
		currentBalance:
			account.latestBalance !== null && account.latestBalanceDate
				? {
						balance: account.latestBalance,
						date: account.latestBalanceDate,
						startBalanceDate: data.imports[0]?.fromDate ?? account.latestBalanceDate,
					}
				: null,
		latestForecast: forecast,
		latestBacktest: data.backtests[0] ?? null,
		refresh: {
			needsRefresh: forecast?.staleness === "STALE",
			autoRefreshEnabled: false,
			dataVersion: company.dataVersion,
			latestForecastInputVersion: forecast?.inputDataVersion ?? 0,
		},
		activeAlerts: data.alerts.filter(
			(alert) => alert.active && !alert.acknowledgedAt && alert.forecastId === forecast?.id
		),
		upcomingPayments: data.plans
			.filter((plan) => plan.status === "OPEN" || plan.status === "PARTIALLY_SETTLED")
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
			.slice(0, 10)
			.map((plan) => ({
				id: plan.id,
				title: plan.title,
				dueDate: plan.dueDate,
				remainingAmount: plan.remainingAmount,
				direction: plan.direction,
			})),
		quality: account.latestBalance === null ? "INSUFFICIENT" : "GOOD",
		runningJobs: data.jobs.filter((job) => job.status === "RUNNING" || job.status === "QUEUED"),
		permissions: { canRead: true, canWrite: true, canManageMembers: true },
	};
}

export function gapDetails(forecast: Forecast, gapId: string, data: AccountData): GapDetails | null {
	const gap = forecast.gaps.find((item) => item.id === gapId);
	if (!gap) return null;
	const factor = (direction: "IN" | "OUT") =>
		data.plans
			.filter((p) => p.direction === direction && p.status !== "CANCELLED")
			.map((p) => ({
				id: p.id,
				kind: "PLAN",
				source: "MANUAL",
				title: p.title,
				categoryCode: p.categoryCode,
				date: p.dueDate,
				nominalDate: null,
				direction,
				amount: p.remainingAmount,
				inGapPeriod: p.dueDate >= gap.fromDate && p.dueDate <= gap.toDate,
			}));
	return {
		forecastId: forecast.id,
		snapshotId: forecast.snapshotId,
		gapId,
		asOfDate: forecast.asOfDate,
		inputDataVersion: forecast.inputDataVersion,
		staleness: forecast.staleness,
		createdAt: forecast.createdAt,
		gap,
		explanation: "Крупная оплата поставщику запланирована раньше поступления от заказчика.",
		mandatoryOutflows: factor("OUT"),
		expectedInflows: factor("IN"),
		overduePlans: data.plans.filter((p) => p.overdue && p.status === "OPEN"),
		projectedFlows: forecast.days,
		dataLimitations: forecast.warnings,
		recommendations: [
			{
				code: "MOVE_PAYMENT",
				title: "Согласовать перенос платежа",
				message: "Обсудите с поставщиком оплату после поступления от заказчика.",
				relatedPlanIds: data.plans.filter((p) => p.direction === "OUT").map((p) => p.id),
			},
		],
	};
}

const zeroTotals = (): PlanFactTotals => ({
	plannedIn: "0.00",
	plannedOut: "0.00",
	actualIn: "0.00",
	actualOut: "0.00",
	varianceIn: "0.00",
	varianceOut: "0.00",
	settledIn: "0.00",
	settledOut: "0.00",
	remainingIn: "0.00",
	remainingOut: "0.00",
	unplannedIn: "0.00",
	unplannedOut: "0.00",
	overdueRemainingIn: "0.00",
	overdueRemainingOut: "0.00",
});

export function planFact(account: Account, data: AccountData, params: URLSearchParams): PlanFact {
	const fromDate = params.get("fromDate") ?? addDays(closedDay, -29),
		toDate = params.get("toDate") ?? closedDay;
	const groupBy = params.get("groupBy") === "WEEK" ? "WEEK" : "DAY";
	const totals = zeroTotals();
	const periods: PlanFact["periods"] = [];
	const step = groupBy === "WEEK" ? 7 : 1;
	for (let i = 0; i <= Math.min(730, diffDays(fromDate, toDate)); i += step) {
		const periodStart = addDays(fromDate, i),
			periodEnd = addDays(periodStart, Math.min(step - 1, diffDays(periodStart, toDate)));
		const plans = data.plans.filter(
			(p) => p.dueDate >= periodStart && p.dueDate <= periodEnd && p.status !== "CANCELLED"
		);
		const payments = data.payments.filter(
			(p) => p.operationDate >= periodStart && p.operationDate <= periodEnd && p.status === "ACTIVE"
		);
		const values = zeroTotals();
		for (const direction of ["IN", "OUT"] as const) {
			const suffix = direction === "IN" ? "In" : "Out";
			const matchedPlans = plans.filter((p) => p.direction === direction),
				matchedPayments = payments.filter((p) => p.direction === direction);
			values[`planned${suffix}`] = total(matchedPlans.map((p) => p.amount));
			values[`actual${suffix}`] = total(matchedPayments.map((p) => p.amount));
			values[`variance${suffix}`] = amount(cents(values[`actual${suffix}`]) - cents(values[`planned${suffix}`]));
			values[`settled${suffix}`] = total(matchedPlans.map((p) => p.settledAmount));
			values[`remaining${suffix}`] = total(matchedPlans.map((p) => p.remainingAmount));
			values[`unplanned${suffix}`] = total(
				matchedPayments.map((p) => amount(cents(p.amount) - cents(p.allocatedAmount ?? "0.00")))
			);
			values[`overdueRemaining${suffix}`] = total(
				matchedPlans.filter((p) => p.overdue).map((p) => p.remainingAmount)
			);
		}
		for (const key of Object.keys(totals) as (keyof PlanFactTotals)[])
			totals[key] = total([totals[key], values[key]]);
		periods.push({
			periodStart,
			periodEnd,
			...values,
			overduePlans: plans
				.filter((p) => p.overdue)
				.map((p) => ({
					id: p.id,
					title: p.title,
					direction: p.direction,
					dueDate: p.dueDate,
					amount: p.amount,
					settledAmount: p.settledAmount,
					remainingAmount: p.remainingAmount,
				})),
			unplannedFacts: payments
				.filter((p) => cents(p.amount) > cents(p.allocatedAmount ?? "0.00"))
				.map((p) => ({
					id: p.id,
					operationDate: p.operationDate,
					direction: p.direction,
					amount: p.amount,
					unallocatedAmount: amount(cents(p.amount) - cents(p.allocatedAmount ?? "0.00")),
					counterpartyName: p.counterpartyName,
					categoryCode: p.categoryCode,
				})),
		});
	}
	return {
		companyId: account.companyId,
		accountId: account.id,
		fromDate,
		toDate,
		groupBy,
		today: todayIso(),
		totals,
		periods,
	};
}

export function assistantAnswer(account: Account, company: Company, data: AccountData, body: ChatRq): ChatRs {
	const forecast = body.forecastId ? data.forecasts.find((f) => f.id === body.forecastId) : data.forecasts[0];
	const outOfScope = /погода|анекдот|стих|политик/i.test(body.message);
	const clarify = !body.fromDate && /за период|сравни периоды/i.test(body.message);
	return {
		answer: outOfScope
			? "Я помогаю разобраться с операциями, планами и прогнозом по счёту. Задайте вопрос о деньгах бизнеса."
			: clarify
				? "За какой период нужно посмотреть операции?"
				: `Последний остаток по счёту — ${account.latestBalance ?? "неизвестен"} ₽. ${forecast?.firstExpectedGapDate ? `Прогноз показывает возможный разрыв с ${forecast.firstExpectedGapDate}: оплата поставщику происходит раньше поступления от клиента. Можно проверить перенос платежа в сценарии «Что если».` : "По текущему прогнозу разрыв не ожидается."}`,
		model: "demo",
		asOfDate: closedDay,
		dataVersion: company.dataVersion,
		forecastAvailable: Boolean(forecast),
		forecastStale: forecast?.staleness === "STALE",
		status: outOfScope
			? "OUT_OF_SCOPE"
			: clarify
				? "NEEDS_CLARIFICATION"
				: account.latestBalance === null
					? "INSUFFICIENT_DATA"
					: "ANSWERED",
		sources: [
			{
				id: "S1",
				type: "DASHBOARD",
				href: "",
				asOfDate: closedDay,
				dataVersion: company.dataVersion,
				fromDate: body.fromDate ?? null,
				toDate: body.toDate ?? null,
				forecastId: forecast?.id ?? null,
				snapshotId: forecast?.snapshotId ?? null,
				staleness: forecast?.staleness ?? null,
			},
		],
		facts:
			account.latestBalance === null
				? []
				: [{ id: "F1", sourceId: "S1", text: `Последний остаток: ${account.latestBalance} ₽` }],
		warnings: forecast?.staleness === "STALE" ? ["Данные изменились после расчёта прогноза"] : [],
	};
}
