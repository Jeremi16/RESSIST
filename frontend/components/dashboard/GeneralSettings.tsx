'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Save, Loader2, CheckCircle2, Bell, BellOff, Sun, Send, Sunrise, AlertCircle, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/src/lib/api-client'

interface GeneralSettingsProps {
  reminderHours: number[]
  morningBriefing: boolean
  mutedCourses: string[]
  availableCourses: { id: string; name: string }[]
  telegramConnected: boolean
  telegramEnabled: boolean
  onSave: (data: { reminder_hours: string; morning_briefing: boolean; muted_courses: string }) => Promise<void>
  isLoading: boolean
}

export function GeneralSettings({ reminderHours, morningBriefing, mutedCourses, availableCourses, telegramConnected, telegramEnabled, onSave, isLoading }: GeneralSettingsProps) {
  const [hours, setHours] = useState<number[]>(reminderHours)
  const [briefing, setBriefing] = useState(morningBriefing)
  const [muted, setMuted] = useState<string[]>(mutedCourses)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [testingReminder, setTestingReminder] = useState(false)
  const [testingBriefing, setTestingBriefing] = useState(false)
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const reminderOptions = [
    { value: 24, label: '24 Jam', sublabel: 'Sehari sebelum' },
    { value: 12, label: '12 Jam', sublabel: 'Setengah hari' },
    { value: 6, label: '6 Jam', sublabel: 'Pagi / Sore' },
    { value: 1, label: '1 Jam', sublabel: 'Mendesak' },
  ]

  const toggleHour = (hour: number) => setHours((prev) => prev.includes(hour) ? (prev.length > 1 ? prev.filter((h) => h !== hour) : prev) : [...prev, hour].sort((a, b) => b - a))
  const toggleMuteCourse = (courseName: string) => setMuted((prev) => prev.includes(courseName) ? prev.filter((c) => c !== courseName) : [...prev, courseName])

  const handleSave = async () => {
    await onSave({ reminder_hours: JSON.stringify(hours), morning_briefing: briefing, muted_courses: JSON.stringify(muted) })
    setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000)
  }

  const sendTest = async (type: 'reminder' | 'briefing') => {
    if (!telegramConnected || !telegramEnabled) { setTestMessage({ type: 'error', text: 'Telegram belum terhubung atau dinonaktifkan.' }); setTimeout(() => setTestMessage(null), 4000); return }
    if (type === 'reminder') setTestingReminder(true); else setTestingBriefing(true)
    setTestMessage(null)
    try {
      const endpoint = type === 'reminder' ? '/api/telegram/test-reminder' : '/api/telegram/test-briefing'
      const res = await apiFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json().catch(() => ({} as Record<string, string>))
      if (res.ok) {
        const msg = (data as { message?: string; filtered?: boolean }).message
          || (type === 'reminder' ? 'Reminder berhasil dikirim ke Telegram.' : 'Morning briefing berhasil dikirim.')
        setTestMessage({ type: 'success', text: msg })
      } else {
        let errText = (data as { error?: string; message?: string }).error || (data as { message?: string }).message || 'Gagal mengirim notifikasi.'
        if (res.status === 503) errText = 'Telegram bot belum dikonfigurasi di server (TELEGRAM_BOT_TOKEN kosong). Hubungi admin.'
        else if (res.status === 400 && errText.includes('not connected')) errText = 'Telegram belum terhubung. Hubungkan dulu via kode verifikasi.'
        else if (errText.includes('is muted')) errText = 'Tugas ter-filter karena matkul dibisukan. Coba ubah Bisukan Mata Kuliah atau tunggu dummy terkirim.'
        else if (errText.includes('filtered out') || errText.includes("doesn't match keyword")) errText = `Tugas ter-filter: ${errText}. Cek filter kelas/keyword.`
        setTestMessage({ type: 'error', text: errText })
      }
    } catch { setTestMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' }) } finally {
      if (type === 'reminder') setTestingReminder(false); else setTestingBriefing(false)
      setTimeout(() => setTestMessage(null), 6000)
    }
  }

  const hasChanges = JSON.stringify(hours) !== JSON.stringify(reminderHours) || briefing !== morningBriefing || JSON.stringify(muted) !== JSON.stringify(mutedCourses)
  const canTest = telegramConnected && telegramEnabled
  const activeCount = availableCourses.length - muted.length

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {testMessage && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm', testMessage.type === 'success' ? 'bg-[#0059D0] text-white border-[#0059D0]' : 'bg-white border-black/10 text-black')}>
            {testMessage.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
            {testMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-black/5">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#0059D0] text-white flex items-center justify-center shrink-0"><Clock className="size-4" /></div>
                <div><h4 className="text-sm font-semibold text-black">Waktu Pengingat</h4><p className="text-xs text-black/40 mt-0.5">Pilih kapan bot mengirim peringatan</p></div>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {reminderOptions.map((opt) => {
                const active = hours.includes(opt.value)
                return (
                  <button key={opt.value} type="button" onClick={() => toggleHour(opt.value)} className={cn('relative p-4 rounded-2xl text-left transition-colors border', active ? 'bg-[#0059D0] border-[#0059D0] text-white' : 'bg-[#60A8F8]/10 border-black/5 text-black hover:border-black/10')}>
                    <span className="block text-sm font-semibold leading-tight">{opt.label}</span>
                    <span className={cn('text-xs mt-0.5 block', active ? 'text-white/60' : 'text-black/40')}>{opt.sublabel}</span>
                    {active && <CheckCircle2 className="absolute top-3 right-3 size-4 text-white/60" />}
                  </button>
                )
              })}
            </div>
            <div className="px-4 pb-4"><p className="text-xs text-black/40 bg-[#60A8F8]/10 rounded-xl px-3 py-2.5 leading-relaxed">Bot mengirim pengingat sebelum deadline. Boleh pilih lebih dari satu waktu.</p></div>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', briefing ? 'bg-[#0059D0] text-white' : 'bg-[#60A8F8]/10 text-black/40')}><Sun className="size-5" /></div>
              <div>
                <h4 className="text-sm font-semibold text-black">Morning Briefing</h4>
                <p className="text-xs text-black/40 leading-relaxed">Ringkasan harian tiap pagi jam <strong className="text-black">07:00 WIB</strong></p>
                {briefing && <span className="inline-flex mt-1 text-xs font-medium text-emerald-600">Aktif</span>}
              </div>
            </div>
            <button onClick={() => setBriefing((v) => !v)} className={cn('relative shrink-0 h-7 w-12 rounded-full transition-colors', briefing ? 'bg-[#0059D0]' : 'bg-black/10')} aria-label="Toggle morning briefing">
              <span className={cn('absolute top-1 size-5 rounded-full bg-white transition-all', briefing ? 'left-6' : 'left-1')} />
            </button>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-black/5">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#0059D0] text-white flex items-center justify-center shrink-0"><Send className="size-4" /></div>
                <div><h4 className="text-sm font-semibold text-black">Uji Coba Telegram</h4><p className="text-xs text-black/40 mt-0.5">Kirim notifikasi percobaan</p></div>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              <button onClick={() => sendTest('reminder')} disabled={testingReminder || !canTest} className={cn('w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-colors', canTest ? 'bg-white border-black/5 hover:border-black/10 hover:bg-[#60A8F8]/10' : 'bg-[#60A8F8]/10 border-black/5 opacity-50 cursor-not-allowed')}>
                <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', canTest ? 'bg-[#0059D0] text-white' : 'bg-black/10 text-black/30')}>{testingReminder ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-black">Test Reminder Tugas</p><p className="text-xs text-black/40 mt-0.5">{testingReminder ? 'Mengirim...' : 'Kirim notifikasi contoh'}</p></div>
              </button>
              <button onClick={() => sendTest('briefing')} disabled={testingBriefing || !canTest} className={cn('w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-colors', canTest ? 'bg-white border-black/5 hover:border-black/10 hover:bg-[#60A8F8]/10' : 'bg-[#60A8F8]/10 border-black/5 opacity-50 cursor-not-allowed')}>
                <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', canTest ? 'bg-[#0059D0] text-white' : 'bg-black/10 text-black/30')}>{testingBriefing ? <Loader2 className="size-4 animate-spin" /> : <Sunrise className="size-4" />}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-black">Test Morning Briefing</p><p className="text-xs text-black/40 mt-0.5">{testingBriefing ? 'Mengirim...' : 'Kirim ringkasan pagi'}</p></div>
              </button>
              {!canTest && <p className="text-center text-xs text-black/30 pt-1">Hubungkan & aktifkan Telegram di bagian atas terlebih dahulu</p>}
            </div>
          </section>

          {availableCourses.length > 0 && (
            <section className="bg-white rounded-2xl border border-black/5 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-[#0059D0] text-white flex items-center justify-center shrink-0"><VolumeX className="size-4" /></div>
                  <div><h4 className="text-sm font-semibold text-black">Bisukan Mata Kuliah</h4><p className="text-xs text-black/40 mt-0.5">Matikan notifikasi per matkul</p></div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-[#0059D0] text-white rounded-full">{activeCount} aktif</span>
              </div>
              <div className="p-3 max-h-64 overflow-y-auto space-y-2">
                {availableCourses.map((course) => {
                  const isMuted = muted.includes(course.name)
                  return (
                    <button key={course.id} type="button" onClick={() => toggleMuteCourse(course.name)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors', isMuted ? 'bg-[#60A8F8]/10 border-black/5 opacity-60' : 'bg-white border-black/5 hover:bg-[#60A8F8]/10')}>
                      <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', isMuted ? 'bg-black/10 text-black/30' : 'bg-[#0059D0] text-white')}>{isMuted ? <BellOff className="size-3.5" /> : <Volume2 className="size-3.5" />}</div>
                      <span className={cn('text-sm flex-1 truncate', isMuted ? 'line-through text-black/30' : 'text-black')}>{course.name}</span>
                      <span className={cn('text-xs px-2 py-1 rounded-full shrink-0', isMuted ? 'bg-black/10 text-black/40' : 'bg-[#0059D0] text-white')}>{isMuted ? 'Muted' : 'Aktif'}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-black/5 space-y-3">
        <button onClick={handleSave} disabled={isLoading || !hasChanges} className={cn('w-full h-11 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-colors', hasChanges ? 'bg-[#0059D0] text-white hover:bg-[#60A8F8]' : 'bg-black/5 text-black/30 cursor-not-allowed')}>
          {isLoading ? <><Loader2 className="size-4 animate-spin" /> Menyimpan...</> : <><Save className="size-4" />{hasChanges ? 'Simpan Perubahan' : 'Tidak Ada Perubahan'}</>}
        </button>
        <AnimatePresence>
          {saveSuccess && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex items-center gap-2 px-4 py-3 bg-[#0059D0] text-white rounded-2xl text-sm"><CheckCircle2 className="size-4 shrink-0" /> Pengaturan notifikasi berhasil disimpan.</motion.div>}
        </AnimatePresence>
      </div>
    </div>
  )
}
