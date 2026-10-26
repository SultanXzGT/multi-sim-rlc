import type { Mode } from "../lib/circuit";
import { fmt } from "../lib/circuit";

const W = "#e01b1b";

function Meter({ cx, cy, name, reading }: { cx: number; cy: number; name: string; reading: string }) {
  return (
    <g>
      <text x={cx} y={cy - 26} textAnchor="middle" fontSize="12" fontWeight="700" fill="#111">{name}</text>
      <rect x={cx - 22} y={cy - 18} width="44" height="36" rx="3" fill="#cfe8c9" stroke="#333" strokeWidth="1.5" />
      <rect x={cx - 16} y={cy - 13} width="32" height="16" fill="#fff" stroke="#555" strokeWidth=".8" />
      <path d={`M${cx - 12} ${cy + 1} A14 14 0 0 1 ${cx + 12} ${cy + 1}`} fill="none" stroke="#333" strokeWidth=".8" />
      <line x1={cx} y1={cy + 2} x2={cx + 7} y2={cy - 10} stroke="#111" strokeWidth="1.3" />
      <text x={cx - 12} y={cy + 13} fontSize="9" textAnchor="middle" fill="#111">+</text>
      <text x={cx + 12} y={cy + 13} fontSize="9" textAnchor="middle" fill="#111">−</text>
      <circle cx={cx - 12} cy={cy + 18} r="2.5" fill="#fff" stroke="#111" />
      <circle cx={cx + 12} cy={cy + 18} r="2.5" fill="#fff" stroke="#111" />
      <rect x={cx - 34} y={cy - 56} width="68" height="15" rx="3" fill="#111" opacity=".85" />
      <text x={cx} y={cy - 45} textAnchor="middle" fontSize="10" fill="#fff" fontFamily="Consolas, monospace">{reading}</text>
    </g>
  );
}

const Res = () => <path d="M0 0 H15 l3.33 -7 l6.67 14 l6.67 -14 l6.67 14 l6.67 -14 l6.67 14 l3.33 -7 H70" fill="none" stroke="#111" strokeWidth="1.8" />;
const Ind = () => <path d="M0 0 H12 a5.75 5.75 0 0 1 11.5 0 a5.75 5.75 0 0 1 11.5 0 a5.75 5.75 0 0 1 11.5 0 a5.75 5.75 0 0 1 11.5 0 H70" fill="none" stroke="#111" strokeWidth="1.8" />;
const Cap = () => <path d="M0 0 H31 M31 -12 V12 M39 -12 V12 M39 0 H70" fill="none" stroke="#111" strokeWidth="2" />;

function Gen({ x, y, power }: { x: number; y: number; power: boolean }) {
  return (
    <g>
      <text x={x + 10} y={y - 8} fontSize="12" fontWeight="700">XFG1</text>
      <rect x={x} y={y} width="90" height="50" rx="4" fill="#cfe8c9" stroke="#333" strokeWidth="1.5" />
      <rect x={x + 6} y={y + 5} width="44" height="11" fill={power ? "#0a0" : "#555"} />
      <text x={x + 28} y={y + 14} fontSize="8" textAnchor="middle" fill="#fff">Agilent</text>
      <circle cx={x + 70} cy={y + 12} r="7" fill="#fff" stroke="#333" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={x + 8 + i * 11} y={y + 24} width="8" height="6" fill="#333" />)}
      {[0, 1, 2, 3].map((i) => <rect key={i} x={x + 8 + i * 11} y={y + 35} width="8" height="6" fill="#333" />)}
      <circle cx={x + 90} cy={y + 25} r="2.5" fill="#fff" stroke="#111" />
      <circle cx={x + 90} cy={y + 45} r="2.5" fill="#fff" stroke="#111" />
    </g>
  );
}

