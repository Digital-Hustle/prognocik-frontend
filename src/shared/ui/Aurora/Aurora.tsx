// Живой фон на WebGL (ogl): течёт мягкий шум из фирменных цветов Центр-инвеста — лес, зелёный и лаймовый отсвет,
// как на обложке кейса. Без WebGL — статичный градиент bg-page. При prefers-reduced-motion рисуется один кадр.
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import { memo, useEffect, useRef } from "react";
import { palette, motion as m } from "@/shared/config/tokens";
import { cn } from "@/shared/lib/cn/cn";
import { useIsDark } from "@/shared/lib/hooks/useIsDark/useIsDark";

const vert = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;
const frag = `precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uBg; uniform float uIntensity; uniform float uBand;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 p = uv * vec2(uRes.x/uRes.y, 1.0);
  float t = uTime;
  float n1 = fbm(p * 1.4 + vec2(t, -t * 0.7));
  float n2 = fbm(p * 2.1 - vec2(t * 0.8, t * 0.4) + n1);
  vec3 col = mix(uC1, uC2, smoothstep(0.2, 0.8, n1));
  col = mix(col, uC3, smoothstep(0.55, 0.95, n2) * 0.7);
  float band = mix(1.0, smoothstep(0.0, 0.9, uv.y + n2 * 0.4 - 0.25), uBand);
  gl_FragColor = vec4(mix(uBg, col, band * uIntensity), 1.0);
}`;

const P = palette;
/** Палитры сияния: светлая — зелёный и лайм на «бумаге», тёмная — лес и лайм на тёмном лесу, hero — обложка кейса. */
const TONES = {
	light: { c1: P.green[300], c2: P.green[100], c3: P.lime[500], bg: P.paper[100] },
	dark: { c1: P.green[700], c2: P.forest[800], c3: P.lime[700], bg: P.forest[950] },
	hero: { c1: P.green[600], c2: P.forest[800], c3: P.lime[500], bg: P.forest[900] },
} as const;

interface AuroraProps {
	className?: string;
	/** auto — по теме сайта */
	tone?: "auto" | keyof typeof TONES;
	intensity?: number;
	/** true — сияние сверху и гаснет книзу (герой), false — по всей площади */
	band?: boolean;
	/** fixed — фон всей страницы за контентом */
	fixed?: boolean;
}

/** Одна сила сияния на всех экранах — фон не «прыгает» при переходах. */
export const PAGE_AURORA = 0.5;

export const Aurora = memo(({ className, tone = "auto", intensity = PAGE_AURORA, band = true, fixed }: AuroraProps) => {
	const host = useRef<HTMLDivElement>(null);
	const dark = useIsDark();
	const key = tone === "auto" ? (dark ? "dark" : "light") : tone;
	useEffect(() => {
		const el = host.current;
		if (!el) return;
		let renderer: Renderer;
		try {
			renderer = new Renderer({ dpr: m.aurora.resolution, alpha: false, antialias: false });
		} catch {
			return;
		}
		const gl = renderer.gl;
		el.appendChild(gl.canvas);
		gl.canvas.className = "absolute inset-0 size-full";
		const c = TONES[key];
		const program = new Program(gl, {
			vertex: vert,
			fragment: frag,
			uniforms: {
				uTime: { value: 0 },
				uRes: { value: [1, 1] },
				uIntensity: { value: intensity },
				uBand: { value: band ? 1 : 0 },
				uC1: { value: new Color(c.c1) },
				uC2: { value: new Color(c.c2) },
				uC3: { value: new Color(c.c3) },
				uBg: { value: new Color(c.bg) },
			},
		});
		const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
		const draw = (t: number) => {
			program.uniforms.uTime.value = (t / 1000) * m.aurora.speed;
			renderer.render({ scene: mesh });
		};
		const resize = () => {
			renderer.setSize(el.clientWidth, el.clientHeight);
			program.uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
			draw(performance.now());
		};
		const ro = new ResizeObserver(resize);
		ro.observe(el);
		resize();
		const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
		let raf = 0;
		const loop = (t: number) => {
			if (!document.hidden) draw(t);
			raf = requestAnimationFrame(loop);
		};
		if (!still) raf = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			gl.canvas.remove();
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		};
	}, [key, intensity, band]);
	// fixed — высотой в «большой» экран (lvh): на iOS холст не пересоздаётся при скрытии адресной строки.
	return (
		<div
			ref={host}
			aria-hidden
			className={cn(
				"pointer-events-none -z-10 overflow-hidden bg-page",
				fixed ? "fixed inset-x-0 top-0 h-lvh" : "absolute inset-0",
				className
			)}
		/>
	);
});
