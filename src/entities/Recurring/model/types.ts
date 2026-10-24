import type { Direction, IsoDate, Money, Uuid } from "@/shared/api/types";

export type PatternStatus = "DETECTED" | "CONFIRMED" | "EXCLUDED";

/** ScheduleRs. weekday — ISO (1 = пн) */
export interface RecurringSchedule {
	frequency: "WEEKLY" | "MONTHLY";
	weekday: number | null;
	dayOfMonth: number | null;
	businessDayRule: "NONE" | "FOLLOWING";
}

/** RecurringPatternRs */
export interface RecurringPattern {
	id: Uuid;
	accountId: Uuid;
	direction: Direction;
	categoryCode: string;
	counterpartyKey: string | null;
	status: PatternStatus;
	statusSource: "DETECTOR" | "USER";
	schedule: RecurringSchedule;
	amount: Money;
	observations: number;
	firstSeen: IsoDate;
	lastSeen: IsoDate;
	inputDataVersion: number;
	detectorVersion: string | null;
	version: number;
}
