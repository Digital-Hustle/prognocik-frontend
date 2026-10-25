import { FileUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/Button/Button";
import { BulkImportDialog } from "./BulkImportDialog";

export const BulkImportButton = () => {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				variant="quiet"
				onClick={() => setOpen(true)}
			>
				<FileUp />
				Загрузить компании и операции из CSV
			</Button>
			<BulkImportDialog
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
};
