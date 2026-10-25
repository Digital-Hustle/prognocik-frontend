import type { DailyActual, CompletenessRange, BalanceAnchor } from "@/entities/AccountHistory";
import type { Backtest, ConfusionMatrix, ModelScore } from "@/entities/Backtest";
import type { Company, Account, Permissions } from "@/entities/Company";
import type { ExpectedPayment, Allocation } from "@/entities/ExpectedPayment";
import type { Forecast, Alert } from "@/entities/Forecast";
import type { ForecastSettings } from "@/entities/ForecastSettings";
import type { StatementImport } from "@/entities/Import";
import type { Job } from "@/entities/Job";
import type { Payment, Category } from "@/entities/Payment";
import type { RecurringPattern } from "@/entities/Recurring";
import { DEMO_ACCOUNT_ID, DEMO_COMPANY_ID } from "@/shared/config/demoMode";
import { addDays, diffDays, todayIso } from "@/shared/lib/date/date";

export const now = () => new Date().toISOString();
export const closedDay = addDays(todayIso(), -1);
export const id = () => crypto.randomUUID();
export const money = (rubles: number) => rubles.toFixed(2);
export const cents = (value: string) => {
	const negative = value.startsWith("-");
	const [rubles, fraction = ""] = value.replace("-", "").split(".");
	const valueInCents = BigInt(rubles || "0") * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
	return negative ? -valueInCents : valueInCents;
};
export const amount = (value: bigint) =>
	`${value < 0n ? "-" : ""}${(value < 0n ? -value : value) / 100n}.${String((value < 0n ? -value : value) % 100n).padStart(2, "0")}`;
export const total = (values: string[]) => amount(values.reduce((sum, value) => sum + cents(value), 0n));

export const permissions: Permissions = {
	canEditCompany: true,
	canManageMembers: true,
	canImport: true,
	canEditPayments: true,
	canManagePlans: true,
	canRunForecast: true,
	canRunBacktest: true,
};
export const categories: Category[] = [
	{ code: "SALES", name: "Выручка", directions: ["IN"], system: true },
	{ code: "SUPPLIERS", name: "Поставщики", directions: ["OUT"], system: true },
	{ code: "RENT", name: "Аренда", directions: ["OUT"], system: true },
	{ code: "SALARY", name: "Зарплата", directions: ["OUT"], system: true },
	{ code: "TAX", name: "Налоги", directions: ["OUT"], system: true },
	{ code: "OTHER", name: "Прочее", directions: ["IN", "OUT"], system: true },
];

export function makeCompany(companyId = DEMO_COMPANY_ID): Company {
	return {
		id: companyId,
		name: "ООО «Зелёная мастерская»",
		legalForm: "OOO",
		inn: "7707083893",
		kpp: "770701001",
		timezone: "Europe/Moscow",
		ownerUserId: "de000000-0000-4000-8000-000000000003",
		myRole: "OWNER",
		permissions,
		archived: false,
		dataVersion: 1,
		version: 0,
		createdAt: now(),
		updatedAt: now(),
	};
}
export function makeAccount(companyId = DEMO_COMPANY_ID, accountId = DEMO_ACCOUNT_ID, seeded = true): Account {
	return {
		id: accountId,
		companyId,
		name: "Основной счёт",
		bankName: "Центр-инвест",
		accountNumber: "40702810000000001234",
		externalCompanyId: null,
		currency: "RUB",
		archived: false,
		latestBalance: seeded ? "1240000.00" : null,
		latestBalanceDate: seeded ? closedDay : null,
		version: 0,
		createdAt: now(),
		updatedAt: now(),
	};
}

export interface AccountData {
	payments: Payment[];
	plans: ExpectedPayment[];
	allocations: Allocation[];
	recurring: RecurringPattern[];
	imports: StatementImport[];
	completeness: CompletenessRange[];
	anchors: BalanceAnchor[];
	forecasts: Forecast[];
	backtests: Backtest[];
	jobs: Job[];
	alerts: Alert[];
	settings: ForecastSettings;
	duplicateDecisions: Set<string>;
}