const Dot = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r="3.2" fill={W} />;
const Ground = ({ x, y }: { x: number; y: number }) => (
  <g stroke="#111" strokeWidth="1.6">
    <line x1={x} y1={y} x2={x} y2={y + 10} />
    <line x1={x - 12} y1={y + 10} x2={x + 12} y2={y + 10} />
    <line x1={x - 8} y1={y + 15} x2={x + 8} y2={y + 15} />
    <line x1={x - 4} y1={y + 20} x2={x + 4} y2={y + 20} />
  </g>
);

const dur = (ratio: number) => `${Math.min(30, 1.2 / Math.max(ratio, 0.04))}s`;

interface Props {
  mode: Mode; power: boolean; R: number; L: number; C: number;
  readings: Record<string, number>; flow: Record<string, number>;
}

export default function Schematic({ mode, power, R, L, C, readings, flow }: Props) {
  const rd = (k: string, u: string) => fmt(readings[k] ?? 0, u);
  const labR = R >= 1000 ? `${+(R / 1000).toPrecision(4)}kΩ` : `${+R.toPrecision(4)}Ω`;
  const labL = L >= 1 ? `${+L.toPrecision(4)}H` : `${+(L * 1000).toPrecision(4)}mH`;
  const labC = C >= 1e-6 ? `${+(C * 1e6).toPrecision(4)}µF` : `${+(C * 1e9).toPrecision(4)}nF`;

  return (
    <div className="grid-dots overflow-x-auto rounded border border-gray-300">
      <style>{`.flow{stroke-dasharray:4 14;animation:flow linear infinite}@keyframes flow{to{stroke-dashoffset:-36}}`}</style>
      {mode === "seri" ? (
        <svg viewBox="20 20 760 360" className="min-w-[700px] w-full">
          <g stroke={W} strokeWidth="1.8" fill="none">
            <path d="M130 280 H233 V242" />
            <path d="M257 242 V280 H300" />
            <path d="M370 280 H430" />
            <path d="M500 280 H560" />
            <path d="M630 280 H720 V340 H140 V300 H130" />
            <path d="M158 242 V280" /><path d="M182 242 V340" />
            <path d="M323 242 V252 H285 V280" /><path d="M347 242 V252 H395 V280" />
            <path d="M453 242 V256 H410 V280" /><path d="M477 242 V256 H520 V280" />
            <path d="M568 242 V256 H540 V280" /><path d="M592 242 V256 H650 V280" />
            <path d="M548 128 V150 H402 V280" /><path d="M572 128 V150 H720 V280" />
          </g>
          {power && (
            <path className="flow" d="M130 280 H233 V242 M257 242 V280 H720 V340 H140 V300 H130" fill="none" stroke="#ffd60a" strokeWidth="3" style={{ animationDuration: dur(flow.main) }} />
          )}
          {[[158, 280], [285, 280], [395, 280], [402, 280], [410, 280], [520, 280], [540, 280], [650, 280], [720, 280], [182, 340]].map(([x, y]) => <Dot key={`${x}-${y}`} x={x} y={y} />)}
          <g transform="translate(300 280)"><Res /></g>
          <g transform="translate(430 280)"><Ind /></g>
          <g transform="translate(560 280)"><Cap /></g>
          <text x="335" y="270" textAnchor="middle" fontSize="13" fontWeight="700">R1</text>
          <text x="335" y="302" textAnchor="middle" fontSize="12">{labR}</text>
          <text x="465" y="268" textAnchor="middle" fontSize="13" fontWeight="700">L1</text>
          <text x="465" y="302" textAnchor="middle" fontSize="12">{labL}</text>
          <text x="595" y="262" textAnchor="middle" fontSize="13" fontWeight="700">C1</text>
          <text x="595" y="306" textAnchor="middle" fontSize="12">{labC}</text>
          <Gen x={40} y={255} power={power} />
          <Meter cx={170} cy={224} name="XMM1" reading={rd("XMM1", "V")} />
          <Meter cx={245} cy={224} name="XMM6" reading={rd("XMM6", "A")} />
          <Meter cx={335} cy={224} name="XMM2" reading={rd("XMM2", "V")} />
          <Meter cx={465} cy={224} name="XMM3" reading={rd("XMM3", "V")} />
          <Meter cx={580} cy={224} name="XMM4" reading={rd("XMM4", "V")} />
          <Meter cx={560} cy={110} name="XMM5" reading={rd("XMM5", "V")} />
          <Ground x={740} y={340} /><path d="M720 340 H740" stroke={W} strokeWidth="1.8" />
        </svg>
      ) : (
        <svg viewBox="20 40 700 400" className="min-w-[640px] w-full">
          <g stroke={W} strokeWidth="1.8" fill="none">
            <path d="M130 170 H218 V138" />
            <path d="M242 138 V170 H378 V138" />
            <path d="M402 138 V170 H560" />
            <path d="M130 190 H140 V400 H640" />
            <path d="M150 170 V262 H178 V252" /><path d="M202 252 V400" />
            {[320, 460, 600].map((mx) => (
              <g key={mx}>
                <path d={`M${mx - 40} 170 V262 H${mx - 12} V252`} />
                <path d={`M${mx + 12} 252 V270`} />
                <path d={`M${mx + 12} 340 V400`} />
              </g>
            ))}
          </g>
          {power && (
            <g fill="none" stroke="#ffd60a" strokeWidth="3">
              <path className="flow" d="M130 170 H218 V138 M242 138 V170 H280" style={{ animationDuration: dur(flow.tot) }} />
              <path className="flow" d="M280 170 V262 H308 V252 M332 252 V400" style={{ animationDuration: dur(flow.R) }} />
              <path className="flow" d="M280 170 H378 V138 M402 138 V170 H420" style={{ animationDuration: dur(flow.LC) }} />
              <path className="flow" d="M420 170 V262 H448 V252 M472 252 V400" style={{ animationDuration: dur(flow.L) }} />
              <path className="flow" d="M420 170 H560 V262 H588 V252 M612 252 V400" style={{ animationDuration: dur(flow.C) }} />
              <path className="flow" d="M640 400 H140 V190 H130" style={{ animationDuration: dur(flow.tot) }} />
            </g>
          )}
          {[[150, 170], [280, 170], [420, 170], [202, 400], [332, 400], [472, 400]].map(([x, y]) => <Dot key={`${x}-${y}`} x={x} y={y} />)}
          <g transform="translate(332 270) rotate(90)"><Res /></g>
          <g transform="translate(472 270) rotate(90)"><Ind /></g>
          <g transform="translate(612 270) rotate(90)"><Cap /></g>
          <text x="345" y="300" fontSize="13" fontWeight="700">R1</text><text x="345" y="316" fontSize="12">{labR}</text>
          <text x="485" y="300" fontSize="13" fontWeight="700">L1</text><text x="485" y="316" fontSize="12">{labL}</text>
          <text x="628" y="300" fontSize="13" fontWeight="700">C1</text><text x="628" y="316" fontSize="12">{labC}</text>
          <Gen x={40} y={145} power={power} />
          <Meter cx={230} cy={120} name="XMM1" reading={rd("XMM1", "A")} />
          <Meter cx={390} cy={120} name="XMM5" reading={rd("XMM5", "A")} />
          <Meter cx={190} cy={234} name="XMM6" reading={rd("XMM6", "V")} />
          <Meter cx={320} cy={234} name="XMM2" reading={rd("XMM2", "A")} />
          <Meter cx={460} cy={234} name="XMM3" reading={rd("XMM3", "A")} />
          <Meter cx={600} cy={234} name="XMM4" reading={rd("XMM4", "A")} />
          <Ground x={660} y={400} /><path d="M640 400 H660" stroke={W} strokeWidth="1.8" />
        </svg>
      )}
    </div>
  );
}
