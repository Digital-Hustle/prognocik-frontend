export type Inline = { t: "text"; v: string } | { t: "ref"; id: string };
export type Block = { t: "p"; inline: Inline[] } | { t: "ul"; items: Inline[][] };

const REF = /\[([sf]\d+)\]/g;

function inline(text: string): Inline[] {
	const out: Inline[] = [];
	let last = 0;
	for (const m of text.matchAll(REF)) {
		const at = m.index ?? 0;
		if (at > last) out.push({ t: "text", v: text.slice(last, at) });
		out.push({ t: "ref", id: m[1] });
		last = at + m[0].length;
	}
	if (last < text.length) out.push({ t: "text", v: text.slice(last) });
	return out;
}

/**
 * Ответ модели — простой текст: абзацы, списки «- …» и ссылки [s1]/[f2]. Разбираем сами и рендерим React-узлами,
 * HTML/Markdown из ответа не исполняем.
 */
export function parseAnswer(answer: string): Block[] {
	const blocks: Block[] = [];
	let list: Inline[][] | null = null;
	for (const raw of answer.split(/\r?\n/)) {
		const line = raw.trim();
		const bullet = /^[-•*]\s+(.*)$/.exec(line);
		if (bullet) {
			if (!list) {
				list = [];
				blocks.push({ t: "ul", items: list });
			}
			list.push(inline(bullet[1]));
			continue;
		}
		list = null;
		if (line) blocks.push({ t: "p", inline: inline(line) });
	}
	return blocks;
}