export function makePayment(account: Account, overrides: Partial<Payment> = {}): Payment {
	return {
		id: id(),
		companyId: account.companyId,
		accountId: account.id,
		importId: null,
		externalOperationId: null,
		sourceRow: null,
		operationDate: closedDay,
		amount: "18000.00",
		direction: "OUT",
		counterpartyKey: "supplier",
		counterpartyInn: "7707083893",
		counterpartyName: "ООО «Материалы»",
		purpose: "Оплата материалов",
		categoryCode: "SUPPLIERS",
		categorySource: "RULE",
		ruleVersion: "1",
		balanceEod: null,
		allocatedAmount: "0.00",
		version: 0,
		knownAt: now(),
		createdAt: now(),
		source: "STATEMENT",
		note: null,
		status: "ACTIVE",
		voidedAt: null,
		voidReason: null,
		replacementPaymentId: null,
		dayStatus: "OBSERVED",
		requiresCompletenessConfirmation: false,
		...overrides,
	};
}

export function makePlan(account: Account, overrides: Partial<ExpectedPayment> = {}): ExpectedPayment {
	return {
		id: id(),
		companyId: account.companyId,
		accountId: account.id,
		title: "Поставка материалов",
		direction: "OUT",
		amount: "1500000.00",
		dueDate: addDays(closedDay, 11),
		categoryCode: "SUPPLIERS",
		counterpartyKey: "supplier",
		note: null,
		relation: "ADDITIONAL",
		recurringPatternId: null,
		baselineCounterpartyKey: null,
		source: "MANUAL",
		sourceDocument: null,
		status: "OPEN",
		settledAmount: "0.00",
		remainingAmount: "1500000.00",
		overdue: false,
		knownAt: now(),
		createdAt: now(),
		updatedAt: now(),
		version: 0,
		...overrides,
	};
}

export function dailyHistory(account: Account, data: AccountData, from: string, to: string): DailyActual[] {
	const payments = data.payments.filter((payment) => payment.status === "ACTIVE");
	const anchor = [...data.anchors].sort((a, b) => b.date.localeCompare(a.date))[0];
	const endDate = anchor?.date ?? account.latestBalanceDate;
	const endBalance = anchor?.balance ?? account.latestBalance;
	const earliest =
		[...payments].sort((a, b) => a.operationDate.localeCompare(b.operationDate))[0]?.operationDate ?? endDate;
	return Array.from({ length: Math.max(0, Math.min(731, diffDays(from, to) + 1)) }, (_, i) => {
		const date = addDays(from, i);
		const onDay = payments.filter((payment) => payment.operationDate === date);
		const known = endDate && endBalance !== null && earliest && date >= earliest && date <= endDate;
		const confirmed = data.completeness.some(
			(range) => range.fromDate <= date && range.toDate >= date && range.completeness === "CONFIRMED_COMPLETE"
		);
		const after = payments.filter(
			(payment) => payment.operationDate > date && payment.operationDate <= (endDate ?? date)
		);
		const delta = after.reduce(
			(sum, payment) => sum + cents(payment.amount) * (payment.direction === "IN" ? 1n : -1n),
			0n
		);
		return {
			date,
			inflow: known || confirmed ? total(onDay.filter((p) => p.direction === "IN").map((p) => p.amount)) : null,
			outflow: known || confirmed ? total(onDay.filter((p) => p.direction === "OUT").map((p) => p.amount)) : null,
			balanceEod: known ? amount(cents(endBalance) - delta) : null,
			status: onDay.length ? "OBSERVED" : known || confirmed ? "ZERO_CONFIRMED" : "MISSING",
			paymentCount: onDay.length,
			balanceMismatch: false,
		};
	});
}

