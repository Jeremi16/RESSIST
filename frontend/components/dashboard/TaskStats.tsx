'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Calendar, CheckCircle2, ListTodo } from 'lucide-react'

interface TaskStatsProps {
  overdueCount: number
  upcomingCount: number
  completedCount: number
  totalCount: number
}

export function TaskStats({ overdueCount, upcomingCount, completedCount, totalCount }: TaskStatsProps) {
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const stats = [
    { label: 'Terlewat', value: overdueCount, icon: AlertCircle, desc: overdueCount > 0 ? 'Perlu perhatian' : 'Semua aman' },
    { label: 'Akan Datang', value: upcomingCount, icon: Calendar, desc: upcomingCount > 0 ? 'Siap dikerjakan' : 'Tidak ada tugas' },
    { label: 'Selesai', value: completedCount, icon: CheckCircle2, desc: `${completionRate}% selesai`, showProgress: true, progress: completionRate },
    { label: 'Total Tugas', value: totalCount, icon: ListTodo, desc: 'Semua sumber' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-2xl border border-black/5 p-4"
        >
          <div className="size-8 rounded-xl bg-black text-white flex items-center justify-center mb-3">
            <stat.icon className="size-4" />
          </div>
          <p className="text-xs font-medium tracking-wide text-black/40">{stat.label}</p>
          <p className="text-2xl font-semibold tracking-tight text-black mt-1">{stat.value}</p>
          <p className="text-xs text-black/40 mt-1">{stat.desc}</p>
          {stat.showProgress && totalCount > 0 && (
            <div className="mt-3 h-1.5 bg-black/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${stat.progress}%` }} transition={{ delay: 0.3, duration: 0.6 }} className="h-full bg-black rounded-full" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
