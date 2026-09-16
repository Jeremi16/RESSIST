"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Save, Loader2, CheckCircle2, GraduationCap, BookOpen, Plus, X, Pencil, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassSettingsProps {
  classCode?: string | null;
  availableClassCodes: string[];
  availableCourses: { id: string; name: string }[];
  mutedCourses: string[];
  courseAliases?: Record<string, string>;
  courseClassFilters?: Record<string, string>;
  onSave: (data: { class_code: string; muted_courses: string; available_class_codes?: string; course_aliases: string; course_class_filters: string }) => Promise<void>;
  isLoading: boolean;
}

export function ClassSettings({ classCode, availableClassCodes, availableCourses, mutedCourses, courseAliases, courseClassFilters, onSave, isLoading }: ClassSettingsProps) {
  const initialClassCodes = useMemo(() => {
    if (!classCode) return [];
    try { const parsed = JSON.parse(classCode); if (Array.isArray(parsed)) return parsed; return []; } catch { return classCode.split(",").map((c) => c.trim()).filter(Boolean); }
  }, [classCode]);
  const [selectedClassCodes, setSelectedClassCodes] = useState<string[]>(initialClassCodes);
  const [muted, setMuted] = useState<string[]>(mutedCourses);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newClassCode, setNewClassCode] = useState("");
  const [aliases, setAliases] = useState<Record<string, string>>(courseAliases ?? {});
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [tempAlias, setTempAlias] = useState("");
  const [customClassCodes, setCustomClassCodes] = useState<string[]>([]);
  const [confirmMuteCourse, setConfirmMuteCourse] = useState<string | null>(null);
  const [selectedPerCourse, setSelectedPerCourse] = useState<Record<string, string>>(courseClassFilters ?? {});
  const DEFAULT_CLASS_CODES = ["RA", "RB", "RC", "RD", "RE"];
  const allClassCodes = useMemo(() => Array.from(new Set([...DEFAULT_CLASS_CODES, ...availableClassCodes, ...customClassCodes])).sort(), [availableClassCodes, customClassCodes]);
  // Pills per-matkul: always show defaults + custom, not blocked by empty availableClassCodes
  const toggleClassCode = (code: string) => setSelectedClassCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  const togglePerCourse = (courseName: string, code: string) => {
    setSelectedPerCourse((prev) => {
      if (prev[courseName] === code) {
        const next = { ...prev };
        delete next[courseName];
        return next;
      }
      return { ...prev, [courseName]: code };
    });
  };
  const clearPerCourse = (courseName: string) => {
    setSelectedPerCourse((prev) => {
      const next = { ...prev };
      delete next[courseName];
      return next;
    });
  };
  const handleMuteClick = (courseName: string) => {
    if (muted.includes(courseName)) {
      setMuted((prev) => prev.filter((c) => c !== courseName));
    } else {
      setConfirmMuteCourse(courseName);
    }
  };
  const confirmMute = () => {
    if (confirmMuteCourse) {
      setMuted((prev) => [...prev, confirmMuteCourse]);
      setConfirmMuteCourse(null);
    }
  };
  const startEditing = (courseId: string, currentName: string) => { setEditingCourseId(courseId); setTempAlias(aliases[currentName] || ""); };
  const saveAlias = (courseName: string) => { setAliases((prev) => { const next = { ...prev }; if (tempAlias.trim()) next[courseName] = tempAlias.trim(); else delete next[courseName]; return next; }); setEditingCourseId(null); };
  const handleSave = async () => { await onSave({ class_code: JSON.stringify(selectedClassCodes), muted_courses: JSON.stringify(muted), available_class_codes: JSON.stringify(allClassCodes), course_aliases: JSON.stringify(aliases), course_class_filters: JSON.stringify(selectedPerCourse) }); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); };
  const handleAddClassCode = () => { const code = newClassCode.trim().toUpperCase(); if (code && !allClassCodes.includes(code)) { setCustomClassCodes((prev) => [...prev, code]); } setNewClassCode(""); setShowAddInput(false); };
  const handleRemoveCustomClassCode = (code: string) => { setCustomClassCodes((prev) => prev.filter((c) => c !== code)); setSelectedClassCodes((prev) => prev.filter((c) => c !== code)); setSelectedPerCourse((prev) => { const next = { ...prev }; for (const k of Object.keys(next)) if (next[k] === code) delete next[k]; return next; }); };
  const resolveDisplayCourseName = (originalName: string) => { const alias = aliases[originalName]; return alias && alias.trim() ? alias.trim() : originalName; };
  const totalClasses = allClassCodes.length; const filteredCoursesCount = Object.keys(selectedPerCourse).filter((k) => selectedPerCourse[k]).length; const activeCoursesCount = availableCourses.filter((c) => !muted.includes(c.name)).length;

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-clip">
      <div className="bg-[#F5F0EB] border border-black/5 rounded-2xl p-4 flex items-start gap-3 min-w-0">
        <div className="size-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0 text-xs font-medium">!</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-black">Fitur Dalam Pengembangan</h4>
          <p className="text-xs text-black/60 leading-relaxed mt-1">Filter Kelas dan Alias Mata Kuliah masih beta. Beberapa fungsi mungkin berubah di versi mendatang.</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2.5 py-1 bg-white border border-black/5 text-black/60 text-xs rounded-full">Beta</span>
            <span className="px-2.5 py-1 bg-white border border-black/5 text-black/60 text-xs rounded-full">v0.5.1</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white border border-black/5 rounded-2xl p-3 sm:p-4 text-center min-w-0">
          <div className="size-7 sm:size-8 bg-black rounded-xl flex items-center justify-center text-white mx-auto mb-1.5 sm:mb-2"><GraduationCap className="size-3.5 sm:size-4" /></div>
          <p className="text-lg sm:text-xl font-semibold text-black leading-none">{totalClasses}</p><p className="text-[11px] sm:text-xs text-black/40 leading-tight mt-1 break-words">Kelas Tersedia</p>
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-3 sm:p-4 text-center min-w-0">
          <div className="size-7 sm:size-8 bg-black rounded-xl flex items-center justify-center text-white mx-auto mb-1.5 sm:mb-2"><Users className="size-3.5 sm:size-4" /></div>
          <p className="text-lg sm:text-xl font-semibold text-black leading-none">{filteredCoursesCount}</p><p className="text-[11px] sm:text-xs text-black/40 leading-tight mt-1 break-words">Matkul Difilter</p>
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-3 sm:p-4 text-center min-w-0">
          <div className="size-7 sm:size-8 bg-black rounded-xl flex items-center justify-center text-white mx-auto mb-1.5 sm:mb-2"><BookOpen className="size-3.5 sm:size-4" /></div>
          <p className="text-lg sm:text-xl font-semibold text-black leading-none">{activeCoursesCount}</p><p className="text-[11px] sm:text-xs text-black/40 leading-tight mt-1 break-words">Mata Kuliah Aktif</p>
        </div>
      </div>

      {/* Section 1: Pengaturan Mata Kuliah (Alias & Mute) */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-black rounded-xl flex items-center justify-center text-white shrink-0"><BookOpen className="size-4" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-black">Pengaturan Mata Kuliah</p><p className="text-xs text-black/40 leading-relaxed">Ubah alias tampilan dan mute notifikasi per mata kuliah</p></div>
        </div>
        {availableCourses.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-black/5 border-dashed">
            <p className="text-sm text-black/40">Belum ada mata kuliah. Sinkronkan Moodle dulu.</p>
          </div>
        ) : (
          <div className="grid gap-2 min-w-0 max-h-none overflow-visible sm:max-h-[400px] sm:overflow-y-auto sm:pr-1">
            {availableCourses.map((course) => {
              const isEditing = editingCourseId === course.id; const hasAlias = !!aliases[course.name];
              return (
                <div key={course.id} className={cn("flex items-center justify-between gap-3 p-3 rounded-2xl border min-w-0 overflow-hidden", muted.includes(course.name) ? "bg-[#F5F0EB] border-black/5 opacity-60" : "bg-white border-black/5")}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn("size-8 rounded-lg flex items-center justify-center text-xs font-medium shrink-0", muted.includes(course.name) ? "bg-black/10 text-black/30" : "bg-black text-white")}>{resolveDisplayCourseName(course.name).charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <input type="text" value={tempAlias} onChange={(e) => setTempAlias(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveAlias(course.name); if (e.key === "Escape") setEditingCourseId(null); }} placeholder="Alias baru..." className="flex-1 min-w-0 w-0 h-8 px-3 bg-white border border-black/10 rounded-full text-sm focus:outline-none focus:border-black/20" autoFocus />
                          <button onClick={() => saveAlias(course.name)} className="size-8 bg-black text-white rounded-full flex items-center justify-center shrink-0"><Check className="size-3.5" /></button>
                          <button onClick={() => setEditingCourseId(null)} className="size-8 bg-black/5 text-black/40 rounded-full flex items-center justify-center shrink-0"><X className="size-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group min-w-0">
                          <div className="min-w-0 flex-1"><p className={cn("text-sm truncate", muted.includes(course.name) ? "text-black/30" : "text-black")}>{resolveDisplayCourseName(course.name)}</p>{hasAlias && <p className="text-xs text-black/30 truncate">Asli: {course.name}</p>}</div>
                          <button onClick={() => startEditing(course.id, course.name)} aria-label="Ubah alias" className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 size-6 bg-black/5 rounded-full flex items-center justify-center shrink-0 hover:bg-black hover:text-white transition-colors"><Pencil className="size-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => handleMuteClick(course.name)} className={cn("h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors", muted.includes(course.name) ? "bg-black/10 text-black/40" : "bg-black text-white")}>{muted.includes(course.name) ? "Muted" : "Aktif"}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Filter Kelas per Mata Kuliah (Opsi A - single) */}
      <div className="space-y-3 pt-4 border-t border-black/5">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-black rounded-xl flex items-center justify-center text-white shrink-0"><GraduationCap className="size-4" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-black">Filter Kelas</p><p className="text-xs text-black/40 leading-relaxed">Pilih kelas untuk tiap mata kuliah — hanya tugas dari kelas itu + tugas umum yang akan ditampilkan</p></div>
        </div>
        <p className="text-xs text-black/30 px-1">Pilih manual per mata kuliah — tidak harus menunggu deteksi otomatis. Deteksi <span className="font-medium">[RA]</span>/<span className="font-medium">(RA)</span> dimana saja tetap jalan; tugas tanpa kode dianggap umum dan tetap tampil. Kosong = tidak difilter.</p>

        {availableCourses.length === 0 ? (
          <div className="p-4 text-center bg-white rounded-2xl border border-black/5 border-dashed">
            <p className="text-xs text-black/40">Belum ada mata kuliah. Sinkronkan Moodle dulu.</p>
          </div>
        ) : (
          <div className="space-y-2 min-w-0 max-h-none overflow-visible sm:max-h-[420px] sm:overflow-y-auto sm:pr-1">
            {availableCourses.map((course) => {
              const selected = selectedPerCourse[course.name] || "";
              const display = resolveDisplayCourseName(course.name);
              return (
                <div key={course.id} className="bg-white border border-black/5 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 max-w-full overflow-hidden">
                  <div className="min-w-0 flex-1 max-w-full">
                    <p className="text-sm font-medium text-black truncate">{display}</p>
                    {display !== course.name && <p className="text-xs text-black/30 truncate">{course.name}</p>}
                    {!selected && <p className="text-xs text-black/30 mt-0.5">Tidak difilter — semua tugas tampil</p>}
                    {selected && <p className="text-xs text-black/40 mt-0.5">Filter: <span className="font-medium text-black">{selected}</span> + umum</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-start sm:justify-end shrink-0 min-w-0 max-w-full">
                    {allClassCodes.map((code) => (
                      <button key={code} type="button" onClick={() => togglePerCourse(course.name, code)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", selected === code ? "bg-black border-black text-white" : "bg-white border-black/10 text-black/60 hover:border-black/20")}>{code}</button>
                    ))}
                    {selected && <button type="button" onClick={() => clearPerCourse(course.name)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-black/5 text-black/60 hover:bg-black/10 transition-colors">Hapus</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 min-w-0 max-w-full">
          <span className="text-xs text-black/40">Kelola kode kelas tersedia:</span>
          <div className="flex flex-wrap gap-1.5 min-w-0 max-w-full">
            {allClassCodes.map((code) => {
              const isCustom = customClassCodes.includes(code);
              return (
                <div key={code} className="relative group">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F5F0EB] border border-black/5 text-black/60">{code}</span>
                  {isCustom && <button type="button" onClick={() => handleRemoveCustomClassCode(code)} className="absolute -top-1 -right-1 size-4 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="size-3" /></button>}
                </div>
              );
            })}
          </div>
          <AnimatePresence>
            {showAddInput ? (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="flex items-center gap-2">
                <input type="text" value={newClassCode} onChange={(e) => setNewClassCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") handleAddClassCode(); if (e.key === "Escape") setShowAddInput(false); }} placeholder="Kode" className="h-9 w-20 px-3 bg-white border border-black/10 rounded-full text-sm text-center focus:outline-none focus:border-black/20" autoFocus />
                <button type="button" onClick={handleAddClassCode} disabled={!newClassCode.trim()} className="size-9 bg-black text-white rounded-full flex items-center justify-center disabled:opacity-50"><Plus className="size-4" /></button>
              </motion.div>
            ) : (
              <motion.button type="button" onClick={() => setShowAddInput(true)} className="h-9 px-4 rounded-full border border-dashed border-black/20 text-black/60 hover:border-black/30 hover:text-black transition-colors flex items-center gap-1.5 text-sm"><Plus className="size-4" /> Tambah Kelas</motion.button>
            )}
          </AnimatePresence>
        </div>
        {/* Hidden global selector kept for compat but not shown - still saves selectedClassCodes */}
        <div className="hidden">
          {allClassCodes.map((code) => (
            <button key={code} type="button" onClick={() => toggleClassCode(code)}>{code}</button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-black/5 flex flex-col gap-3">
        <button onClick={handleSave} disabled={isLoading} className="w-full h-11 bg-black text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-black/90 disabled:opacity-50 transition-colors">
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan Semua Pengaturan
        </button>
        {saveSuccess && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-black text-white rounded-2xl flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" /> Pengaturan akademik disimpan.</motion.div>}
      </div>

      {/* Confirm mute popup - portaled agar tidak terpengaruh transform framer-motion parent di mobile */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {confirmMuteCourse && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setConfirmMuteCourse(null)} />
                <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl p-5 z-50 shadow-xl">
                  <div className="size-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-3"><AlertTriangle className="size-5" /></div>
                  <h4 className="text-sm font-semibold text-black">Yakin mute mata kuliah ini?</h4>
                  <p className="text-xs text-black/60 mt-1 leading-relaxed break-words">Mata kuliah <span className="font-medium text-black break-words">{confirmMuteCourse}</span> akan di-mute. Tugas dari mata kuliah ini tidak akan muncul di timeline dan notifikasi akan dimatikan. Kamu bisa mengaktifkannya kembali kapan saja.</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setConfirmMuteCourse(null)} className="flex-1 h-9 rounded-full border border-black/10 text-sm font-medium text-black hover:bg-black/5 transition-colors">Batal</button>
                    <button onClick={confirmMute} className="flex-1 h-9 rounded-full bg-black text-white text-sm font-medium hover:bg-black/90 transition-colors">Ya, Mute</button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