export function makeForecast(
	account: Account,
	data: AccountData,
	version: number,
	asOfDate = closedDay,
	scope: Forecast["scope"] = "WITH_KNOWN_PLANS"
): Forecast {
	let balance = cents(account.latestBalance ?? "0.00");
	const days = Array.from({ length: data.settings.horizonDays }, (_, i) => {
		const date = addDays(asOfDate, i + 1);
		const due =
			scope === "WITH_KNOWN_PLANS"
				? data.plans.filter((p) => p.dueDate === date && p.status !== "CANCELLED")
				: [];
		const plannedIn = total(due.filter((p) => p.direction === "IN").map((p) => p.remainingAmount));
		const plannedOut = total(due.filter((p) => p.direction === "OUT").map((p) => p.remainingAmount));
		const residualIn = money(28000 + (i % 5) * 1400);
		const residualOut = money(18000 + (i % 3) * 800);
		const recurringOut = i % 7 === 6 ? "32000.00" : "0.00";
		const inflow = total([plannedIn, residualIn]);
		const outflow = total([plannedOut, residualOut, recurringOut]);
		balance += cents(inflow) - cents(outflow);
		return {
			date,
			plannedIn,
			plannedOut,
			recurringIn: "0.00",
			recurringOut,
			residualIn,
			residualOut,
			inflow,
			outflow,
			balance: amount(balance),
			balanceP10: amount(balance - 9000000n),
			balanceP50: amount(balance),
			balanceP90: amount(balance + 9000000n),
			pBelowZero: balance < 0n ? 0.82 : 0.08,
			pBelowBuffer: balance < cents(data.settings.bufferAmount) ? 0.88 : 0.12,
		};
	});
	const minimum = days.reduce(
		(min, day) => (cents(day.balance) < min ? cents(day.balance) : min),
		cents(account.latestBalance ?? "0.00")
	);
	const negative = days.filter((day) => cents(day.balance) < 0n);
	const riskEstimate = {
		availability: "AVAILABLE" as const,
		method: "BOOTSTRAP",
		probability: negative.length ? 0.82 : 0.08,
		scenarioCount: data.settings.scenarioCount,
		calibrationOriginCount: 12,
		probabilityCalibrated: true,
		assumptions: ["Планы исполняются в указанные даты"],
	};
	return {
		id: id(),
		companyId: account.companyId,
		accountId: account.id,
		jobId: id(),
		asOfDate,
		horizonDays: data.settings.horizonDays,
		scope,
		algorithm: data.settings.algorithm,
		algorithmVersion: "1",
		settings: { ...data.settings },
		inputDataVersion: version,
		snapshotId: id(),
		staleness: "CURRENT",
		startBalance: account.latestBalance,
		startBalanceDate: account.latestBalanceDate,
		quality: "GOOD",
		warnings: [],
		riskEstimate,
		expectedMinimumBalance: amount(minimum),
		firstExpectedGapDate: negative[0]?.date ?? null,
		maxExpectedShortfall: amount(minimum < 0n ? -minimum : 0n),
		days,
		gaps: negative.length
			? [
					{
						id: id(),
						kind: "CASH_GAP",
						fromDate: negative[0].date,
						toDate: negative[negative.length - 1].date,
						threshold: "0.00",
						expectedMinimumBalance: amount(minimum),
						expectedShortfall: amount(-minimum),
						probability: 0.82,
						shortfallP50: amount(-minimum),
						shortfallP90: amount(-minimum + 9000000n),
						shortfallBasis: "SCENARIOS",
						riskEstimateAvailability: "AVAILABLE",
					},
				]
			: [],
		trace: [
			{
				seq: 1,
				stage: "TRAINING_WINDOW",
				message: "Подготовлена история операций",
				data: { from: addDays(asOfDate, -data.settings.windowWeeks * 7), to: asOfDate },
			},
			...days.map((day, i) => ({
				seq: i + 2,
				stage: "DAY",
				message: `Расчёт на ${day.date}`,
				data: { balance: day.balance },
			})),
			{
				seq: days.length + 2,
				stage: "RISK",
				message: "Оценены сценарии и вероятность разрыва",
				data: { scenarios: String(data.settings.scenarioCount) },
			},
		],
		createdAt: now(),
	};
}

export function matrix(
	rows: { forecastBalance: string; actualBalance: string }[],
	threshold = "0.00"
): ConfusionMatrix {
	let tp = 0,
		fp = 0,
		fn = 0,
		tn = 0;
	for (const row of rows) {
		const predicted = cents(row.forecastBalance) < cents(threshold),
			actual = cents(row.actualBalance) < cents(threshold);
		if (predicted && actual) tp++;
		else if (predicted) fp++;
		else if (actual) fn++;
		else tn++;
	}
	const divide = (a: number, b: number) => (b ? a / b : null);
	const recall = divide(tp, tp + fn),
		specificity = divide(tn, tn + fp);
	return {
		threshold,
		truePositive: tp,
		falsePositive: fp,
		falseNegative: fn,
		trueNegative: tn,
		total: rows.length,
		accuracy: divide(tp + tn, rows.length),
		precision: divide(tp, tp + fp),
		recall,
		specificity,
		f1: divide(2 * tp, 2 * tp + fp + fn),
		balancedAccuracy: recall !== null && specificity !== null ? (recall + specificity) / 2 : null,
		prevalence: divide(tp + fn, rows.length),
		majorityBaselineAccuracy: divide(Math.max(tp + fn, tn + fp), rows.length),
	};
}

