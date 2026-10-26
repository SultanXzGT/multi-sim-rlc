import { useId, useState } from "react";
import { fmt } from "../lib/circuit";

export interface Series { name: string; color: string; ys: number[]; dash?: boolean; }

interface ChartProps {
  title: string;
  xs: number[];
  series: Series[];
  unit: string;
  f: number;
  fr: number;
  band?: [number, number];
  fixedY?: { lo: number; hi: number; ticks: number[]; fmt: (v: number) => string };
  onPick?: (f: number) => void;
}

const W = 640, H = 330, M = { l: 78, r: 18, t: 16, b: 44 };
const XMAX = 7000;
const PW = W - M.l - M.r, PH = H - M.t - M.b;
const XTICKS = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000];

function niceNum(range: number, round: boolean) {
  const exp = Math.floor(Math.log10(range));
  const fr = range / 10 ** exp;
  let nf: number;
  if (round) nf = fr < 1.5 ? 1 : fr < 3 ? 2 : fr < 7 ? 5 : 10;
  else nf = fr <= 1 ? 1 : fr <= 2 ? 2 : fr <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

function niceScale(max: number, n = 6) {
  const step = niceNum(max / (n - 1), true);
  const hi = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let i = 0; i * step <= hi + step / 2; i++) ticks.push(+(i * step).toPrecision(10));
  return { hi, ticks };
}

