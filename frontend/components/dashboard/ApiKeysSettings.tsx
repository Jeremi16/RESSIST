"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/src/lib/api-client";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function ApiKeysSettings() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<string>("never");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/api-keys");
      const data = await res.json();
      if (res.ok) setKeys(data.keys || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Nama key wajib diisi");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      let expires_in_days: number | undefined;
      if (expiry !== "never") expires_in_days = parseInt(expiry, 10);
      const res = await apiFetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), expires_in_days }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat API key");
        return;
      }
      setRawKey(data.api_key);
      setName("");
      setExpiry("never");
      await fetchKeys();
    } catch {
      setError("Gagal membuat API key");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus API key ini? Akses pakai key ini akan langsung terputus.")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Gagal menghapus");
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="size-10 bg-[#0059D0] text-white rounded-xl flex items-center justify-center shrink-0">
          <KeyRound className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-black">API Keys</h3>
          <p className="text-xs text-black/40 mt-1 leading-relaxed">
            Buat API key untuk cek tugas tanpa buka website. Pakai <code className="px-1 py-0.5 bg-black/5 rounded text-black">X-API-Key</code> header.
          </p>
        </div>
      </div>

      {/* Raw key once */}
      <AnimatePresence>
        {rawKey && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="size-4" />
              <p className="text-sm font-semibold">Simpan sekarang — hanya tampil sekali!</p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2.5 overflow-hidden">
              <code className="flex-1 text-sm font-mono text-black break-all whitespace-pre-wrap [overflow-wrap:anywhere] min-w-0">{rawKey}</code>
              <button
                onClick={() => copy(rawKey, "raw")}
                className="shrink-0 size-8 bg-black text-white rounded-lg flex items-center justify-center"
              >
                {copied === "raw" ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
            <div className="bg-white rounded-xl p-3 space-y-2 overflow-hidden">
              <p className="text-xs font-medium text-black">Cara pakai:</p>
              <code className="block text-xs font-mono bg-black text-white rounded-lg px-3 py-2 break-all whitespace-pre-wrap [overflow-wrap:anywhere] overflow-hidden">
                curl -H &quot;X-API-Key: {rawKey}&quot; https://ressist-api.nodryx.com/v1/assignments
              </code>
              <button
                onClick={() => copy(`curl -H "X-API-Key: ${rawKey}" https://ressist-api.nodryx.com/v1/assignments`, "curl")}
                className="text-xs px-2.5 py-1 bg-black text-white rounded-full"
              >
                {copied === "curl" ? "Tersalin" : "Salin curl"}
              </button>
            </div>
            <button onClick={() => setRawKey(null)} className="text-xs text-black/60 flex items-center gap-1">
              <EyeOff className="size-3" /> Sembunyikan
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create */}
      <div className="bg-white border border-black/5 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-medium text-black">Buat key baru</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama key, ex: curl laptop"
            maxLength={64}
            className="flex-1 h-10 px-4 bg-[#60A8F8]/10 border border-black/5 rounded-full text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/10"
          />
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="h-10 px-3 bg-[#60A8F8]/10 border border-black/5 rounded-full text-sm text-black focus:outline-none"
          >
            <option value="never">Never expire</option>
            <option value="7">7 hari</option>
            <option value="30">30 hari</option>
            <option value="90">90 hari</option>
            <option value="365">1 tahun</option>
          </select>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="h-10 px-5 bg-[#0059D0] text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#60A8F8] disabled:opacity-50 shrink-0"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {creating ? "Membuat..." : "Buat"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <p className="text-xs text-black/30">Maks 5 key aktif. Key tidak bisa dipakai untuk buat key baru.</p>
      </div>

      {/* List — no inner scrollbar, expands naturally */}
      <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
          <p className="text-sm font-medium text-black">Key kamu</p>
          <span className="text-xs px-2 py-1 bg-[#0059D0] text-white rounded-full">{keys.length}/5</span>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="size-6 animate-spin text-black/30" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-black/40">Belum ada API key. Buat di atas.</div>
        ) : (
          <div className="divide-y divide-black/5 max-h-none overflow-visible">
            {keys.map((k) => {
              const revoked = !!k.revoked_at;
              const expired = !revoked && k.expires_at && new Date(k.expires_at) < new Date();
              return (
                <div key={k.id} className={cn("px-4 py-3 flex items-center gap-3 overflow-hidden", revoked && "opacity-50")}>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-black truncate">{k.name}</p>
                    <p className="text-xs font-mono text-black/40 truncate">
                      {k.prefix}•••••••••••• {revoked ? "(revoked)" : expired ? "(expired)" : ""}
                    </p>
                    <p className="text-xs text-black/30 break-words [overflow-wrap:anywhere]">
                      Dibuat {new Date(k.created_at).toLocaleDateString("id-ID")} •{" "}
                      {k.last_used_at ? `Terakhir dipakai ${new Date(k.last_used_at).toLocaleDateString("id-ID")}` : "Belum dipakai"}
                      {k.expires_at ? ` • Exp ${new Date(k.expires_at).toLocaleDateString("id-ID")}` : " • Never expire"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(k.id)}
                    disabled={!!deletingId || revoked}
                    className="size-8 rounded-full border border-black/10 flex items-center justify-center text-black/40 hover:text-red-500 disabled:opacity-30 shrink-0"
                    title="Hapus key"
                  >
                    {deletingId === k.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Docs mini */}
      <div className="bg-[#0059D0] text-white rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold">Endpoint yang bisa pakai API key</p>
        <div className="space-y-2 text-xs font-mono">
          <div className="bg-white/10 rounded-lg px-3 py-2">GET /v1/assignments — daftar tugas</div>
          <div className="bg-white/10 rounded-lg px-3 py-2">GET /v1/calendar/preview — preview kalender</div>
          <div className="bg-white/10 rounded-lg px-3 py-2">GET /v1/courses — daftar matkul</div>
          <div className="bg-white/10 rounded-lg px-3 py-2">GET /v1/user — profil</div>
        </div>
        <p className="text-xs text-white/60">
          Header: <code className="bg-white/10 px-1 rounded">X-API-Key: rsk_...</code> atau <code className="bg-white/10 px-1 rounded">Authorization: ApiKey rsk_...</code>
        </p>
      </div>
    </div>
  );
}
