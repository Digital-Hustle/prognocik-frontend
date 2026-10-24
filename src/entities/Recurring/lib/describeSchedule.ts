import { weekdayName } from "@/shared/lib/date/date";
import type { RecurringSchedule } from "../model/types";

/** «Каждую пятницу» / «Ежемесячно, 10-го числа (перенос на рабочий день)» */
export function describeSchedule(s: RecurringSchedule): string {
	const shift = s.businessDayRule === "FOLLOWING" ? " · с переносом на рабочий день" : "";
	if (s.frequency === "WEEKLY") {
		const wd = weekdayName(s.weekday);
		const each =
			s.weekday === 3 || s.weekday === 5 || s.weekday === 6 ? "Каждую" : s.weekday === 7 ? "Каждое" : "Каждый";
		return `${each} ${wd}${shift}`;
	}
	return s.dayOfMonth ? `Ежемесячно, ${s.dayOfMonth}-го числа${shift}` : `Ежемесячно${shift}`;
}