export function makeBacktest(
	account: Account,
	data: AccountData,
	version: number,
	firstOrigin = addDays(closedDay, -107),
	lastOrigin = addDays(closedDay, -30),
	stepDays = 7
): Backtest {
	const stats = (days: { forecastBalance: string; actualBalance: string }[], scale = 1) => {
		const errors = days.map((day) => (Number(cents(day.forecastBalance) - cents(day.actualBalance)) / 100) * scale);
		const mae = errors.reduce((sum, error) => sum + Math.abs(error), 0) / (errors.length || 1);
		const mse = errors.reduce((sum, error) => sum + error * error, 0) / (errors.length || 1);
		return { mae: money(mae), mse: money(mse), rmse: money(Math.sqrt(mse)) };
	};
	const origins = Array.from(
		{ length: Math.max(1, Math.min(52, Math.floor(diffDays(firstOrigin, lastOrigin) / stepDays) + 1)) },
		(_, i) => {
			const asOfDate = addDays(firstOrigin, i * stepDays);
			const history = dailyHistory(
				account,
				data,
				addDays(asOfDate, 1),
				addDays(asOfDate, data.settings.horizonDays)
			);
			const days = history
				.filter((day) => day.balanceEod !== null)
				.map((day, j) => {
					const actual = day.balanceEod!;
					const forecast = amount(cents(actual) + BigInt(((j % 5) - 2) * 1250000));
					return {
						date: day.date,
						horizonDay: j + 1,
						actualBalance: actual,
						forecastBalance: forecast,
						forecastInflow: day.inflow ?? "0.00",
						forecastOutflow: day.outflow ?? "0.00",
						actualInflow: day.inflow ?? "0.00",
						actualOutflow: day.outflow ?? "0.00",
						balanceP10: amount(cents(forecast) - 9000000n),
						balanceP90: amount(cents(forecast) + 9000000n),
						pBelowZero: cents(forecast) < 0n ? 0.8 : 0.1,
						predictedBreach: cents(forecast) < 0n,
						actualBreach: cents(actual) < 0n,
					};
				});
			return {
				asOfDate,
				status: days.length ? "EVALUATED" : "SKIPPED",
				reason: days.length ? null : "Недостаточно истории",
				maeBalance: days.length ? stats(days).mae : null,
				evaluatedDays: days.length,
				days,
			};
		}
	);
	const rows = origins.flatMap((origin) => origin.days);
	const score = (model: string, scale: number): ModelScore => ({
		model,
		description: model === data.settings.algorithm ? "Выбранный алгоритм" : "Эталонная модель",
		evaluatedDays: rows.length,
		maeBalance: stats(rows, scale).mae,
		mseBalance: stats(rows, scale).mse,
		rmseBalance: stats(rows, scale).rmse,
		wapeBalance:
			rows.length &&
			cents(
				total(
					rows.map((row) =>
						amount(cents(row.actualBalance) < 0n ? -cents(row.actualBalance) : cents(row.actualBalance))
					)
				)
			) !== 0n
				? (Number(stats(rows, scale).mae) * rows.length) /
					Number(
						total(
							rows.map((row) =>
								amount(
									cents(row.actualBalance) < 0n ? -cents(row.actualBalance) : cents(row.actualBalance)
								)
							)
						)
					)
				: null,
		skillScoreVsNaive: rows.length ? 1 - scale / (22 / 15) : null,
		inflowMae: "0.00",
		outflowMae: "0.00",
		dailyMatrix: matrix(rows),
	});
	const primary = score(data.settings.algorithm, 1);
	const originMatrix = matrix(
		origins
			.filter((origin) => origin.evaluatedDays > 0)
			.map((origin) => ({
				forecastBalance: origin.days.some((day) => day.predictedBreach) ? "-1.00" : "1.00",
				actualBalance: origin.days.some((day) => day.actualBreach) ? "-1.00" : "1.00",
			}))
	);
	return {
		id: id(),
		companyId: account.companyId,
		accountId: account.id,
		jobId: id(),
		status: "COMPLETED",
		algorithm: data.settings.algorithm,
		algorithmVersion: "1",
		scope: "HISTORY_ONLY",
		windowWeeks: data.settings.windowWeeks,
		firstOrigin,
		lastOrigin,
		stepDays,
		snapshotId: id(),
		inputDataVersion: version,
		staleness: "CURRENT",
		evaluatedOrigins: origins.filter((origin) => origin.evaluatedDays > 0).length,
		skippedOrigins: origins.filter((origin) => origin.evaluatedDays === 0).length,
		evaluatedDays: rows.length,
		maeBalance: rows.length ? primary.maeBalance : null,
		rmseBalance: rows.length ? primary.rmseBalance : null,
		horizons: Array.from({ length: data.settings.horizonDays }, (_, i) => ({
			horizonDay: i + 1,
			maeBalance: rows.some((row) => row.horizonDay === i + 1)
				? stats(rows.filter((row) => row.horizonDay === i + 1)).mae
				: null,
			rmseBalance: rows.some((row) => row.horizonDay === i + 1)
				? stats(rows.filter((row) => row.horizonDay === i + 1)).rmse
				: null,
			evaluatedCount: origins.filter((origin) => origin.evaluatedDays > i).length,
		})),
		gapMetrics: rows.length
			? {
					truePositive: originMatrix.truePositive,
					falsePositive: originMatrix.falsePositive,
					falseNegative: originMatrix.falseNegative,
					precision: originMatrix.precision,
					recall: originMatrix.recall,
					f1: originMatrix.f1,
					medianLeadDays: null,
					dateMaeDays: null,
					shortfallMae: null,
				}
			: null,
		riskMetrics: {
			brierScore: rows.length
				? rows.reduce((sum, row) => sum + (row.pBelowZero - (row.actualBreach ? 1 : 0)) ** 2, 0) / rows.length
				: null,
			evaluatedCount: rows.length,
			calibrationBins: [0.1, 0.8].map((probability) => {
				const selected = rows.filter((row) => row.pBelowZero === probability);
				return {
					fromProbability: probability === 0.1 ? 0 : 0.5,
					toProbability: probability === 0.1 ? 0.5 : 1,
					count: selected.length,
					meanProbability: selected.length ? probability : null,
					observedRate: selected.length
						? selected.filter((row) => row.actualBreach).length / selected.length
						: null,
				};
			}),
			interval80Coverage: rows.length
				? rows.filter(
						(row) =>
							cents(row.actualBalance) >= cents(row.balanceP10) &&
							cents(row.actualBalance) <= cents(row.balanceP90)
					).length / rows.length
				: null,
		},
		origins,
		warnings: [],
		quality: rows.length
			? {
					primary,
					benchmarks: [
						score("NAIVE", 22 / 15),
						score(
							data.settings.algorithm === "WEEKDAY_MEAN_V1" ? "WEEKDAY_ROBUST_V2" : "WEEKDAY_MEAN_V1",
							18.5 / 15
						),
					],
					originMatrix,
					scenarioDailyMatrix: matrix(rows),
					bufferDailyMatrix: matrix(rows, data.settings.bufferAmount),
					scenarioThreshold: 0.5,
					selection: {
						selectedModel: data.settings.algorithm,
						holdoutFrom: origins[Math.floor(origins.length / 2)].asOfDate,
						selectionOrigins: Math.floor(origins.length / 2),
						holdoutOrigins: Math.ceil(origins.length / 2),
						selectedHoldoutMae: primary.maeBalance,
						primaryHoldoutMae: primary.maeBalance,
						candidates: [
							{
								model: data.settings.algorithm,
								selectionMae: primary.maeBalance,
								holdoutMae: primary.maeBalance,
							},
							{
								model: "NAIVE",
								selectionMae: score("NAIVE", 22 / 15).maeBalance,
								holdoutMae: score("NAIVE", 22 / 15).maeBalance,
							},
						],
					},
					notes: ["Сравнение на одинаковых отсечках"],
				}
			: null,
		trace: [
			{
				seq: 1,
				stage: "VALIDATE",
				message: "Проверены параметры проверки качества",
				data: { firstOrigin, lastOrigin },
			},
			...origins.map((origin, i) => ({
				seq: i + 2,
				stage: "ORIGIN",
				message: `Проверена отсечка ${origin.asOfDate}`,
				data: { days: String(origin.evaluatedDays) },
			})),
			{
				seq: origins.length + 2,
				stage: "METRICS",
				message: "Сопоставлены прогнозы и фактические остатки",
				data: { mae: primary.maeBalance },
			},
		],
		createdAt: now(),
	};
}

