import type { ChatRq } from "@/entities/Assistant";
import type { ExpectedPayment, PlanRq } from "@/entities/ExpectedPayment";
import type { Forecast } from "@/entities/Forecast";
import type { Job } from "@/entities/Job";
import { addDays, diffDays } from "@/shared/lib/date/date";
import { demoBulkImport } from "./bulkImports";
import {
	accounts,
	accountState,
	amount,
	categories,
	cents,
	closedDay,
	companies,
	dailyHistory,
	id,
	makeAccount,
	makeAccountData,
	makeBacktest,
	makeCompany,
	makeForecast,
	makePayment,
	makePlan,
	now,
	total,
} from "./data";
import type { AccountData } from "./data";
import { analytics, assistantAnswer, dashboard, filteredPayments, gapDetails, planFact } from "./views";

type Body = Record<string, unknown>;
const json = (data: unknown, status = 200) => Response.json(data, { status });
class DemoProblem extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string
	) {
		super(message);
	}
}
const fail = (status: number, code: string, message: string): never => {
	throw new DemoProblem(status, code, message);
};
function required<T>(value: T | undefined | null): T {
	return value ?? fail(404, "NOT_FOUND", "Данные не найдены");
}
const text = (body: Body, key: string, fallback = "") =>
	typeof body[key] === "string" ? (body[key] as string) : fallback;

function page<T>(items: T[], params: URLSearchParams) {
	const pageNumber = Math.max(0, Number(params.get("page")) || 0),
		size = Math.max(1, Math.min(1000, Number(params.get("size")) || 50));
	return {
		items: items.slice(pageNumber * size, (pageNumber + 1) * size),
		page: { page: pageNumber, size, total: items.length, hasNext: (pageNumber + 1) * size < items.length },
	};
}
function version(request: Request, resource: { version: number }): void {
	const match = request.headers.get("If-Match");
	if (!match) fail(428, "PRECONDITION_REQUIRED", "Нужна текущая версия записи");
	if (match !== `"${resource.version}"`) fail(409, "VERSION_CONFLICT", "Запись уже изменилась. Обновите данные.");
}
function validateAmount(value: string): void {
	if (!/^\d+\.\d{2}$/.test(value) || cents(value) <= 0n) fail(422, "INVALID_AMOUNT", "Сумма должна быть больше нуля");
}
function validateRange(from: string, to: string, maximum = 366): void {
	const valid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && addDays(date, 0) === date;
	if (!valid(from) || !valid(to) || diffDays(from, to) < 0 || diffDays(from, to) >= maximum)
		fail(422, "INVALID_RANGE", `Выберите период от 1 до ${maximum} дней`);
}
function stale(companyId: string): void {
	const company = required(companies.find((c) => c.id === companyId));
	company.dataVersion++;
	company.updatedAt = now();
	for (const account of accounts.filter((a) => a.companyId === companyId)) {
		const data = accountState.get(account.id);
		for (const result of [...(data?.forecasts ?? []), ...(data?.backtests ?? [])]) result.staleness = "STALE";
	}
}
function state(accountId: string, companyId: string) {
	const account = required(accounts.find((a) => a.id === accountId && a.companyId === companyId));
	const data = required(accountState.get(accountId));
	return { account, data };
}
function reconcilePlan(data: AccountData, plan: ExpectedPayment) {
	plan.settledAmount = total(
		data.allocations.filter((a) => a.expectedPaymentId === plan.id && !a.reversedAt).map((a) => a.amount)
	);
	plan.remainingAmount = amount(cents(plan.amount) - cents(plan.settledAmount));
	plan.status =
		cents(plan.remainingAmount) === 0n ? "SETTLED" : cents(plan.settledAmount) > 0n ? "PARTIALLY_SETTLED" : "OPEN";
	plan.overdue = plan.dueDate < closedDay && cents(plan.remainingAmount) > 0n;
	plan.version++;
	plan.updatedAt = now();
	for (const payment of data.payments)
		payment.allocatedAmount = total(
			data.allocations.filter((a) => a.paymentId === payment.id && !a.reversedAt).map((a) => a.amount)
		);
}

