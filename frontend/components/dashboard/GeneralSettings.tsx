'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  Bell,
  BellOff,
  Sun,
  Volume2,
  VolumeX,
  Send,
  Sunrise,
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
    { value: 24, label: '24 Jam', desc: 'Sehari sebelum' },
    { value: 12, label: '12 Jam', desc: 'Setengah hari' },
    { value: 6, label: '6 Jam', desc: 'Pagi/Sore' },
    { value: 1, label: '1 Jam', desc: 'Mendesak' },
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
  const handleTestReminder = async () => {
    if (!telegramConnected || !telegramEnabled) {
      setTestMessage({ type: 'error', text: 'Telegram belum terhubung atau dinonaktifkan' })
      setTimeout(() => setTestMessage(null), 3000)
      return
    }

    setTestingReminder(true)
    setTestMessage(null)
    try {
      const response = await fetch('/api/telegram/test-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      
      if (response.ok) {
        setTestMessage({ type: 'success', text: 'Reminder test berhasil dikirim ke Telegram!' })
      } else {
        setTestMessage({ type: 'error', text: data.error || 'Gagal mengirim reminder' })
      }
    } catch (error) {
      setTestMessage({ type: 'error', text: 'Terjadi kesalahan saat mengirim reminder' })
    } finally {
      setTestingReminder(false)
      setTimeout(() => setTestMessage(null), 5000)
    }
  }

  const handleTestBriefing = async () => {
    if (!telegramConnected || !telegramEnabled) {
      setTestMessage({ type: 'error', text: 'Telegram belum terhubung atau dinonaktifkan' })
      setTimeout(() => setTestMessage(null), 3000)
      return
    }

    setTestingBriefing(true)
    setTestMessage(null)
    try {
      const response = await fetch('/api/telegram/test-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      
      if (response.ok) {
        setTestMessage({ type: 'success', text: 'Morning briefing berhasil dikirim ke Telegram!' })
      } else {
        setTestMessage({ type: 'error', text: data.error || 'Gagal mengirim briefing' })
      }
    } catch (error) {
      setTestMessage({ type: 'error', text: 'Terjadi kesalahan saat mengirim briefing' })
    } finally {
      setTestingBriefing(false)
      setTimeout(() => setTestMessage(null), 5000)
    }
  }

  const hasChanges =
    JSON.stringify(hours) !== JSON.stringify(reminderHours) ||
    briefing !== morningBriefing ||
    JSON.stringify(muted) !== JSON.stringify(mutedCourses)

  const canTest = telegramConnected && telegramEnabled

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
          <Bell className="size-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Pengaturan Notifikasi</h3>
          <p className="text-sm text-slate-500">
            Atur kapan dan bagaimana kamu menerima pengingat tugas
          </p>
        </div>
      </div>
      {/* Test Message */}
      {testMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-2xl border-2 flex items-center gap-3 text-sm font-bold ${
            testMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {testMessage.type === 'success' ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Bell className="size-5" />
          )}
          {testMessage.text}
        </motion.div>
      )}

      {/* Test Buttons */}
      {telegramConnected && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Send className="size-5 text-blue-600" />
            <h4 className="text-base font-bold text-slate-900">
              Test Notifikasi Telegram
            </h4>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Kirim notifikasi test langsung ke Telegram untuk memastikan semuanya berfungsi dengan baik.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleTestReminder}
              disabled={testingReminder || !canTest}
              className={`p-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                canTest
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {testingReminder ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Bell className="size-4" />
                  Test Reminder
                </>
              )}
            </button>
            <button
              onClick={handleTestBriefing}
              disabled={testingBriefing || !canTest}
              className={`p-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                canTest
                  ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {testingBriefing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Sunrise className="size-4" />
                  Test Morning Briefing
                </>
              )}
            </button>
          </div>
          {!canTest && (
            <p className="text-xs text-slate-500 mt-3 text-center">
              Hubungkan dan aktifkan Telegram di tab Bot untuk menggunakan fitur ini
            </p>
          )}
        </div>
      )}
      {/* Reminder Hours */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-slate-600" />
          <label className="text-sm font-bold text-slate-900">
            Waktu Pengingat
          </label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {reminderOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleHour(opt.value)}
              className={cn(
                'p-4 rounded-2xl text-left transition-all border-2 group hover:scale-[1.02]',
                hours.includes(opt.value)
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold">{opt.label}</span>
                {hours.includes(opt.value) ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-current opacity-30" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  hours.includes(opt.value) ? 'text-blue-100' : 'text-slate-400'
                )}
              >
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 flex items-start gap-2">
          <span className="text-blue-600 mt-0.5">ℹ️</span>
          <span>
            Bot akan mengirimkan pengingat pada waktu yang dipilih sebelum deadline tugas.
            Pilih minimal 1 waktu pengingat.
          </span>
        </p>
      </div>

      {/* Morning Briefing */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex gap-4">
            <div className="size-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-600">
              <Sun className="size-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Morning Briefing
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md">
                Dapatkan ringkasan tugas harian setiap pagi jam <strong>07:00 WIB</strong>.
                Sempurna untuk memulai hari dengan produktif! ☀️
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={briefing}
              onChange={(e) => setBriefing(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-amber-200/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300/50 rounded-full peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border-2 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-600 shadow-inner" />
          </label>
        </div>
      </div>
      {/* Muted Courses */}
      {availableCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <VolumeX className="size-5 text-slate-600" />
            <label className="text-sm font-bold text-slate-900">
              Bisukan Mata Kuliah
            </label>
          </div>
          <p className="text-xs text-slate-500 -mt-2">
            Nonaktifkan notifikasi untuk mata kuliah tertentu
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableCourses.map((course) => {
              const isMuted = muted.includes(course.name)
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => toggleMuteCourse(course.name)}
                  className={cn(
                    'p-4 rounded-2xl text-left transition-all border-2 group hover:scale-[1.01]',
                    isMuted
                      ? 'bg-slate-100 border-slate-300 text-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 hover:border-blue-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isMuted ? (
                        <BellOff className="size-5 text-slate-400 shrink-0" />
                      ) : (
                        <Volume2 className="size-5 text-blue-600 shrink-0" />
                      )}
                      <span className="text-sm font-semibold truncate">
                        {course.name}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'text-xs font-bold px-3 py-1 rounded-full',
                        isMuted
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {isMuted ? 'Muted' : 'Active'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex flex-col gap-4 pt-6 border-t-2 border-slate-100">
        <button
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 shadow-lg',
            hasChanges
              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="size-5" />
              {hasChanges ? 'Simpan Perubahan' : 'Tidak Ada Perubahan'}
            </>
          )}
        </button>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold"
          >
            <CheckCircle2 className="size-5" />
            Pengaturan berhasil disimpan!
          </motion.div>
        )}
      </div>
    </div>
  )
}
