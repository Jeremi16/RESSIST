'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  Bell,
  BellOff,
  Sun,
  Send,
  Sunrise,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GeneralSettingsProps {
  reminderHours: number[]
  morningBriefing: boolean
  mutedCourses: string[]
  availableCourses: { id: string; name: string }[]
  telegramConnected: boolean
  telegramEnabled: boolean
  onSave: (data: {
    reminder_hours: string
    morning_briefing: boolean
    muted_courses: string
  }) => Promise<void>
  isLoading: boolean
}

export function GeneralSettings({
  reminderHours,
  morningBriefing,
  mutedCourses,
  availableCourses,
  telegramConnected,
  telegramEnabled,
  onSave,
  isLoading,
}: GeneralSettingsProps) {
  const [hours, setHours] = useState<number[]>(reminderHours)
  const [briefing, setBriefing] = useState(morningBriefing)
  const [muted, setMuted] = useState<string[]>(mutedCourses)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [testingReminder, setTestingReminder] = useState(false)
  const [testingBriefing, setTestingBriefing] = useState(false)
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const reminderOptions = [
    { value: 24, label: '24 Jam', sublabel: 'Sehari sebelum', emoji: '📅' },
    { value: 12, label: '12 Jam', sublabel: 'Setengah hari', emoji: '🕛' },
    { value: 6, label: '6 Jam', sublabel: 'Pagi / Sore', emoji: '⏰' },
    { value: 1, label: '1 Jam', sublabel: 'Mendesak!', emoji: '🚨' },
  ]

  const toggleHour = (hour: number) => {
    setHours((prev) =>
      prev.includes(hour)
        ? prev.length > 1
          ? prev.filter((h) => h !== hour)
          : prev
        : [...prev, hour].sort((a, b) => b - a)
    )
  }

  const toggleMuteCourse = (courseName: string) => {
    setMuted((prev) =>
      prev.includes(courseName)
        ? prev.filter((c) => c !== courseName)
        : [...prev, courseName]
    )
  }

  const handleSave = async () => {
    await onSave({
      reminder_hours: JSON.stringify(hours),
      morning_briefing: briefing,
      muted_courses: JSON.stringify(muted),
    })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const sendTest = async (type: 'reminder' | 'briefing') => {
    if (!telegramConnected || !telegramEnabled) {
      setTestMessage({ type: 'error', text: 'Telegram belum terhubung atau dinonaktifkan.' })
      setTimeout(() => setTestMessage(null), 4000)
      return
    }

    if (type === 'reminder') setTestingReminder(true)
    else setTestingBriefing(true)
    setTestMessage(null)

    try {
      const endpoint = type === 'reminder' ? '/api/telegram/test-reminder' : '/api/telegram/test-briefing'
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (res.ok) {
        setTestMessage({
          type: 'success',
          text: type === 'reminder'
            ? 'Reminder berhasil dikirim ke Telegram! ✅'
            : 'Morning briefing berhasil dikirim! ☀️',
        })
      } else {
        setTestMessage({ type: 'error', text: data.error || 'Gagal mengirim notifikasi.' })
      }
    } catch {
      setTestMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' })
    } finally {
      if (type === 'reminder') setTestingReminder(false)
      else setTestingBriefing(false)
      setTimeout(() => setTestMessage(null), 5000)
    }
  }

  const hasChanges =
    JSON.stringify(hours) !== JSON.stringify(reminderHours) ||
    briefing !== morningBriefing ||
    JSON.stringify(muted) !== JSON.stringify(mutedCourses)

  const canTest = telegramConnected && telegramEnabled
  const activeCount = availableCourses.length - muted.length

  return (
    <div className="space-y-8">

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {testMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center gap-3 px-5 py-4 rounded-2xl border-2 text-sm font-bold',
              testMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            )}
          >
            {testMessage.type === 'success'
              ? <CheckCircle2 className="size-5 shrink-0" />
              : <AlertCircle className="size-5 shrink-0" />
            }
            {testMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────
          Main two-column grid (stacks on mobile)
      ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* Reminder Hours */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Waktu Pengingat</h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Pilih kapan bot mengirim peringatan sebelum deadline</p>
                </div>
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3">
              {reminderOptions.map((opt) => {
                const active = hours.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleHour(opt.value)}
                    className={cn(
                      'relative p-4 rounded-2xl text-left transition-all border-2 active:scale-[0.97]',
                      active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-slate-50 border-transparent text-slate-700 hover:border-blue-200 hover:bg-white'
                    )}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className="block text-xl font-black leading-tight">{opt.label}</span>
                    <span className={cn('text-[11px] font-semibold mt-0.5 block', active ? 'text-blue-200' : 'text-slate-400')}>
                      {opt.sublabel}
                    </span>
                    {active && (
                      <CheckCircle2 className="absolute top-3 right-3 size-4 text-white/70" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="px-5 pb-5">
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">
                ℹ️ Bot mengirim pengingat <strong>sebelum deadline</strong>. Boleh pilih lebih dari satu waktu.
              </p>
            </div>
          </section>

          {/* Morning Briefing */}
          <section className="relative overflow-hidden rounded-3xl">
            {/* Gradient background */}
            <div className={cn(
              'absolute inset-0 transition-all duration-500',
              briefing
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : 'bg-gradient-to-br from-slate-200 to-slate-300'
            )} />
            <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-4 size-28 rounded-full bg-white/5" />

            <div className="relative z-10 p-6 flex items-start gap-5 justify-between">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'size-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300',
                  briefing ? 'bg-white/25' : 'bg-white/40'
                )}>
                  <Sun className={cn('size-7', briefing ? 'text-white' : 'text-slate-500')} />
                </div>
                <div>
                  <h4 className={cn('text-base font-black mb-1', briefing ? 'text-white' : 'text-slate-600')}>
                    Morning Briefing
                  </h4>
                  <p className={cn('text-sm leading-relaxed max-w-xs', briefing ? 'text-amber-100' : 'text-slate-500')}>
                    Ringkasan tugas harian tiap pagi jam <strong className={briefing ? 'text-white' : 'text-slate-700'}>07:00 WIB</strong>. ☀️
                  </p>
                  {briefing && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-amber-200 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-100">Aktif</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pill Toggle */}
              <button
                onClick={() => setBriefing((v) => !v)}
                className={cn(
                  'relative shrink-0 h-8 w-14 rounded-full transition-all duration-300',
                  briefing ? 'bg-white/30 shadow-inner' : 'bg-white/50'
                )}
                aria-label="Toggle morning briefing"
              >
                <span className={cn(
                  'absolute top-1 size-6 rounded-full shadow transition-all duration-300',
                  briefing ? 'left-7 bg-white' : 'left-1 bg-white/80'
                )} />
              </button>
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

          {/* Test Telegram Section */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Send className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Uji Coba Telegram</h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Kirim notifikasi percobaan untuk memastikan semuanya berfungsi</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {/* Test Reminder */}
              <button
                onClick={() => sendTest('reminder')}
                disabled={testingReminder || !canTest}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group',
                  canTest
                    ? 'border-blue-100 bg-blue-50 hover:bg-blue-600 hover:border-blue-600 hover:text-white active:scale-[0.98]'
                    : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                )}
              >
                <div className={cn(
                  'size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  canTest ? 'bg-blue-100 text-blue-600 group-hover:bg-white/20 group-hover:text-white' : 'bg-slate-200 text-slate-400'
                )}>
                  {testingReminder
                    ? <Loader2 className="size-5 animate-spin" />
                    : <Bell className="size-5" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-black', canTest ? 'text-blue-900 group-hover:text-white' : 'text-slate-400')}>
                    Test Reminder Tugas
                  </p>
                  <p className={cn('text-xs font-medium mt-0.5', canTest ? 'text-blue-500 group-hover:text-blue-100' : 'text-slate-400')}>
                    {testingReminder ? 'Mengirim...' : 'Kirim notifikasi tugas contoh'}
                  </p>
                </div>
              </button>

              {/* Test Morning Briefing */}
              <button
                onClick={() => sendTest('briefing')}
                disabled={testingBriefing || !canTest}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group',
                  canTest
                    ? 'border-amber-100 bg-amber-50 hover:bg-amber-500 hover:border-amber-500 hover:text-white active:scale-[0.98]'
                    : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                )}
              >
                <div className={cn(
                  'size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  canTest ? 'bg-amber-100 text-amber-600 group-hover:bg-white/20 group-hover:text-white' : 'bg-slate-200 text-slate-400'
                )}>
                  {testingBriefing
                    ? <Loader2 className="size-5 animate-spin" />
                    : <Sunrise className="size-5" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-black', canTest ? 'text-amber-900 group-hover:text-white' : 'text-slate-400')}>
                    Test Morning Briefing
                  </p>
                  <p className={cn('text-xs font-medium mt-0.5', canTest ? 'text-amber-500 group-hover:text-amber-100' : 'text-slate-400')}>
                    {testingBriefing ? 'Mengirim...' : 'Kirim ringkasan pagi sekarang'}
                  </p>
                </div>
              </button>

              {!canTest && (
                <p className="text-center text-xs text-slate-400 pt-1">
                  Hubungkan &amp; aktifkan Telegram di tab <strong>Bot</strong> terlebih dahulu
                </p>
              )}
            </div>
          </section>

          {/* Muted Courses */}
          {availableCourses.length > 0 && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                      <VolumeX className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Bisukan Mata Kuliah</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Matikan notifikasi per mata kuliah</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full uppercase tracking-widest">
                    {activeCount} aktif
                  </span>
                </div>
              </div>

              <div className="p-4 max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
                {availableCourses.map((course) => {
                  const isMuted = muted.includes(course.name)
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => toggleMuteCourse(course.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left group active:scale-[0.99]',
                        isMuted
                          ? 'bg-slate-50 border-slate-100 opacity-60'
                          : 'bg-white border-slate-100 hover:border-purple-200 hover:bg-purple-50/50'
                      )}
                    >
                      <div className={cn(
                        'size-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                        isMuted ? 'bg-slate-200 text-slate-400' : 'bg-purple-100 text-purple-600'
                      )}>
                        {isMuted ? <BellOff className="size-4" /> : <Volume2 className="size-4" />}
                      </div>
                      <span className={cn(
                        'text-sm font-semibold flex-1 truncate',
                        isMuted ? 'line-through text-slate-400' : 'text-slate-800'
                      )}>
                        {course.name}
                      </span>
                      <span className={cn(
                        'text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 uppercase tracking-widest',
                        isMuted ? 'bg-slate-200 text-slate-500' : 'bg-purple-100 text-purple-700'
                      )}>
                        {isMuted ? 'Muted' : 'Aktif'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Save Bar ── */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <button
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className={cn(
            'w-full h-14 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3',
            hasChanges
              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/15 active:scale-[0.99]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          {isLoading
            ? <><Loader2 className="size-5 animate-spin" /> Menyimpan...</>
            : <><Save className="size-5" />{hasChanges ? 'Simpan Perubahan' : 'Tidak Ada Perubahan'}</>
          }
        </button>

        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold"
            >
              <CheckCircle2 className="size-5 shrink-0" />
              Pengaturan notifikasi berhasil disimpan!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
