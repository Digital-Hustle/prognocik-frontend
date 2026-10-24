import { Tags, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useState } from "react";
import type { Payment } from "@/entities/Payment";
import { problemMessage } from "@/shared/api/problem";
import { spring, tween } from "@/shared/config/motion";
import { plural } from "@/shared/lib/format/plural";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { toast } from "@/shared/ui/Toast/Toast";
import { CategorySelect } from "./CategorySelect";
import { useBulkChangeCategoryMutation } from "../api/categoryApi";

interface BulkCategoryBarProps {
	companyId: string;
	accountId: string;
	selected: Payment[];
	onClear: () => void;
}

/** Плавающая панель массовой смены категории (до 200 операций, атомарно) */
export const BulkCategoryBar = memo(({ companyId, accountId, selected, onClear }: BulkCategoryBarProps) => {
	const [code, setCode] = useState("");
	const [bulk, state] = useBulkChangeCategoryMutation();
	const idem = useIdempotencyKey();
	const directions = new Set(selected.map((p) => p.direction));
	const direction = directions.size === 1 ? [...directions][0] : undefined;

	const apply = async () => {
		if (!code) return;
		const payments = selected.slice(0, 200).map((p) => ({ paymentId: p.id, expectedVersion: p.version }));
		const body = { categoryCode: code, payments };
		const rs = await bulk({ companyId, accountId, ...body, idempotencyKey: idem.get(body) });
		if ("error" in rs) {
			toast.error(problemMessage(rs.error));
			return;
		}
		idem.done();
		toast.success(
			`Категория изменена у ${payments.length} ${plural(payments.length, "операции", "операций", "операций")}`
		);
		setCode("");
		onClear();
	};

	return (
		<AnimatePresence>
			{selected.length > 0 && (
				<motion.div
					initial={{ y: 80, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 80, opacity: 0, transition: tween.exit }}
					transition={{ ...spring.sheet, opacity: tween.fast }}
					className="pointer-events-none fixed inset-x-0 bottom-4 z-sticky flex justify-center px-3 pb-safe"
				>
					<div className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-lg bg-inverse p-2 pl-4 text-inverse-foreground shadow-pop">
						<Tags className="size-5 shrink-0 text-lime" />
						<span className="text-sm font-medium">
							Выбрано {selected.length} {plural(selected.length, "операция", "операции", "операций")}
							{selected.length > 200 && " (за раз — до 200)"}
						</span>
						<div className="ml-auto flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
							<CategorySelect
								companyId={companyId}
								direction={direction}
								value={code}
								onChange={setCode}
								className="min-w-0 flex-1 text-foreground sm:w-56"
								placeholder="Новая категория"
							/>
							<Button
								size="sm"
								variant="brand"
								disabled={!code || state.isLoading}
								onClick={() => void apply()}
							>
								Применить
							</Button>
							<Button
								size="icon-sm"
								variant="ghost"
								className="text-inverse-foreground hover:bg-white/10"
								aria-label="Снять выделение"
								onClick={onClear}
							>
								<X />
							</Button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
});
