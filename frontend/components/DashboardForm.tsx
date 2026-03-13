'use client'

import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Bell, Link2, Filter, Save, Sparkles, AlertCircle, CheckCircle2, Layout, Clock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardFormProps {
  initialData: {
    whatsapp_number?: string | null
    whatsapp_enabled?: boolean
    telegram_chat_id?: string | null
    telegram_enabled?: boolean
    moodle_calendar_url?: string | null
    reminder_hours?: string | null
    morning_briefing?: boolean
    muted_courses?: string | null
  }
  onSave: (data: {
    whatsapp_number: string
    whatsapp_enabled: boolean
    telegram_chat_id: string
    telegram_enabled: boolean
    moodle_calendar_url: string
    reminder_hours: string
    muted_courses: string
    morning_briefing: boolean
  }) => Promise<void>
  onTest: (url: string) => Promise<void>
  availableCourses?: string[]
  isLoading: boolean
  isTesting: boolean
}

export function DashboardForm({
  initialData,
  onSave,
  onTest,
  availableCourses = [],
  isLoading,
  isTesting,
}: DashboardFormProps) {
  const [whatsappNumber, setWhatsappNumber] = useState(
    initialData.whatsapp_number || ''
  )
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    initialData.whatsapp_enabled !== false
  )
  const [telegramChatId, setTelegramChatId] = useState(
    initialData.telegram_chat_id || ''
  )
  const [telegramEnabled, setTelegramEnabled] = useState(
    initialData.telegram_enabled !== false
  )
  const [moodleUrl, setMoodleUrl] = useState(
    initialData.moodle_calendar_url || ''
  )
  const [reminderHours, setReminderHours] = useState<number[]>(() => {
    try {
      return JSON.parse(initialData.reminder_hours || '[24]')
    } catch {
      return [24]
    }
  })
  const [morningBriefing, setMorningBriefing] = useState(
    initialData.morning_briefing || false
  )
  const [mutedCourses, setMutedCourses] = useState<string[]>(() => {
    try {
      return JSON.parse(initialData.muted_courses || '[]')
    } catch {
      return []
    }
  })
  const [saveSuccess, setSaveSuccess] = useState(false)

  const REMINDER_OPTIONS = [
    { value: 24, label: '24 Jam' },
    { value: 12, label: '12 Jam' },
    { value: 6, label: '6 Jam' },
    { value: 1, label: '1 Jam' },
  ]

  const toggleReminderHour = (hour: number) => {
    setReminderHours((prev) => {
      if (prev.includes(hour)) {
        if (prev.length === 1) return prev
        return prev.filter((h) => h !== hour)
      }
      return [...prev, hour].sort((a, b) => b - a)
    })
  }

  const toggleMutedCourse = (course: string) => {
    setMutedCourses((prev) => {
      if (prev.includes(course)) {
        return prev.filter((c) => c !== course)
      }
      return [...prev, course]
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaveSuccess(false)
    await onSave({
      whatsapp_number: whatsappNumber,
      whatsapp_enabled: whatsappEnabled,
      telegram_chat_id: telegramChatId,
      telegram_enabled: telegramEnabled,
      moodle_calendar_url: moodleUrl,
      reminder_hours: JSON.stringify(reminderHours),
      muted_courses: JSON.stringify(mutedCourses),
      morning_briefing: morningBriefing,
    })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleTest = async () => {
    if (!moodleUrl) {
      alert('Silakan masukkan URL kalender Moodle terlebih dahulu')
      return
    }
    await onTest(moodleUrl)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Integrasi Moodle Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
            <div className="size-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <Link2 className="size-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Integrasi Moodle</h3>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="moodle" className="text-sm font-bold text-slate-700 pl-1">URL Ekspor Kalender Moodle</label>
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="url"
              id="moodle"
              value={moodleUrl}
              onChange={(e) => setMoodleUrl(e.target.value)}
              placeholder="https://moodle.itera.ac.id/calendar/export_execute.php..."
              className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
            />
          </div>
          <p className="text-[11px] text-slate-400 pl-1 flex items-center gap-1">
            <AlertCircle className="size-3" /> Tempel URL ekspor kalender (format ICS) dari Moodle ITERA.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting || !moodleUrl}
          className="w-full h-12 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {isTesting ? (
            <Loader2 className="size-4 animate-spin text-blue-600" />
          ) : (
            <Sparkles className="size-4 text-blue-600 group-hover:scale-110 transition-transform" />
          )}
          {isTesting ? 'Sedang mengetes...' : 'Tes Koneksi Kalender'}
        </button>
      </section>

      {/* Saluran Notifikasi Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
            <div className="size-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                <Bell className="size-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Saluran Notifikasi</h3>
        </div>

        {/* Telegram Config */}
        <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className="size-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600">
                    <svg className="size-6 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.45-.42-1.39-.89.03-.24.36-.49.99-.75 3.88-1.69 6.47-2.8 7.76-3.32 3.69-1.5 4.46-1.76 4.96-1.77.11 0 .35.03.51.16.13.1.17.24.18.33.01.06.02.21.01.29z"/></svg>
                </div>
                <div>
                    <h4 className="text-sm font-black text-slate-800 tracking-tight">Telegram Reminder</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Buka bot dan ketik <strong>/id</strong></p>
                </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
          </div>

          <div className="relative group">
            <Layout className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              id="telegram"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Masukkan ID Chat Telegram kamu"
              className="w-full h-12 bg-white border border-slate-100 rounded-xl pl-12 pr-4 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Preferensi Waktu Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
            <div className="size-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                <Clock className="size-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Preferensi Pengingat</h3>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-slate-700 pl-1">Ingatkan saya sebelum deadline:</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {REMINDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleReminderHour(opt.value)}
                className={cn(
                  "h-12 px-4 rounded-xl text-xs font-black tracking-tight transition-all border flex items-center justify-center gap-2",
                  reminderHours.includes(opt.value)
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Morning Briefing Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex gap-4">
              <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl">🌅</div>
              <div>
                <h4 className="text-sm font-black text-slate-900 tracking-tight">Morning Briefing</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[200px]">Ringkasan tugas harian dikirim setiap pukul 07:00 WIB.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={morningBriefing}
                onChange={(e) => setMorningBriefing(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-amber-200/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Filter Mata Kuliah Section */}
      {availableCourses.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-slate-100">
           <div className="flex items-center gap-3 mb-2">
                <div className="size-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                    <Filter className="size-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Filter Mata Kuliah</h3>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {availableCourses.map((course) => (
                    <motion.div
                        key={course}
                        whileHover={{ x: 4 }}
                        className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            mutedCourses.includes(course)
                                ? "bg-slate-50 border-slate-100 opacity-60"
                                : "bg-white border-slate-100 shadow-sm"
                        )}
                    >
                        <span className={cn("text-xs font-bold truncate pr-4", mutedCourses.includes(course) ? "text-slate-400 italic" : "text-slate-700")}>
                            {course}
                        </span>
                        <button
                            type="button"
                            onClick={() => toggleMutedCourse(course)}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                mutedCourses.includes(course)
                                    ? "bg-slate-200 text-slate-500"
                                    : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                            )}
                        >
                            {mutedCourses.includes(course) ? '🔇 Muted' : '🔊 Active'}
                        </button>
                    </motion.div>
                ))}
            </div>
        </section>
      )}

      {/* Action Buttons */}
      <div className="pt-8 border-t border-slate-100 flex flex-col gap-4">
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold"
          >
            <CheckCircle2 className="size-5" />
            Konfigurasi berhasil disimpan!
          </motion.div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Save className="size-5" />
          )}
          Simpan Konfigurasi
        </button>
      </div>
    </form>
  )
}

function Loader2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
