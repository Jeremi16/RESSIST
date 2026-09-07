"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Save, Loader2, CheckCircle2, GraduationCap, BookOpen, Plus, X, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassSettingsProps {
  classCode?: string | null;
  availableClassCodes: string[];
  availableCourses: { id: string; name: string }[];
  mutedCourses: string[];
  courseAliases?: Record<string, string>;
  onSave: (data: { class_code: string; muted_courses: string; available_class_codes?: string; course_aliases: string }) => Promise<void>;
  isLoading: boolean;
}

export function ClassSettings({ classCode, availableClassCodes, availableCourses, mutedCourses, courseAliases, onSave, isLoading }: ClassSettingsProps) {
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
  const allClassCodes = useMemo(() => Array.from(new Set([...availableClassCodes, ...customClassCodes])).sort(), [availableClassCodes, customClassCodes]);
  const toggleClassCode = (code: string) => setSelectedClassCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  const toggleMuted = (courseName: string) => setMuted((prev) => prev.includes(courseName) ? prev.filter((c) => c !== courseName) : [...prev, courseName]);
  const startEditing = (courseId: string, currentName: string) => { setEditingCourseId(courseId); setTempAlias(aliases[currentName] || ""); };
  const saveAlias = (courseName: string) => { setAliases((prev) => { const next = { ...prev }; if (tempAlias.trim()) next[courseName] = tempAlias.trim(); else delete next[courseName]; return next; }); setEditingCourseId(null); };
  const handleSave = async () => { await onSave({ class_code: JSON.stringify(selectedClassCodes), muted_courses: JSON.stringify(muted), available_class_codes: JSON.stringify(allClassCodes), course_aliases: JSON.stringify(aliases) }); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); };
  const handleAddClassCode = () => { const code = newClassCode.trim().toUpperCase(); if (code && !allClassCodes.includes(code)) { setCustomClassCodes((prev) => [...prev, code]); if (!selectedClassCodes.includes(code)) setSelectedClassCodes((prev) => [...prev, code]); } setNewClassCode(""); setShowAddInput(false); };
  const handleRemoveCustomClassCode = (code: string) => { setCustomClassCodes((prev) => prev.filter((c) => c !== code)); setSelectedClassCodes((prev) => prev.filter((c) => c !== code)); };
  const resolveDisplayCourseName = (originalName: string) => { const alias = aliases[originalName]; return alias && alias.trim() ? alias.trim() : originalName; };
  const totalClasses = allClassCodes.length; const selectedClasses = selectedClassCodes.length; const activeCoursesCount = availableCourses.filter((c) => !muted.includes(c.name)).length;

  return (
    <div className="space-y-6">
      <div className="bg-[#F5F0EB] border border-black/5 rounded-2xl p-4 flex items-start gap-3">
        <div className="size-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0 text-xs font-medium">!</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-black">Fitur Dalam Pengembangan</h4>
          <p className="text-xs text-black/60 leading-relaxed mt-1">Filter Kelas dan Alias Mata Kuliah masih beta. Beberapa fungsi mungkin berubah di versi mendatang.</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2.5 py-1 bg-white border border-black/5 text-black/60 text-xs rounded-full">Beta</span>
            <span className="px-2.5 py-1 bg-white border border-black/5 text-black/60 text-xs rounded-full">v0.5.1</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-black/5 rounded-2xl p-4 text-center">
          <div className="size-8 bg-black rounded-xl flex items-center justify-center text-white mx-auto mb-2"><GraduationCap className="size-4" /></div>
          <p className="text-xl font-semibold text-black">{totalClasses}</p><p className="text-xs text-black/40">Kelas Tersedia</p>
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-4 text-center">
          <div className="size-8 bg-black rounded-xl flex items-center justify-center text-white mx-auto mb-2"><Users className="size-4" /></div>
          <p className="text-xl font-semibold text-black">{selectedClasses}</p><p className="text-xs text-black/40">Kelas Dipilih</p>
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-4 text-center">
          <div className="size-8 bg-black rounded-xl flex items-center justify-center text-white mx-auto mb-2"><BookOpen className="size-4" /></div>
          <p className="text-xl font-semibold text-black">{activeCoursesCount}</p><p className="text-xs text-black/40">Mata Kuliah Aktif</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-black rounded-xl flex items-center justify-center text-white"><GraduationCap className="size-4" /></div>
          <div><p className="text-sm font-semibold text-black">Filter Kelas</p><p className="text-xs text-black/40">Pilih kelas yang Anda ambil</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {allClassCodes.map((code) => {
            const isCustom = customClassCodes.includes(code);
            return (
              <div key={code} className="relative group">
                <button type="button" onClick={() => toggleClassCode(code)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors border", selectedClassCodes.includes(code) ? "bg-black border-black text-white" : "bg-white border-black/10 text-black/60 hover:border-black/20")}>{code}</button>
                {isCustom && <button type="button" onClick={() => handleRemoveCustomClassCode(code)} className="absolute -top-1 -right-1 size-4 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="size-3" /></button>}
              </div>
            );
          })}
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
      </div>

      {availableCourses.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-black/5">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-black rounded-xl flex items-center justify-center text-white"><BookOpen className="size-4" /></div>
            <div><p className="text-sm font-semibold text-black">Daftar Mata Kuliah</p><p className="text-xs text-black/40">Atur alias dan filter notifikasi</p></div>
          </div>
          <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
            {availableCourses.map((course) => {
              const isEditing = editingCourseId === course.id; const hasAlias = !!aliases[course.name];
              return (
                <div key={course.id} className={cn("flex items-center justify-between gap-3 p-3 rounded-2xl border", muted.includes(course.name) ? "bg-[#F5F0EB] border-black/5 opacity-60" : "bg-white border-black/5")}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn("size-8 rounded-lg flex items-center justify-center text-xs font-medium shrink-0", muted.includes(course.name) ? "bg-black/10 text-black/30" : "bg-black text-white")}>{resolveDisplayCourseName(course.name).charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input type="text" value={tempAlias} onChange={(e) => setTempAlias(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveAlias(course.name); if (e.key === "Escape") setEditingCourseId(null); }} placeholder="Alias baru..." className="w-full h-8 px-3 bg-white border border-black/10 rounded-full text-sm focus:outline-none focus:border-black/20" autoFocus />
                          <button onClick={() => saveAlias(course.name)} className="size-8 bg-black text-white rounded-full flex items-center justify-center shrink-0"><Check className="size-3.5" /></button>
                          <button onClick={() => setEditingCourseId(null)} className="size-8 bg-black/5 text-black/40 rounded-full flex items-center justify-center shrink-0"><X className="size-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <div className="min-w-0"><p className={cn("text-sm truncate", muted.includes(course.name) ? "text-black/30" : "text-black")}>{resolveDisplayCourseName(course.name)}</p>{hasAlias && <p className="text-xs text-black/30 truncate">Asli: {course.name}</p>}</div>
                          <button onClick={() => startEditing(course.id, course.name)} className="opacity-0 group-hover:opacity-100 size-6 bg-black/5 rounded-full flex items-center justify-center shrink-0 hover:bg-black hover:text-white transition-colors"><Pencil className="size-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleMuted(course.name)} className={cn("h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors", muted.includes(course.name) ? "bg-black/10 text-black/40" : "bg-black text-white")}>{muted.includes(course.name) ? "Muted" : "Aktif"}</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-black/5 flex flex-col gap-3">
        <button onClick={handleSave} disabled={isLoading} className="w-full h-11 bg-black text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-black/90 disabled:opacity-50 transition-colors">
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan Semua Pengaturan
        </button>
        {saveSuccess && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-black text-white rounded-2xl flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" /> Pengaturan akademik disimpan.</motion.div>}
      </div>
    </div>
  );
}
