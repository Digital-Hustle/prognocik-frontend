/**
 * Проверка ИНН и КПП по алгоритму ФНС: длина, цифры и контрольные разряды.
 * Возвращают текст ошибки для поля или null, если значение корректно.
 */

const W10 = [2, 4, 10, 3, 5, 9, 4, 6, 8];
const W11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
const W12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];

const control = (digits: number[], weights: number[]) =>
	(weights.reduce((sum, w, i) => sum + w * digits[i], 0) % 11) % 10;

export type InnKind = "legal" | "person" | "any";

const KIND_LABEL: Record<InnKind, string> = {
	legal: "ИНН организации — 10 цифр",
	person: "ИНН физлица или ИП — 12 цифр",
	any: "ИНН — 10 цифр у организации или 12 у физлица и ИП",
};

export function validateInn(value: string, kind: InnKind = "any"): string | null {
	const inn = value.trim();
	if (!inn) return null;
	if (!/^\d+$/.test(inn)) return "ИНН состоит только из цифр";
	const wanted = kind === "legal" ? [10] : kind === "person" ? [12] : [10, 12];
	if (!wanted.includes(inn.length)) return KIND_LABEL[kind];
	const d = [...inn].map(Number);
	const ok = inn.length === 10 ? control(d, W10) === d[9] : control(d, W11) === d[10] && control(d, W12) === d[11];
	return ok ? null : "Неверный ИНН: не сходится контрольное число. Проверьте цифры";
}

/** КПП: 4 цифры кода налогового органа, 2 знака причины (цифры или латинские буквы), 3 цифры номера */
export function validateKpp(value: string): string | null {
	const kpp = value.trim().toUpperCase();
	if (!kpp) return null;
	if (kpp.length !== 9) return "КПП — 9 знаков";
	if (!/^\d{4}[0-9A-Z]{2}\d{3}$/.test(kpp)) return "КПП: 4 цифры, затем 2 знака (цифры или буквы), затем 3 цифры";
	if (kpp.startsWith("0000")) return "Неверный код налогового органа в КПП";
	return null;
}
