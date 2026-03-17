'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Calendar, CheckCircle2, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskStatsProps {
  overdueCount: number
  upcomingCount: number
  completedCount: number
  totalCount: number
}

export function TaskStats({
  overdueCount,
  upcomingCount,
  completedCount,
  totalCount,
}: TaskStatsProps) {
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const stats = [
    {
      label: 'Terlewat',
      value: overdueCount,
      icon: AlertCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200',
      shadowColor: 'shadow-red-500/20',
      description: overdueCount > 0 ? 'Perlu perhatian!' : 'Semua aman',
    },
    {
      label: 'Akan Datang',
      value: upcomingCount,
      icon: Calendar,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      shadowColor: 'shadow-blue-500/20',
      description: upcomingCount > 0 ? 'Siap dikerjakan' : 'Tidak ada tugas',
    },
    {
      label: 'Selesai',
      value: completedCount,
      icon: CheckCircle2,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      shadowColor: 'shadow-green-500/20',
      description: `${completionRate}% completion`,
      showProgress: true,
      progress: completionRate,
    },
    {
      label: 'Total Tugas',
      value: totalCount,
      icon: ListTodo,
      color: 'slate',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      borderColor: 'border-slate-200',
      shadowColor: 'shadow-slate-500/20',
      description: 'Semua sumber',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            'relative overflow-hidden rounded-3xl border-2 p-6 transition-all hover:scale-[1.02] cursor-pointer group',
            stat.borderColor,
            'bg-white hover:shadow-lg',
            stat.shadowColor
          )}
        >
          {/* Background Icon */}
          <div className={cn(
            'absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity',
            stat.textColor
          )}>
            <stat.icon className="size-24" />
          </div>

          {/* Content */}
          <div className="relative z-10">
            <div className={cn(
              'size-12 rounded-2xl flex items-center justify-center mb-4',
              stat.bgColor
            )}>
              <stat.icon className={cn('size-6', stat.textColor)} />
            </div>
            
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {stat.label}
              </p>
              <p className={cn(
                'text-3xl font-black tracking-tight',
                stat.textColor
              )}>
                {stat.value}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {stat.description}
              </p>
            </div>

            {/* Progress Bar for Completed */}
            {stat.showProgress && totalCount > 0 && (
              <div className="mt-4 space-y-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', 'bg-green-500')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hover Effect */}
          <div className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity',
            stat.bgColor,
            'mix-blend-multiply'
          )} />
        </motion.div>
      ))}
    </div>
  )
}
