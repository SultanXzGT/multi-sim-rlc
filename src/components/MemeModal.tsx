import React, { useState } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      {/* Modal Box */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border-4 border-amber-400 animate-pop-in">
        {/* Header bar */}
        <div className={`bg-gradient-to-r ${current.bgColor} px-5 py-3 text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">🎭</span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">{current.tag}</span>
              <h3 className="text-base font-black tracking-wide leading-tight">BETA VERSION POPUP :V</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white font-bold transition text-sm"
            title="Tutup"
          >
            ✕
          </button>
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
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition"
          >
            Ampun Bang, Tutup :v
          </button>
        </div>
      </div>
    </div>
  );
}
