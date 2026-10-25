import type { Instant, IsoDate, Money, Uuid } from "@/shared/api/types";

export interface EmployeeSchedule {
	frequency: "WEEKLY" | "MONTHLY";
	weekday: number | null;
	dayOfMonth: number | null;
	businessDayRule: "NONE" | "FOLLOWING";
}

/** Вложенная RecurringPatternRs: зарплата — подтверждённое регулярное списание OUT, категория SALARY */
export interface EmployeePayment {
	id: Uuid;
	accountId: Uuid;
	direction: "OUT";
	categoryCode: string;
	counterpartyKey: string | null;
	status: "DETECTED" | "CONFIRMED" | "EXCLUDED";
	statusSource: "DETECTOR" | "USER";
	schedule: EmployeeSchedule;
	amount: Money;
	/** 0 для ручной зарплаты: истории обнаружения нет, её не выдумываем */
	observations: number;
	firstSeen: IsoDate | null;
	lastSeen: IsoDate | null;
	detectorVersion: string | null;
	employeePayment: boolean;
	version: number;
}

/** Employee: бизнес-данные компании, не пользователь приложения */
export interface Employee {
	id: Uuid;
	companyId: Uuid;
	fullName: string;
	position: string | null;
	note: string | null;
	/** ИНН физлица (12 цифр); помогает связать зарплату с получателем в выписке */
	inn?: string | null;
	archived: boolean;
	recurringPayment: EmployeePayment | null;
	version: number;
	createdAt: Instant;
	updatedAt: Instant;
}

export interface EmployeeRq {
	fullName: string;
	position?: string | null;
	note?: string | null;
	inn?: string | null;
}
