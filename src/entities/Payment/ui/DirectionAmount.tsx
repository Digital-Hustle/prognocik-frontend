import { memo } from "react";
import type { Direction, Money } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn/cn";
import { formatMoneyExact } from "@/shared/lib/format/money";

interface DirectionAmountProps {
	amount: Money | null;
	direction: Direction;
	className?: string;
}

/** Сумма со знаком направления: поступление зелёным с «+», списание — обычным с «−» */
export const DirectionAmount = memo(({ amount, direction, className }: DirectionAmountProps) => (
	<span
		className={cn(
			"font-medium whitespace-nowrap tabular-nums",
			direction === "IN" ? "text-success-soft-foreground" : "text-foreground",
			className
		)}
	>
		{direction === "IN" ? "+" : "−"}
		{formatMoneyExact(amount)}
	</span>
));