export function makeAccountData(account: Account, seeded = false): AccountData {
	const data: AccountData = {
		payments: [],
		plans: [],
		allocations: [],
		recurring: [],
		imports: [],
		completeness: [],
		anchors: [],
		forecasts: [],
		backtests: [],
		jobs: [],
		alerts: [],
		settings: {
			windowWeeks: 26,
			horizonDays: 30,
			bufferAmount: "100000.00",
			scenarioCount: 1000,
			minCalibrationOrigins: 8,
			calibrationStepDays: 7,
			algorithm: "WEEKDAY_ROBUST_V2",
			version: 0,
		},
		duplicateDecisions: new Set(),
	};
	if (!seeded) return data;
	const imported: StatementImport = {
		id: id(),
		companyId: account.companyId,
		accountId: account.id,
		status: "COMMITTED",
		fileName: "statement.csv",
		fileSha256: null,
		totalRows: 731,
		acceptedRows: 731,
		rejectedRows: 0,
		duplicateRows: 0,
		warningCount: 0,
		fromDate: addDays(closedDay, -364),
		toDate: closedDay,
		createdAt: now(),
		completedAt: now(),
		dataVersion: 1,
	};
	data.imports.push(imported);
	for (let i = 0; i < 365; i++) {
		const operationDate = addDays(closedDay, -i);
		data.payments.push(
			makePayment(account, {
				importId: imported.id,
				operationDate,
				amount: money(24000 + (i % 7) * 3500),
				direction: "IN",
				counterpartyKey: "customer",
				counterpartyName: "ООО «Городской маркет»",
				purpose: "Оплата по договору",
				categoryCode: "SALES",
			}),
			makePayment(account, {
				importId: imported.id,
				operationDate,
				amount: money(i % 30 === 0 ? 210000 : 16000 + (i % 5) * 2200),
				categoryCode: i % 30 === 0 ? "RENT" : "SUPPLIERS",
			})
		);
	}
	data.payments.unshift(
		makePayment(account, {
			importId: imported.id,
			amount: "700000.00",
			direction: "IN",
			categoryCode: "OTHER",
			counterpartyKey: "owner",
			counterpartyName: "Учредитель",
			purpose: "Пополнение оборотных средств",
		}),
		makePayment(account, {
			source: "MANUAL",
			operationDate: addDays(closedDay, -2),
			amount: "20400.00",
			note: "Оплата наличными",
			requiresCompletenessConfirmation: true,
		})
	);
	data.plans.push(
		makePlan(account),
		makePlan(account, {
			title: "Оплата от заказчика",
			direction: "IN",
			amount: "1100000.00",
			remainingAmount: "1100000.00",
			dueDate: addDays(closedDay, 21),
			categoryCode: "SALES",
			counterpartyKey: "customer",
		}),
		makePlan(account, {
			title: "Налоговый платёж",
			amount: "250000.00",
			remainingAmount: "250000.00",
			dueDate: addDays(closedDay, 18),
			categoryCode: "TAX",
		}),
		makePlan(account, {
			title: "Просроченная оплата поставщику",
			amount: "45000.00",
			remainingAmount: "45000.00",
			dueDate: addDays(closedDay, -3),
			overdue: true,
		})
	);
	data.recurring = ["RENT", "SALARY", "SUPPLIERS"].map((categoryCode, i) => ({
		id: id(),
		accountId: account.id,
		direction: "OUT",
		categoryCode,
		counterpartyKey: "supplier",
		status: i === 0 ? "CONFIRMED" : "DETECTED",
		statusSource: "DETECTOR",
		schedule: { frequency: "MONTHLY", weekday: null, dayOfMonth: 5 + i * 10, businessDayRule: "FOLLOWING" },
		amount: money(65000 + i * 35000),
		observations: 12,
		firstSeen: addDays(closedDay, -364),
		lastSeen: closedDay,
		inputDataVersion: 1,
		detectorVersion: "1",
		version: 0,
	}));
	data.forecasts.push(makeForecast(account, data, 1));
	data.backtests.push(makeBacktest(account, data, 1));
	return data;
}

export const companies = [makeCompany()];
export const accounts = [makeAccount()];
export const accountState = new Map([[DEMO_ACCOUNT_ID, makeAccountData(accounts[0], true)]]);