const PF: [number, string][] = [[1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"]];
function pickScale(maxAbs: number, unit: string) {
  for (const [m, p] of PF) if (maxAbs >= m) return { k: m, u: p + unit };
  return { k: 1e-6, u: "µ" + unit };
}

const tickTxt = (v: number) => String(+v.toPrecision(3));

export function LineChart({ title, xs, series, unit, f, fr, band, fixedY, onPick }: ChartProps) {
  const id = useId().replace(/:/g, "");
  const [hov, setHov] = useState<number | null>(null);
  const step = xs[1] - xs[0];

  let lo = 0, hi: number, ticks: number[], k = 1, u = unit, vf: (v: number) => string;
  if (fixedY) {
    lo = fixedY.lo; hi = fixedY.hi; ticks = fixedY.ticks; vf = fixedY.fmt;
  } else {
    let mx = 0;
    series.forEach((s) => s.ys.forEach((y, i) => { if (xs[i] >= 400 && y > mx) mx = y; }));
    const sc = niceScale(mx * 1.04);
    hi = sc.hi; ticks = sc.ticks;
    const p = pickScale(hi, unit);
    k = p.k; u = p.u;
    vf = (v) => fmt(v, unit, 3);
  }

  const lx = (x: number) => M.l + (x / XMAX) * PW;
  const ly = (y: number) => M.t + PH - ((y - lo) / (hi - lo)) * PH;
  const idxOf = (v: number) => Math.min(xs.length - 1, Math.max(0, Math.round((v - xs[0]) / step)));
  const pathOf = (ys: number[]) => xs.map((x, i) => `${i ? "L" : "M"}${lx(x).toFixed(1)} ${ly(ys[i]).toFixed(1)}`).join("");

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    if (px < M.l || px > M.l + PW) { setHov(null); return; }
    setHov(idxOf(((px - M.l) / PW) * XMAX));
  };

  const fi = idxOf(f);
  const showCur = f >= xs[0] && f <= xs[xs.length - 1];

  let tip = null as React.ReactNode;
  if (hov !== null) {
    const x = lx(xs[hov]);
    const bw = 176, bh = 22 + series.length * 16;
    const bx = x + bw + 14 > W ? x - bw - 10 : x + 10;
    const by = M.t + 6;
    tip = (
      <g pointerEvents="none">
        <line x1={x} x2={x} y1={M.t} y2={M.t + PH} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
        {series.map((s) => <circle key={s.name} cx={x} cy={ly(s.ys[hov])} r="3.5" fill={s.color} stroke="#fff" />)}
        <rect x={bx} y={by} width={bw} height={bh} rx="6" fill="#fff" stroke="#94a3b8" />
        <text x={bx + 9} y={by + 15} fontSize="11" fontWeight="700" fill="#0f172a">f = {xs[hov]} Hz</text>
        {series.map((s, i) => (
          <g key={s.name}>
            <rect x={bx + 9} y={by + 22 + i * 16 - 8} width="9" height="9" rx="2" fill={s.color} />
            <text x={bx + 23} y={by + 22 + i * 16} fontSize="10.5" fill="#1e293b">{s.name}: {vf(s.ys[hov])}</text>
          </g>
        ))}
      </g>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1">
              <i className="inline-block h-0.5 w-4 rounded" style={{ background: s.color, borderTop: s.dash ? `2px dashed ${s.color}` : undefined, height: s.dash ? 0 : undefined }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        style={{ cursor: onPick ? "crosshair" : "default" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHov(null)}
        onClick={() => onPick && hov !== null && onPick(xs[hov])}
      >
        <defs>
          <clipPath id={id}><rect x={M.l} y={M.t} width={PW} height={PH} /></clipPath>
        </defs>
        <rect x={M.l} y={M.t} width={PW} height={PH} fill="#f8fafc" />

        {ticks.map((t) => (
          <g key={"y" + t}>
            <line x1={M.l} x2={M.l + PW} y1={ly(t)} y2={ly(t)} stroke={t === 0 ? "#64748b" : "#e2e8f0"} strokeWidth={t === 0 ? 1.2 : 1} />
            <text x={M.l - 8} y={ly(t) + 4} textAnchor="end" fontSize="11" fill="#334155">{tickTxt(t / k)}</text>
          </g>
        ))}
        {XTICKS.map((t) => (
          <g key={"x" + t}>
            <line x1={lx(t)} x2={lx(t)} y1={M.t} y2={M.t + PH} stroke="#e2e8f0" />
            <text x={lx(t)} y={M.t + PH + 16} textAnchor="middle" fontSize="11" fill="#334155">{t}</text>
          </g>
        ))}

        {band && (
          <g>
            <rect x={lx(band[0])} y={M.t} width={lx(band[1]) - lx(band[0])} height={PH} fill="#3b82f6" opacity="0.12" />
            <text x={(lx(band[0]) + lx(band[1])) / 2} y={M.t + PH - 6} textAnchor="middle" fontSize="10" fill="#1d4ed8" fontWeight="700">BW</text>
          </g>
        )}

        {fr >= xs[0] && fr <= XMAX && (
          <g>
            <line x1={lx(fr)} x2={lx(fr)} y1={M.t} y2={M.t + PH} stroke="#16a34a" strokeWidth="1.6" strokeDasharray="6 4" />
            <rect x={lx(fr) + 4} y={M.t + 4} width="78" height="16" rx="4" fill="#16a34a" />
            <text x={lx(fr) + 9} y={M.t + 15.5} fontSize="10.5" fontWeight="700" fill="#fff">fr = {fr.toFixed(0)} Hz</text>
          </g>
        )}

        {showCur && <line x1={lx(f)} x2={lx(f)} y1={M.t} y2={M.t + PH} stroke="#dc2626" strokeWidth="1" opacity="0.7" />}

        <g clipPath={`url(#${id})`}>
          {series.map((s) => (
            <path key={s.name} d={pathOf(s.ys)} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dash ? "6 4" : undefined} />
          ))}
        </g>

        {showCur && series.map((s) => (
          <circle key={"m" + s.name} cx={lx(f)} cy={ly(s.ys[fi])} r="4.5" fill={s.color} stroke="#fff" strokeWidth="1.5" />
        ))}

        {tip}

        <text x={M.l - 8} y={M.t - 3} textAnchor="end" fontSize="11" fontWeight="700" fill="#0f172a">[{u}]</text>
        <text x={M.l + PW / 2} y={H - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155">Frekuensi (Hz)</text>
      </svg>
    </div>
  );
}

export function Scope({ phi, vLabel, iLabel }: { phi: number; vLabel: string; iLabel: string }) {
  const w = 620, h = 170, mid = h / 2;
  const pts = (shift: number, amp: number) =>
    Array.from({ length: 241 }, (_, i) => {
      const x = (i / 240) * w;
      const th = (i / 240) * 4 * Math.PI;
      return `${x.toFixed(1)},${(mid - amp * Math.sin(th - (shift * Math.PI) / 180)).toFixed(1)}`;
    }).join(" ");
  return (
    <div className="rounded-xl border border-slate-700 bg-[#07140c] p-3 shadow-inner">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {Array.from({ length: 13 }, (_, i) => <line key={"v" + i} x1={(i * w) / 12} x2={(i * w) / 12} y1="0" y2={h} stroke="#173d25" />)}
        {Array.from({ length: 7 }, (_, i) => <line key={"h" + i} y1={(i * h) / 6} y2={(i * h) / 6} x1="0" x2={w} stroke="#173d25" />)}
        <line x1="0" x2={w} y1={mid} y2={mid} stroke="#2f7a44" />
        <polyline points={pts(0, 60)} fill="none" stroke="#facc15" strokeWidth="2.2" />
        <polyline points={pts(phi, 42)} fill="none" stroke="#22d3ee" strokeWidth="2.2" />
        <text x="10" y="18" fontSize="12" fill="#facc15">{vLabel}</text>
        <text x="10" y="36" fontSize="12" fill="#22d3ee">{iLabel}</text>
        <text x={w - 10} y="18" fontSize="12" fill="#fff" textAnchor="end">Δφ = {phi.toFixed(2)}°</text>
      </svg>
    </div>
  );
}
