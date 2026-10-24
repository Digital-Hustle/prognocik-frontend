export type Mods = Record<string, boolean | string | undefined | null>;

export function classNames(
	cls: string,
	mods: Mods = {},
	additional: Array<string | undefined | false | null> = []
): string {
	return [
		cls,
		...additional.filter(Boolean),
		...Object.entries(mods)
			.filter(([, value]) => Boolean(value))
			.map(([className]) => className),
	].join(" ");
}
