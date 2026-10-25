import { CheckCheck } from "lucide-react";
import { problemMessage } from "@/shared/api/problem";
import { plural } from "@/shared/lib/format/plural";
import { Button } from "@/shared/ui/Button/Button";
import { Spinner } from "@/shared/ui/Spinner/Spinner";
import { toast } from "@/shared/ui/Toast/Toast";
import { useConfirmAllDetectedMutation } from "../api/detectRecurringApi";

interface ConfirmAllDetectedButtonProps {
	companyId: string;
	accountId: string;
	/** Сколько кандидатов сейчас в статусе DETECTED */
	count: number;
	disabled?: boolean;
}

/** «Подтвердить все найденные»: только новые кандидаты, решённые вручную остаются как есть. */
export const ConfirmAllDetectedButton = ({ companyId, accountId, count, disabled }: ConfirmAllDetectedButtonProps) => {
	const [confirm, state] = useConfirmAllDetectedMutation();

	const onClick = async () => {
		const rs = await confirm({ companyId, accountId });
		if ("error" in rs) return toast.error(problemMessage(rs.error));
		const n = rs.data.items.length;
		if (n === 0) return toast.info("Новых регулярностей для подтверждения нет");
		toast.success(
			`Подтверждено ${n} ${plural(n, "регулярность", "регулярности", "регулярностей")} — пересчитайте прогноз`
		);
	};

	return (
		<Button
			variant="brand"
			disabled={disabled || count === 0 || state.isLoading}
			onClick={onClick}
		>
			{state.isLoading ? <Spinner className="size-5" /> : <CheckCheck />}
			Подтвердить все найденные{count > 0 ? ` · ${count}` : ""}
		</Button>
	);
};
