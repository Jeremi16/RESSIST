"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Save,
  Loader2,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Filter,
  Info,
  Plus,
  X,
  Tag,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassSettingsProps {
  classCode?: string | null;
  availableClassCodes: string[];
  availableCourses: { id: string; name: string }[];
  mutedCourses: string[];
  courseAliases?: Record<string, string>;
  onSave: (data: {
    class_code: string;
    muted_courses: string;
    available_class_codes?: string;
    course_aliases: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function ClassSettings({
  classCode,
  availableClassCodes,
  availableCourses,
  mutedCourses,
  courseAliases,
  onSave,
  isLoading,
}: ClassSettingsProps) {
  // Class Code State
  const initialClassCodes = useMemo(() => {
    if (!classCode) return [];
    try {
      const parsed = JSON.parse(classCode);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return classCode
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }
  }, [classCode]);

  const [selectedClassCodes, setSelectedClassCodes] =
    useState<string[]>(initialClassCodes);
  const [muted, setMuted] = useState<string[]>(mutedCourses);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newClassCode, setNewClassCode] = useState("");
  
  const [aliases, setAliases] = useState<Record<string, string>>(
    courseAliases ?? {},
  );

  // State for inline editing
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [tempAlias, setTempAlias] = useState("");

  const [customClassCodes, setCustomClassCodes] = useState<string[]>([]);

  const allClassCodes = useMemo(() => {
    const combined = [...availableClassCodes, ...customClassCodes];
    return Array.from(new Set(combined)).sort();
  }, [availableClassCodes, customClassCodes]);

  const toggleClassCode = (code: string) => {
    setSelectedClassCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const toggleMuted = (courseName: string) => {
    setMuted((prev) =>
      prev.includes(courseName)
        ? prev.filter((c) => c !== courseName)
        : [...prev, courseName],
    );
  };

  const startEditing = (courseId: string, currentName: string) => {
    setEditingCourseId(courseId);
    setTempAlias(aliases[currentName] || "");
  };

  const saveAlias = (courseName: string) => {
    setAliases((prev) => {
      const next = { ...prev };
      if (tempAlias.trim()) {
        next[courseName] = tempAlias.trim();
      } else {
        delete next[courseName];
      }
      return next;
    });
    setEditingCourseId(null);
  };

  const handleSave = async () => {
    await onSave({
      class_code: JSON.stringify(selectedClassCodes),
      muted_courses: JSON.stringify(muted),
      available_class_codes: JSON.stringify(allClassCodes),
      course_aliases: JSON.stringify(aliases),
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddClassCode = () => {
    const code = newClassCode.trim().toUpperCase();
    if (code && !allClassCodes.includes(code)) {
      setCustomClassCodes((prev) => [...prev, code]);
      if (!selectedClassCodes.includes(code)) {
        setSelectedClassCodes((prev) => [...prev, code]);
      }
    }
    setNewClassCode("");
    setShowAddInput(false);
  };

  const handleRemoveCustomClassCode = (code: string) => {
    setCustomClassCodes((prev) => prev.filter((c) => c !== code));
    setSelectedClassCodes((prev) => prev.filter((c) => c !== code));
  };

  const resolveDisplayCourseName = (originalName: string) => {
    const alias = aliases[originalName];
    return alias && alias.trim() ? alias.trim() : originalName;
  };

  const totalClasses = allClassCodes.length;
  const selectedClasses = selectedClassCodes.length;
  const activeCoursesCount = availableCourses.filter(
    (c) => !muted.includes(c.name),
  ).length;

  return (
    <div className="space-y-10">
      {/* Development Warning */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="size-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0">
            <Info className="size-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-black text-amber-900 mb-2">
              🚧 Fitur Dalam Pengembangan
            </h4>
            <p className="text-sm text-amber-800 leading-relaxed mb-3">
              Fitur <strong>Filter Kelas</strong> dan <strong>Alias Mata Kuliah</strong> masih dalam tahap pengembangan aktif. 
              Beberapa fungsi mungkin belum bekerja sempurna atau mengalami perubahan di versi mendatang.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                Beta Feature
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                v0.5.1
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 text-center">
          <div className="size-10 bg-blue-500 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
            <GraduationCap className="size-5" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalClasses}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Kelas Tersedia
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 text-center">
          <div className="size-10 bg-green-500 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
            <Users className="size-5" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {selectedClasses}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Kelas Dipilih
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4 text-center">
          <div className="size-10 bg-purple-500 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
            <BookOpen className="size-5" />
          </div>
          <p className="text-2xl font-black text-slate-900">{activeCoursesCount}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Mata Kuliah Aktif
          </p>
        </div>
      </div>

      {/* Class Filter Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <label className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              Filter Kelas
            </label>
            <p className="text-xs text-slate-500">
              Pilih kelas yang Anda ambil untuk menyaring tugas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {allClassCodes.map((code) => {
            const isCustom = customClassCodes.includes(code);
            return (
              <div key={code} className="relative group">
                <button
                  type="button"
                  onClick={() => toggleClassCode(code)}
                  className={cn(
                    "px-5 py-3 rounded-xl text-sm font-bold transition-all border",
                    selectedClassCodes.includes(code)
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50",
                  )}
                >
                  {code}
                </button>
                {isCustom && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomClassCode(code)}
                    className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus kelas"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            );
          })}

          <AnimatePresence>
            {showAddInput ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newClassCode}
                  onChange={(e) =>
                    setNewClassCode(e.target.value.toUpperCase())
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddClassCode();
                    if (e.key === "Escape") setShowAddInput(false);
                  }}
                  placeholder="Kode"
                  className="h-12 w-24 px-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddClassCode}
                  disabled={!newClassCode.trim()}
                  className="h-12 px-4 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Plus className="size-4" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="button"
                onClick={() => setShowAddInput(true)}
                className="h-12 px-4 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-2 text-sm font-bold"
              >
                <Plus className="size-4" />
                Tambah Kelas
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Unified Course List & Alias Section */}
      {availableCourses.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <BookOpen className="size-5" />
            </div>
            <div>
              <label className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                Daftar Mata Kuliah
              </label>
              <p className="text-xs text-slate-500">
                Atur alias dan filter notifikasi untuk setiap mata kuliah
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {availableCourses.map((course) => {
              const isEditing = editingCourseId === course.id;
              const hasAlias = !!aliases[course.name];

              return (
                <div
                  key={course.id}
                  className={cn(
                    "flex flex-col p-4 rounded-2xl border transition-all",
                    muted.includes(course.name)
                      ? "bg-slate-50 border-slate-100 opacity-60"
                      : "bg-white border-slate-200 shadow-sm hover:border-purple-200",
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0",
                          muted.includes(course.name)
                            ? "bg-slate-200 text-slate-400"
                            : "bg-purple-100 text-purple-600",
                        )}
                      >
                        {resolveDisplayCourseName(course.name)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tempAlias}
                              onChange={(e) => setTempAlias(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveAlias(course.name);
                                if (e.key === "Escape") setEditingCourseId(null);
                              }}
                              placeholder="Ketik alias baru..."
                              className="w-full h-9 px-3 bg-white border border-purple-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                              autoFocus
                            />
                            <button
                              onClick={() => saveAlias(course.name)}
                              className="size-9 bg-green-500 text-white rounded-lg flex items-center justify-center shrink-0 hover:bg-green-600 transition-colors"
                            >
                              <Check className="size-4" />
                            </button>
                            <button
                              onClick={() => setEditingCourseId(null)}
                              className="size-9 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center shrink-0 hover:bg-slate-200 transition-colors"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <div className="min-w-0">
                              <p className={cn(
                                "text-sm font-bold truncate",
                                muted.includes(course.name) ? "text-slate-400" : "text-slate-900"
                              )}>
                                {resolveDisplayCourseName(course.name)}
                              </p>
                              {hasAlias && (
                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                  Asli: {course.name}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => startEditing(course.id, course.name)}
                              className="opacity-0 group-hover:opacity-100 size-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center hover:bg-purple-100 hover:text-purple-600 transition-all"
                            >
                              <Pencil className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleMuted(course.name)}
                        className={cn(
                          "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                          muted.includes(course.name)
                            ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                            : "bg-purple-100 text-purple-700 hover:bg-purple-200",
                        )}
                      >
                        {muted.includes(course.name) ? "Muted" : "Aktif"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex flex-col gap-4 pt-6 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Save className="size-5" />
          )}
          Simpan Semua Pengaturan
        </button>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold"
          >
            <CheckCircle2 className="size-5" /> Semua pengaturan akademik disimpan!
          </motion.div>
        )}
      </div>
    </div>
  );
}
