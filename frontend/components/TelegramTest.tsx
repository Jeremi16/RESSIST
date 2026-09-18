"use client";

export function TelegramTest({ chatId }: { chatId?: string | null }) {
  return (
    <div className="bg-[#60A8F8]/10 border border-[#60A8F8]/30 rounded-lg p-6 mt-6">
      <h4 className="font-semibold text-[#0043A5] mb-2">
        Telegram Bot (Belum Ready)
      </h4>
      <p className="text-sm text-[#0059D0] mb-2">
        Fitur Telegram Bot masih dalam pengembangan dan belum aktif untuk
        publik.
      </p>
      <p className="text-xs text-[#0059D0] mb-4">
        Versi aplikasi saat ini: <strong>v0.3.4</strong>.
      </p>
      <button
        disabled
        className="bg-[#0059D0] text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        Coming Soon
      </button>
    </div>
  );
}