function file(body: string, name: string, mime: string): Response {
	return new Response(body, {
		headers: {
			"Content-Type": `${mime}; charset=utf-8`,
			"Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
		},
	});
}
function exportResult(result: Forecast | ReturnType<typeof makeBacktest>, kind: string): Response {
	if (kind === "trace")
		return file(
			(result.trace ?? [])
				.map(
					(step) =>
						`${step.seq}. ${step.message}\n${Object.entries(step.data)
							.map(([key, value]) => `${key}: ${value}`)
							.join("\n")}`
				)
				.join("\n\n"),
			`calculation-${result.id}.txt`,
			"text/plain"
		);
	if (kind === "report" && "maeBalance" in result)
		return file(
			`# Проверка качества прогноза\n\nАлгоритм: ${result.algorithm}\n\nMAE: ${result.maeBalance ?? "н/д"}\n\nRMSE: ${result.rmseBalance ?? "н/д"}\n\nОтсечки: ${result.evaluatedOrigins}\n`,
			`backtest-${result.id}.md`,
			"text/markdown"
		);
	if (kind === "export") {
		const csv =
			"days" in result
				? [
						"date;inflow;outflow;balance;p10;p90",
						...result.days.map((day) =>
							[
								day.date,
								day.inflow,
								day.outflow,
								day.balance,
								day.balanceP10 ?? "",
								day.balanceP90 ?? "",
							].join(";")
						),
					]
				: [
						"origin;date;forecastBalance;actualBalance",
						...(result.origins ?? []).flatMap((origin) =>
							(origin.days ?? []).map((day) =>
								[origin.asOfDate, day.date, day.forecastBalance, day.actualBalance].join(";")
							)
						),
					];
		return file(`\uFEFF${csv.join("\r\n")}`, `result-${result.id}.csv`, "text/csv");
	}
	return fail(404, "NOT_FOUND", "Файл не найден");
}

