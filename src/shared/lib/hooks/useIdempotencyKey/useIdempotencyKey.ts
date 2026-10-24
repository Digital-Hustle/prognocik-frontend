import { useCallback, useRef } from "react";
import { uuid } from "../../id/uuid";

/**
 * Idempotency-Key по правилам бэка: новый UUID на новую операцию, тот же ключ при повторе с тем же телом.
 * get(body) — ключ для этого тела (тело изменилось → новый ключ); done() — операция завершена, следующий вызов получит новый.
 */
export function useIdempotencyKey() {
	const ref = useRef<{ key: string; fingerprint: string } | null>(null);

	const get = useCallback((body: unknown) => {
		const fingerprint = JSON.stringify(body ?? null);
		if (!ref.current || ref.current.fingerprint !== fingerprint) {
			ref.current = { key: uuid(), fingerprint };
		}
		return ref.current.key;
	}, []);

	const done = useCallback(() => {
		ref.current = null;
	}, []);

	return { get, done };
}
