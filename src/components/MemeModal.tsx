import React, { useEffect, useState } from "react";
import memeKasitau from "../assets/memes/meme-kasitau.png";
import memeGakNgerti from "../assets/memes/meme-gak-ngerti.png";
import memeAyam from "../assets/memes/meme-ayam.png";
import memeKadal from "../assets/memes/meme-kadal.png";
import memeTrimakasih from "../assets/memes/meme-trimakasih.png";

export const MEMES = [
  {
    id: "kasitau",
    img: memeKasitau,
    tag: "Squidward Mode",
    title: "KASITAU GAK YAA...",
    quote: "Mau jawaban Tugas & Pertanyaan? Mau analisis lengkap? Kasitau gak yaaa... Mikir sendiri ya deck, selamat mengerjakan! :v",
    bgColor: "from-teal-600 to-cyan-800",
  },
  {
    id: "gak-ngerti",
    img: memeGakNgerti,
    tag: "Kelinci Puyeng",
    title: "SUMPAH GAK NGERTI!",
    quote: "Udah bolak-balik liat rumus fr = 1/(2π√LC), pas ditanya dosen tetep aja nge-lag loading 99%!",
    bgColor: "from-amber-600 to-orange-800",
  },
  {
    id: "ayam",
    img: memeAyam,
    tag: "Ayam Formal",
    title: "JADI GAK? UDH RAPIH NIH",
    quote: "Udah pakai dasi rapih siap maju asistensi labsheet 10... eh lupa bikin kesimpulan!",
    bgColor: "from-red-600 to-rose-800",
  },
  {
    id: "kadal",
    img: memeKadal,
    tag: "Kadal Santai",
    title: "GA NGERTI TAPI OKE 👍",
    quote: "Gelombang osiloskop jalan, multimeter kedip-kedip, angka gerak... gak ngerti rumusnya tapi yang penting oke jempolan!",
    bgColor: "from-emerald-600 to-green-800",
  },
  {
    id: "trimakasih",
    img: memeTrimakasih,
    tag: "Doa Bersama",
    title: "TRIMAKASIH 🙏",
    quote: "Trimakasih sudah mampir ke Simulator RLC Beta! Kalau mau full version YTTA ya guys, semoga praktikumnya dapet nilai A!",
    bgColor: "from-indigo-600 to-purple-800",
  },
];

interface MemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemeModal({ isOpen, onClose }: MemeModalProps) {
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState(7);

  // Auto-close countdown 7 detik jika tidak ditutup manual
  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(7);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const current = MEMES[index];

  const nextMeme = () => {
    setIndex((prev) => (prev + 1) % MEMES.length);
    setAnimKey((prev) => prev + 1);
  };

  const prevMeme = () => {
    setIndex((prev) => (prev - 1 + MEMES.length) % MEMES.length);
    setAnimKey((prev) => prev + 1);
  };

  const selectMeme = (idx: number) => {
    setIndex(idx);
    setAnimKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Box - Centered in screen */}
      <div className="relative z-10 m-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border-4 border-amber-400 animate-pop-in">
        {/* Auto-close Progress Bar (7s countdown) */}
        <div className="h-1.5 w-full bg-slate-900/30 overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 7) * 100}%` }}
          />
        </div>

        {/* Header bar */}
        <div className={`bg-gradient-to-r ${current.bgColor} px-5 py-3 text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">🎭</span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">{current.tag}</span>
              <h3 className="text-base font-black tracking-wide leading-tight">BETA VERSION POPUP :V</h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Countdown Badge */}
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-mono font-bold text-amber-300 border border-amber-300/40">
              ⏳ {timeLeft}s
            </span>

            {/* Tombol X (Close Button) */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black transition text-base shadow-lg border-2 border-white hover:scale-110 active:scale-95"
              title="Tutup (X)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Meme Image Area */}
        <div className="bg-slate-900 p-4 flex flex-col items-center justify-center min-h-[300px]">
          <div key={animKey} className="relative group max-w-xs overflow-hidden rounded-xl shadow-lg border-2 border-white/20 animate-pop-in">
            <img
              src={current.img}
              alt={current.title}
              className="w-full max-h-[290px] object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Funny dynamic punchline */}
          <div className="mt-3 px-3 py-2 text-center">
            <h4 className="text-lg font-black text-amber-300 tracking-wide drop-shadow">
              "{current.title}"
            </h4>
            <p className="mt-1 text-xs text-slate-200 leading-relaxed font-medium">
              {current.quote}
            </p>
          </div>
        </div>

        {/* Thumbnail Selector Bar */}
        <div className="bg-slate-100 p-2.5 border-t border-slate-200 flex items-center justify-center gap-2">
          {MEMES.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => selectMeme(idx)}
              className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                index === idx
                  ? "border-amber-500 scale-110 shadow-md ring-2 ring-amber-300"
                  : "border-slate-300 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={m.img} alt={m.title} className="h-10 w-10 object-cover" />
            </button>
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-white flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMeme}
              className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
            >
              ◀ Prev
            </button>
            <button
              onClick={nextMeme}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 px-4 py-2 text-xs font-black text-white shadow hover:opacity-95 transition flex items-center gap-1 animate-pulse"
            >
              Next Meme 😂 ({index + 1}/{MEMES.length})
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition flex items-center gap-1.5"
          >
            <span>Tutup Sekarang ({timeLeft}s)</span>
            <span className="font-bold text-rose-400">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}