async function route(request: Request): Promise<Response> {
	const url = new URL(request.url),
		params = url.searchParams,
		method = request.method;
	const parts = url.pathname
		.replace(/^.*?\/api\/v1\/(orchestrator|preprocessor)\//, "")
		.split("/")
		.filter(Boolean);
	if (parts[0] !== "companies")
		return fail(404, "DEMO_ENDPOINT_NOT_FOUND", "Этот запрос не поддерживается демонстрационным режимом");
	const body: Body =
		method === "GET" || method === "HEAD" || request.headers.get("Content-Type")?.startsWith("multipart/")
			? {}
			: ((await request.json().catch(() => ({}))) as Body);
	if (method === "POST" && ["companies/imports", "companies/operations/imports"].includes(parts.join("/"))) {
		return demoBulkImport(request, parts[1] === "operations");
	}
	if (parts.length === 1) {
		if (method === "GET") return json(page(companies, params));
		if (method === "POST") {
			const company = { ...makeCompany(id()), ...body, dataVersion: 0 } as ReturnType<typeof makeCompany>;
			companies.push(company);
			return json(company, 201);
		}
	}
	const companyId = parts[1],
		company = required(companies.find((c) => c.id === companyId));
	if (parts.length === 2) {
		if (method === "GET") return json(company);
		if (method === "PUT") {
			version(request, company);
			Object.assign(company, body, { version: company.version + 1, updatedAt: now() });
			return json(company);
		}
	}
	if (parts[2] === "archive" && method === "POST") {
		version(request, company);
		company.archived = true;
		company.version++;
		return json(company);
	}
	if (parts[2] === "members" && method === "GET")
		return json({
			items: [{ userId: company.ownerUserId, role: "OWNER", version: 0, joinedAt: company.createdAt }],
		});
	if (parts[2] === "categories" && method === "GET") return json({ items: categories });
	if (parts[2] === "accounts" && parts.length === 3) {
		if (method === "GET")
			return json(
				page(
					accounts.filter((a) => a.companyId === companyId),
					params
				)
			);
		if (method === "POST") {
			const account = { ...makeAccount(companyId, id(), false), ...body } as ReturnType<typeof makeAccount>;
			accounts.push(account);
			accountState.set(account.id, makeAccountData(account));
			return json(account, 201);
		}
	}
	if (parts[2] === "imports") {
		if (method === "POST" && url.pathname.includes("/preprocessor/")) {
			const form = await request.formData();
			const { account, data } = state(String(form.get("accountId")), companyId);
			const uploaded = form.get("file");
			if (!(uploaded instanceof File)) return fail(422, "INVALID_FILE", "Выберите CSV-файл");
			const from = String(form.get("declaredFromDate") ?? addDays(closedDay, -29)),
				to = String(form.get("declaredToDate") ?? closedDay);
			validateRange(from, to);
			if (to > closedDay) return fail(422, "INVALID_RANGE", "Можно загрузить только закрытые дни");
			const imported = {
				id: id(),
				companyId,
				accountId: account.id,
				status: "COMMITTED",
				fileName: uploaded.name,
				fileSha256: null,
				totalRows: 2,
				acceptedRows: 2,
				rejectedRows: 0,
				duplicateRows: 0,
				warningCount: 0,
				fromDate: from,
				toDate: to,
				createdAt: now(),
				completedAt: now(),
				dataVersion: company.dataVersion + 1,
			};
			data.imports.unshift(imported);
			data.payments.unshift(
				makePayment(account, {
					importId: imported.id,
					operationDate: to,
					amount: "48000.00",
					direction: "IN",
					categoryCode: "SALES",
					counterpartyName: "ООО «Городской маркет»",
					counterpartyKey: "customer",
				}),
				makePayment(account, { importId: imported.id, operationDate: to })
			);
			account.latestBalance ??= "1240000.00";
			if (!account.latestBalanceDate || to > account.latestBalanceDate) account.latestBalanceDate = to;
			stale(companyId);
			return json(imported, 201);
		}
		const imports = accounts
			.filter((a) => a.companyId === companyId && (!params.get("accountId") || a.id === params.get("accountId")))
			.flatMap((a) => required(accountState.get(a.id)).imports);
		if (parts.length === 3 && method === "GET") return json(page(imports, params));
		const imported = required(imports.find((item) => item.id === parts[3]));
		if (parts.length === 4 && method === "GET") return json(imported);
		if (parts[4] === "issues" && method === "GET") return json(page([], params));
	}
	if (parts[2] === "jobs") {
		const job = required(
			accounts
				.filter((a) => a.companyId === companyId)
				.flatMap((a) => required(accountState.get(a.id)).jobs)
				.find((j) => j.id === parts[3])
		);
		if (parts[4] === "cancel" && method === "POST" && (job.status === "QUEUED" || job.status === "RUNNING")) {
			job.status = "CANCELLED";
			job.finishedAt = now();
		}
		if (method === "GET" || parts[4] === "cancel") return json(job);
	}
	if (parts[2] === "counterparties" && method === "GET") {
		const selected = params.get("accountId") ?? accounts.find((a) => a.companyId === companyId)?.id ?? "";
		const { data } = state(selected, companyId);
		const items = [
			...new Map(
				data.payments
					.filter((p) => p.counterpartyKey)
					.map((p) => [
						p.counterpartyKey,
						{ key: p.counterpartyKey, name: p.counterpartyName, inn: p.counterpartyInn },
					])
			).values(),
		];
		const search = params.get("q")?.toLocaleLowerCase("ru");
		return json(
			page(
				items.filter((item) => !search || `${item.name} ${item.inn}`.toLocaleLowerCase("ru").includes(search)),
				params
			)
		);
	}
	if (parts[2] === "analytics" || parts[2] === "plan-fact") {
		const { account, data } = state(params.get("accountId") ?? "", companyId);
		validateRange(params.get("fromDate") ?? closedDay, params.get("toDate") ?? closedDay);
		if (method === "GET")
			return json(
				parts[2] === "analytics"
					? analytics(account, data, params, parts[3] === "counterparties")
					: planFact(account, data, params)
			);
	}
	if (parts[2] === "payments") {
		if (method === "POST" && parts.length === 3) {
			const { account, data } = state(text(body, "accountId"), companyId);
			validateAmount(text(body, "amount"));
			const date = text(body, "operationDate");
			validateRange(date, date);
			if (date > closedDay)
				return fail(422, "INVALID_DATE", "Ручной платёж можно добавить только за закрытый день");
			const payment = makePayment(account, {
				...body,
				id: id(),
				accountId: account.id,
				companyId,
				source: "MANUAL",
				counterpartyKey: text(body, "counterpartyInn")
					? `inn:${text(body, "counterpartyInn")}`
					: text(body, "counterpartyName")
						? `name:${text(body, "counterpartyName").toLocaleLowerCase("ru")}`
						: null,
				categorySource: "USER",
				categoryCode: text(body, "categoryCode", "OTHER"),
				requiresCompletenessConfirmation: true,
			});
			data.payments.unshift(payment);
			if (account.latestBalance !== null && date <= (account.latestBalanceDate ?? date))
				account.latestBalance = amount(
					cents(account.latestBalance) + cents(payment.amount) * (payment.direction === "IN" ? 1n : -1n)
				);
			stale(companyId);
			return json(payment, 201);
		}
		const data = required(
			accounts
				.filter((a) => a.companyId === companyId)
				.map((a) => accountState.get(a.id))
				.find((d) => d?.payments.some((p) => p.id === parts[3]))
		);
		const payment = required(data.payments.find((p) => p.id === parts[3]));
		const account = required(accounts.find((a) => a.id === payment.accountId));
		if (method === "GET" && parts[4] === "duplicate-candidates")
			return json({
				items: data.payments.filter(
					(p) =>
						p.source === "STATEMENT" &&
						p.status === "ACTIVE" &&
						p.operationDate === payment.operationDate &&
						p.amount === payment.amount &&
						p.direction === payment.direction &&
						!data.duplicateDecisions.has(`${payment.id}:${p.id}`)
				),
			});
		if (method === "POST" && (parts[4] === "void" || parts[4] === "duplicate-resolutions")) {
			version(request, payment);
			if (payment.source !== "MANUAL" || payment.status !== "ACTIVE")
				return fail(422, "PAYMENT_NOT_EDITABLE", "Можно аннулировать только активную ручную операцию");
			if (parts[4] === "duplicate-resolutions") {
				const imported = required(
					data.payments.find((p) => p.id === body.importedPaymentId && p.source === "STATEMENT")
				);
				if (imported.version !== body.importedPaymentVersion)
					return fail(409, "VERSION_CONFLICT", "Операция из выписки изменилась");
				data.duplicateDecisions.add(`${payment.id}:${imported.id}`);
				if (body.decision === "DIFFERENT") {
					payment.version++;
					return json(payment);
				}
				payment.replacementPaymentId = imported.id;
			}
			payment.status = "VOIDED";
			payment.voidReason = text(body, "reason");
			payment.voidedAt = now();
			payment.version++;
			if (
				account.latestBalance !== null &&
				payment.operationDate <= (account.latestBalanceDate ?? payment.operationDate)
			)
				account.latestBalance = amount(
					cents(account.latestBalance) - cents(payment.amount) * (payment.direction === "IN" ? 1n : -1n)
				);
			for (const allocation of data.allocations.filter((a) => a.paymentId === payment.id && !a.reversedAt)) {
				allocation.reversedAt = now();
				reconcilePlan(data, required(data.plans.find((p) => p.id === allocation.expectedPaymentId)));
			}
			stale(companyId);
			return json(payment);
		}
	}
	if (parts[2] !== "accounts")
		return fail(404, "DEMO_ENDPOINT_NOT_FOUND", "Этот запрос не поддерживается демонстрационным режимом");
	const { account, data } = state(parts[3], companyId),
		tail = parts.slice(4),
		root = tail[0];
	if (!root) {
		if (method === "GET") return json(account);
		if (method === "PUT") {
			version(request, account);
			Object.assign(account, body, { version: account.version + 1, updatedAt: now() });
			return json(account);
		}
	}
	if (root === "archive" && method === "POST") {
		version(request, account);
		account.archived = true;
		account.version++;
		return json(account);
	}
	if (root === "dashboard" && method === "GET") return json(dashboard(company, account, data));
	if (root === "forecast-settings") {
		if (method === "GET") return json(data.settings);
		if (method === "PUT") {
			version(request, data.settings);
			Object.assign(data.settings, body, { version: data.settings.version + 1 });
			stale(companyId);
			return json(data.settings);
		}
	}
	if (root === "payments") {
		if (tail.length === 1 && method === "GET") return json(page(filteredPayments(data, params), params));
		if (tail[1] === "category-changes" && method === "POST") {
			const changes = body.payments as { paymentId: string; expectedVersion: number }[];
			const selected = changes.map((change) => {
				const payment = required(data.payments.find((p) => p.id === change.paymentId));
				if (payment.version !== change.expectedVersion)
					fail(409, "VERSION_CONFLICT", "Одна из операций изменилась");
				return payment;
			});
			for (const payment of selected) {
				payment.categoryCode = text(body, "categoryCode");
				payment.categorySource = "USER";
				payment.version++;
			}
			stale(companyId);
			return json({ items: selected });
		}
		const payment = required(data.payments.find((p) => p.id === tail[1]));
		if (tail.length === 2 && method === "GET") return json(payment);
		if (tail[2] === "revisions" && method === "GET")
			return json({
				items: [
					{
						categoryCode: payment.categoryCode,
						categorySource: payment.categorySource,
						ruleVersion: payment.ruleVersion,
						knownAt: payment.knownAt,
						actorId: null,
						version: payment.version,
					},
				],
			});
		if (tail[2] === "category" && method === "PUT") {
			version(request, payment);
			payment.categoryCode = text(body, "categoryCode");
			payment.categorySource = "USER";
			payment.version++;
			stale(companyId);
			return json(payment);
		}
	}
	if (root === "daily-history" && method === "GET") {
		const from = params.get("from") ?? addDays(closedDay, -41),
			to = params.get("to") ?? closedDay;
		validateRange(from, to, 731);
		return json({ items: dailyHistory(account, data, from, to) });
	}
	if (root === "data-quality" && method === "GET") {
		const fromDate = addDays(closedDay, -181),
			history = dailyHistory(account, data, fromDate, closedDay);
		const missingDayCount = history.filter((day) => day.status === "MISSING").length;
		return json({
			accountId: account.id,
			fromDate,
			toDate: closedDay,
			quality: account.latestBalance === null ? "INSUFFICIENT" : missingDayCount ? "LIMITED" : "GOOD",
			completeDayCount: history.length - missingDayCount,
			missingDayCount,
			balanceMismatchCount: 0,
			emptyPurposeCount: data.payments.filter((p) => !p.purpose).length,
			warnings: [],
		});
	}
	if (root === "completeness-ranges" && method === "GET") return json(page(data.completeness, params));
	if (root === "completeness" && method === "POST") {
		validateRange(text(body, "fromDate"), text(body, "toDate"), 731);
		const range = {
			id: id(),
			accountId: account.id,
			fromDate: text(body, "fromDate"),
			toDate: text(body, "toDate"),
			completeness:
				body.completeness === "CONFIRMED_COMPLETE" ? ("CONFIRMED_COMPLETE" as const) : ("UNKNOWN" as const),
			reason: text(body, "reason"),
			createdAt: now(),
		};
		data.completeness.unshift(range);
		for (const payment of data.payments.filter(
			(p) => p.operationDate >= range.fromDate && p.operationDate <= range.toDate
		))
			payment.requiresCompletenessConfirmation = range.completeness !== "CONFIRMED_COMPLETE";
		stale(companyId);
		return json(range, 201);
	}
	if (root === "balance-anchors") {
		if (method === "GET") return json({ items: data.anchors });
		if (method === "POST") {
			const anchor = {
				id: id(),
				accountId: account.id,
				date: text(body, "date"),
				balance: text(body, "balance"),
				source: "MANUAL",
				reason: text(body, "reason"),
				knownAt: now(),
				supersedesId: text(body, "supersedesId") || null,
			};
			validateRange(anchor.date, anchor.date);
			if (anchor.date > closedDay || !/^-?\d+\.\d{2}$/.test(anchor.balance))
				return fail(422, "INVALID_ANCHOR", "Укажите остаток за закрытый день");
			data.anchors.unshift(anchor);
			if (!account.latestBalanceDate || anchor.date >= account.latestBalanceDate) {
				account.latestBalance = anchor.balance;
				account.latestBalanceDate = anchor.date;
			}
			stale(companyId);
			return json(anchor, 201);
		}
	}
	if (root === "recurring-patterns") {
		if (tail.length === 1 && method === "GET") return json({ items: data.recurring });
		if (tail[1] === "confirm-detected" && method === "POST") {
			const selected = data.recurring.filter((p) => p.status === "DETECTED");
			for (const pattern of selected) {
				pattern.status = "CONFIRMED";
				pattern.statusSource = "USER";
				pattern.version++;
			}
			if (selected.length) stale(companyId);
			return json({ items: selected });
		}
		if (tail[2] === "status" && method === "PUT") {
			const pattern = required(data.recurring.find((p) => p.id === tail[1]));
			version(request, pattern);
			pattern.status = body.status as typeof pattern.status;
			pattern.statusSource = "USER";
			pattern.version++;
			stale(companyId);
			return json(pattern);
		}
	}
	if (root === "expected-payments") {
		if (tail.length === 1 && method === "GET") {
			const from = params.get("from") ?? params.get("fromDate"),
				to = params.get("to") ?? params.get("toDate"),
				status = params.get("status"),
				direction = params.get("direction");
			return json({
				items: data.plans.filter(
					(p) =>
						(!from || p.dueDate >= from) &&
						(!to || p.dueDate <= to) &&
						(!status || p.status === status) &&
						(!direction || p.direction === direction)
				),
			});
		}
		if (tail.length === 1 && method === "POST") {
			validateAmount(text(body, "amount"));
			const plan = makePlan(account, body as Partial<PlanRq>);
			plan.remainingAmount = plan.amount;
			plan.overdue = plan.dueDate < closedDay;
			data.plans.unshift(plan);
			stale(companyId);
			return json(plan, 201);
		}
		const plan = required(data.plans.find((p) => p.id === tail[1]));
		if (tail.length === 2 && method === "GET") return json(plan);
		if (tail.length === 2 && method === "PUT") {
			version(request, plan);
			validateAmount(text(body, "amount"));
			if (cents(text(body, "amount")) < cents(plan.settledAmount))
				return fail(422, "INVALID_AMOUNT", "Сумма меньше уже сопоставленной оплаты");
			Object.assign(plan, body);
			reconcilePlan(data, plan);
			stale(companyId);
			return json(plan);
		}
		if (tail[2] === "cancel" && method === "POST") {
			version(request, plan);
			plan.status = "CANCELLED";
			plan.version++;
			stale(companyId);
			return json(plan);
		}
		if (tail[2] === "allocations") {
			if (method === "GET")
				return json({ items: data.allocations.filter((a) => a.expectedPaymentId === plan.id) });
			if (method === "POST") {
				const payment = required(data.payments.find((p) => p.id === body.paymentId && p.status === "ACTIVE"));
				const allocated = text(body, "amount");
				validateAmount(allocated);
				if (
					plan.status === "CANCELLED" ||
					payment.direction !== plan.direction ||
					cents(allocated) > cents(plan.remainingAmount) ||
					cents(allocated) > cents(payment.amount) - cents(payment.allocatedAmount ?? "0.00")
				)
					return fail(422, "INVALID_ALLOCATION", "Сумма или направление сопоставления не подходят");
				const allocation = {
					id: id(),
					expectedPaymentId: plan.id,
					paymentId: payment.id,
					amount: allocated,
					createdAt: now(),
					reversedAt: null,
				};
				data.allocations.push(allocation);
				reconcilePlan(data, plan);
				stale(companyId);
				return json(allocation, 201);
			}
		}
	}
	if (root === "allocations" && tail[2] === "reverse" && method === "POST") {
		const allocation = required(data.allocations.find((a) => a.id === tail[1]));
		allocation.reversedAt = now();
		reconcilePlan(data, required(data.plans.find((p) => p.id === allocation.expectedPaymentId)));
		stale(companyId);
		return new Response(null, { status: 204 });
	}
	if (["forecast-jobs", "backtest-jobs", "recurring-detection-jobs"].includes(root) && method === "POST") {
		if (account.latestBalance === null)
			return fail(422, "INSUFFICIENT_DATA", "Сначала укажите остаток или загрузите выписку");
		const asOf = text(body, "asOfDate", closedDay);
		validateRange(asOf, asOf);
		if (asOf > closedDay) return fail(422, "INVALID_DATE", "Выберите закрытый день");
		let resultId: string | null = null;
		const job: Job = {
			id: id(),
			accountId: account.id,
			type: root === "forecast-jobs" ? "FORECAST" : root === "backtest-jobs" ? "BACKTEST" : "DETECT_RECURRING",
			status: "SUCCEEDED",
			snapshotId: id(),
			resultId,
			progress: 100,
			attempts: 1,
			error: null,
			origin: "MANUAL",
			createdAt: now(),
			startedAt: now(),
			finishedAt: now(),
		};
		if (root === "forecast-jobs") {
			const forecast = makeForecast(account, data, company.dataVersion, asOf, body.scope as Forecast["scope"]);
			forecast.jobId = job.id;
			data.forecasts.unshift(forecast);
			data.alerts = [];
			resultId = forecast.id;
		}
		if (root === "backtest-jobs") {
			const step = Math.max(1, Number(body.stepDays) || 7);
			const backtest = makeBacktest(
				account,
				data,
				company.dataVersion,
				text(body, "firstOrigin", addDays(asOf, -107)),
				text(body, "lastOrigin", addDays(asOf, -30)),
				step
			);
			backtest.jobId = job.id;
			backtest.scope = body.scope === "WITH_KNOWN_PLANS" ? "WITH_KNOWN_PLANS" : "HISTORY_ONLY";
			backtest.windowWeeks = Number(body.windowWeeks) || data.settings.windowWeeks;
			data.backtests.unshift(backtest);
			resultId = backtest.id;
		}
		if (root === "recurring-detection-jobs") {
			for (const pattern of data.recurring) pattern.inputDataVersion = company.dataVersion;
		}
		job.resultId = resultId;
		data.jobs.unshift(job);
		return json(job, 202);
	}
	if (root === "forecasts" || root === "backtests") {
		const results = root === "forecasts" ? data.forecasts : data.backtests;
		if (tail.length === 1 && method === "GET") {
			const offset = Number(params.get("offset")) || 0,
				limit = Number(params.get("limit")) || 20;
			return json({ items: results.slice(offset, offset + limit) });
		}
		const result = required(results.find((item) => item.id === tail[1]));
		if (tail.length === 2 && method === "GET") return json(result);
		if (["trace", "export", "report"].includes(tail[2]) && method === "GET") return exportResult(result, tail[2]);
		if (tail[2] === "origins" && "origins" in result && method === "GET")
			return json({ items: result.origins ?? [] });
		if (tail[2] === "gaps" && "gaps" in result && method === "GET")
			return json(required(gapDetails(result, tail[3], data)));
	}
	if (root === "alerts") {
		dashboard(company, account, data);
		if (tail.length === 1 && method === "GET")
			return json({
				items: data.alerts.filter(
					(a) => params.get("activeOnly") !== "true" || (a.active && !a.acknowledgedAt)
				),
			});
		if (tail[2] === "acknowledge" && method === "POST") {
			const alert = required(data.alerts.find((a) => a.id === tail[1]));
			alert.acknowledgedAt = now();
			return json(alert);
		}
	}
	if (root === "assistant" && tail[1] === "chat" && method === "POST") {
		if (!text(body, "message").trim()) return fail(422, "INVALID_MESSAGE", "Напишите вопрос");
		if (body.fromDate || body.toDate) validateRange(text(body, "fromDate"), text(body, "toDate"));
		return json(assistantAnswer(account, company, data, body as unknown as ChatRq));
	}
	return fail(404, "DEMO_ENDPOINT_NOT_FOUND", "Этот запрос не поддерживается демонстрационным режимом");
}

const idempotentResponses = new Map<string, { signature: string; response: Response }>();
/** Изолированный обработчик всех бизнес-запросов приложения; ни один из них не отправляется в Gateway. */
export async function handleDemoRequest(request: Request): Promise<Response> {
	try {
		request.signal.throwIfAborted();
		const key = request.headers.get("Idempotency-Key");
		const signature = `${request.method}:${request.url}:${request.headers.get("Content-Type")?.startsWith("multipart/") ? "file" : await request.clone().text()}`;
		const previous = key ? idempotentResponses.get(key) : undefined;
		if (previous) {
			if (signature !== previous.signature)
				return fail(409, "IDEMPOTENCY_CONFLICT", "Ключ уже использован для другого действия");
			return previous.response.clone();
		}
		const response = await route(request);
		if (key && response.ok) idempotentResponses.set(key, { signature, response: response.clone() });
		return response;
	} catch (error) {
		if (request.signal.aborted) throw error;
		const known = error instanceof DemoProblem;
		return json(
			{
				type: "about:blank",
				title: known ? error.message : "Ошибка демонстрационных данных",
				status: known ? error.status : 500,
				code: known ? error.code : "DEMO_ERROR",
				detail: known ? error.message : "Не удалось обработать запрос",
			},
			known ? error.status : 500
		);
	}
}
