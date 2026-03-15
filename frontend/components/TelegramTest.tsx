"use client";

export function TelegramTest({ chatId }: { chatId?: string | null }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
      <h4 className="font-semibold text-blue-900 mb-2">
        Telegram Bot (Belum Ready)
      </h4>
      <p className="text-sm text-blue-700 mb-2">
        Fitur Telegram Bot masih dalam pengembangan dan belum aktif untuk
        publik.
      </p>
      <p className="text-xs text-blue-700 mb-4">
        Versi aplikasi saat ini: <strong>v0.3.0</strong>.
      </p>
      <button
        disabled
        className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        Coming Soon
      </button>
    </div>
  );
}
