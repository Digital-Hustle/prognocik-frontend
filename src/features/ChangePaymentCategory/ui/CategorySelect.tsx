import { memo, useMemo } from "react";
import { useListCategoriesQuery } from "@/entities/Payment";
import type { Direction } from "@/shared/api/types";
import { Select } from "@/shared/ui/Select/Select";

interface CategorySelectProps {
	companyId: string;
	value: string;
	onChange: (code: string) => void;
	/** Только категории, допустимые для направления операции */
	direction?: Direction;
	size?: "sm" | "md";
	className?: string;
	placeholder?: string;
	"aria-label"?: string;
}

/** Выбор категории из справочника бэка (GET /categories) */
export const CategorySelect = memo(
	({ companyId, value, onChange, direction, size = "sm", className, placeholder, ...aria }: CategorySelectProps) => {
		const { data } = useListCategoriesQuery(companyId, { skip: !companyId });
		const options = useMemo(
			() =>
				(data?.items ?? [])
					.filter((c) => !direction || c.directions.length === 0 || c.directions.includes(direction))
					.map((c) => ({ value: c.code, label: c.name })),
			[data, direction]
		);
		return (
			<Select
				size={size}
				value={value}
				onChange={onChange}
				options={options}
				className={className}
				placeholder={placeholder ?? "Категория"}
				aria-label={aria["aria-label"] ?? "Категория"}
			/>
		);
	}
);
