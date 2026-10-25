import type { Employee, EmployeeRq, EmployeeSchedule } from "@/entities/Employee";
import { companyUrl, idempotency, ifMatch, rtkApi } from "@/shared/api/rtkApi";

export interface SalaryRq {
	accountId: string;
	/** Строка с точкой и не более чем двумя знаками: деньги не гоняем через float */
	amount: string;
	counterpartyInn?: string;
	counterpartyName?: string;
	schedule: EmployeeSchedule;
	/** Обязательно при изменении уже связанной зарплаты */
	recurringPatternVersion?: number;
}

interface Target {
	companyId: string;
	employeeId: string;
	version: number;
}

/**
 * Сотрудники и зарплата. Создание — Idempotency-Key; все изменения карточки — If-Match с Employee.version.
 * Любое изменение выплаты меняет вход прогноза (dataVersion), поэтому прогноз и регулярные платежи инвалидируем.
 */
const payrollTags = ["Recurring", "Dashboard", "Forecasts", "Alerts", "PaymentCalendar"] as const;

export const manageEmployeesApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createEmployee: build.mutation<Employee, { companyId: string; body: EmployeeRq; idempotencyKey: string }>({
			query: ({ companyId, body, idempotencyKey }) => ({
				url: companyUrl(companyId, "/employees"),
				method: "POST",
				body,
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [{ type: "Employees", id: companyId }],
		}),
		updateEmployee: build.mutation<Employee, Target & { body: EmployeeRq }>({
			query: ({ companyId, employeeId, version, body }) => ({
				url: companyUrl(companyId, `/employees/${employeeId}`),
				method: "PUT",
				body,
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [{ type: "Employees", id: companyId }],
		}),
		setSalary: build.mutation<Employee, Target & { body: SalaryRq }>({
			query: ({ companyId, employeeId, version, body }) => ({
				url: companyUrl(companyId, `/employees/${employeeId}/salary`),
				method: "PUT",
				body,
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [{ type: "Employees", id: companyId }, ...payrollTags],
		}),
		linkPayment: build.mutation<
			Employee,
			Target & { body: { accountId: string; recurringPatternId: string; patternVersion: number } }
		>({
			query: ({ companyId, employeeId, version, body }) => ({
				url: companyUrl(companyId, `/employees/${employeeId}/recurring-payment`),
				method: "PUT",
				body,
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [{ type: "Employees", id: companyId }, ...payrollTags],
		}),
		unlinkPayment: build.mutation<Employee, Target>({
			query: ({ companyId, employeeId, version }) => ({
				url: companyUrl(companyId, `/employees/${employeeId}/recurring-payment`),
				method: "DELETE",
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [{ type: "Employees", id: companyId }, ...payrollTags],
		}),
		archiveEmployee: build.mutation<Employee, Target>({
			query: ({ companyId, employeeId, version }) => ({
				url: companyUrl(companyId, `/employees/${employeeId}/archive`),
				method: "POST",
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [{ type: "Employees", id: companyId }, ...payrollTags],
		}),
	}),
});

export const {
	useCreateEmployeeMutation,
	useUpdateEmployeeMutation,
	useSetSalaryMutation,
	useLinkPaymentMutation,
	useUnlinkPaymentMutation,
	useArchiveEmployeeMutation,
} = manageEmployeesApi;
