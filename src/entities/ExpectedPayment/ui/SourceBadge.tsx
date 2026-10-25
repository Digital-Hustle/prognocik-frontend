import { memo } from "react";
import { Status } from "@/shared/ui/Status/Status";
import { describeExternalSystem } from "../lib/externalSystem";
import type { SourceDocument } from "../model/types";

/** Метка «откуда план»: внешняя система + номер документа, если есть. Без документа — ничего. */
export const SourceBadge = memo(({ doc }: { doc: SourceDocument | null | undefined }) => {
	if (!doc) return null;
	const { label, tone } = describeExternalSystem(doc.externalSystem);
	const number = doc.documentNumber ?? doc.externalId;
	return (
		<Status
			tone={tone}
			title={`${label} · № ${number}${doc.issuedDate ? ` от ${doc.issuedDate}` : ""}`}
		>
			{label}
			{number ? ` · № ${number}` : ""}
		</Status>
	);
});
