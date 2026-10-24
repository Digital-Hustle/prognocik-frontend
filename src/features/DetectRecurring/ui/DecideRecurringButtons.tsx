import { Check, X } from "lucide-react";
import { memo } from "react";
import type { RecurringPattern } from "@/entities/Recurring";
import { problemMessage } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { toast } from "@/shared/ui/Toast/Toast";
import { useDecideRecurringMutation } from "../api/detectRecurringApi";

interface DecideRecurringButtonsProps {
	companyId: string;
	accountId: string;
	pattern: RecurringPattern;
	disabled?: boolean;
}

/** Пользователь подтверждает или исключает регулярность. DETECTED ставит только детектор. */
export const DecideRecurringButtons = memo(
	({ companyId, accountId, pattern, disabled }: DecideRecurringButtonsProps) => {
		const [decide, state] = useDecideRecurringMutation();

		const send = async (status: "CONFIRMED" | "EXCLUDED") => {
			const rs = await decide({ companyId, accountId, patternId: pattern.id, version: pattern.version, status });
			if ("error" in rs) toast.error(problemMessage(rs.error));
			else toast.success(status === "CONFIRMED" ? "Учтём в прогнозе" : "Исключено из прогноза");
		};

		return (
			<div className="flex shrink-0 items-center gap-1.5">
				<Button
					size="sm"
					variant={pattern.status === "CONFIRMED" ? "accent" : "outline"}
					aria-pressed={pattern.status === "CONFIRMED"}
					disabled={disabled || state.isLoading || pattern.status === "CONFIRMED"}
					onClick={() => void send("CONFIRMED")}
				>
					<Check />
					Учитывать
				</Button>
				<Button
					size="sm"
					variant={pattern.status === "EXCLUDED" ? "danger-soft" : "quiet"}
					aria-pressed={pattern.status === "EXCLUDED"}
					disabled={disabled || state.isLoading || pattern.status === "EXCLUDED"}
					onClick={() => void send("EXCLUDED")}
				>
					<X />
					Исключить
				</Button>
			</div>
		);
	}
);
