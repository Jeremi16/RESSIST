"use client";

import { useState } from "react";
import { InfoLayout } from "@/components/InfoLayout";
import {
  KeyRound,
  Copy,
  Check,
  Terminal,
  Shield,
  Clock,
  GraduationCap,
  BookOpen,
  FileText,
  AlertTriangle,
  Zap,
  Link2,
} from "lucide-react";

function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      {label && <p className="text-xs font-medium text-black/40 mb-1.5">{label}</p>}
      <div className="flex items-start gap-2 bg-black text-white rounded-xl px-3 sm:px-4 py-3 overflow-hidden">
        <Terminal className="size-4 shrink-0 mt-0.5 text-white/40" />
        <code className="flex-1 text-xs font-mono break-all whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed min-w-0">
          {text}
        </code>
        <button
          onClick={copy}
          className="shrink-0 size-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          aria-label="Salin"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

function EndpointRow({
  method,
  path,
  desc,
  auth,
}: {
  method: string;
  path: string;
  desc: string;
  auth: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-white border border-black/5 rounded-xl">
      <span
        className={
          method === "GET"
            ? "px-2 py-1 bg-black text-white rounded-full text-xs font-mono font-bold shrink-0 w-fit"
            : method === "POST"
              ? "px-2 py-1 bg-[#F5F0EB] text-black border border-black/10 rounded-full text-xs font-mono font-bold shrink-0 w-fit"
              : "px-2 py-1 bg-black text-white rounded-full text-xs font-mono font-bold shrink-0 w-fit"
        }
      >
        {method}
      </span>
      <code className="text-xs font-mono text-black break-all [overflow-wrap:anywhere] min-w-0 flex-1">
        {path}
      </code>
      <span className="text-xs text-black/40 hidden lg:block shrink-0">{auth}</span>
      <span className="text-xs text-black/60 sm:text-right lg:hidden">{desc}</span>
      <span className="text-xs text-black/60 hidden lg:block shrink-0 max-w-[180px] truncate" title={desc}>
        {desc}
      </span>
    </div>
  );
}

export default function Docs() {
  return (
    <InfoLayout
      category="Developer"
      title="Dokumentasi API"
      subtitle="Akses tugas, kalender, dan profil tanpa buka website — via API Key. Cukup satu header X-API-Key."
    >
      <div className="space-y-10 not-prose">
        {/* Pengenalan */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <BookOpen className="size-4" /> Pengenalan
          </h3>
          <p className="text-sm text-black/60 leading-relaxed">
            Ressist menyediakan API untuk cek tugas programmatic via <code className="px-1.5 py-0.5 bg-[#F5F0EB] rounded text-xs">X-API-Key</code>. Cocok untuk
            script <code className="px-1.5 py-0.5 bg-[#F5F0EB] rounded text-xs">curl</code>, bot pribadi, atau integrasi kampus. Berbeda dengan login website yang
            pakai cookie <code className="px-1.5 py-0.5 bg-[#F5F0EB] rounded text-xs">refresh_token</code> + JWT 60 menit, API Key bersifat stateless, panjang
            umur, dan tidak butuh browser.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#F5F0EB] rounded-2xl p-4 border border-black/5">
              <KeyRound className="size-5 text-black/60 mb-2" />
              <p className="text-sm font-medium text-black">Tanpa browser</p>
              <p className="text-xs text-black/40 mt-1">Header X-API-Key saja</p>
            </div>
            <div className="bg-[#F5F0EB] rounded-2xl p-4 border border-black/5">
              <Zap className="size-5 text-black/60 mb-2" />
              <p className="text-sm font-medium text-black">Rate aman</p>
              <p className="text-xs text-black/40 mt-1">60/menit per key</p>
            </div>
            <div className="bg-[#F5F0EB] rounded-2xl p-4 border border-black/5">
              <Shield className="size-5 text-black/60 mb-2" />
              <p className="text-sm font-medium text-black">Aman</p>
              <p className="text-xs text-black/40 mt-1">Hash sha256, prefix rsk_</p>
            </div>
          </div>
        </section>

        {/* Base URL */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <Link2 className="size-4" /> Base URL & Header Umum
          </h3>
          <div className="space-y-2">
            <CopyBlock text="https://ressist-api.nodryx.com" label="Production" />
            <CopyBlock text="http://localhost:8080" label="Local" />
          </div>
          <div className="bg-[#F5F0EB] rounded-xl p-3 flex items-start gap-2">
            <FileText className="size-4 text-black/40 shrink-0 mt-0.5" />
            <p className="text-xs text-black/60 leading-relaxed">
              Semua response menyertakan <code className="px-1 py-0.5 bg-white rounded">X-Request-ID</code>. Kirim opsional
              di request untuk tracing. <code className="px-1 py-0.5 bg-white rounded">Authorization</code>,{" "}
              <code className="px-1 py-0.5 bg-white rounded">Content-Type</code>,{" "}
              <code className="px-1 py-0.5 bg-white rounded">X-API-Key</code> diizinkan CORS.
            </p>
          </div>
        </section>

        {/* Autentikasi */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <Shield className="size-4" /> Autentikasi
          </h3>
          <p className="text-sm text-black/60 leading-relaxed">
            Endpoint baca mendukung dua cara: JWT via website (BFF) atau API Key programmatic. Pilih salah satu per
            request.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-black/5 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-black/40 uppercase tracking-wide">Via website (JWT)</p>
              <code className="block text-xs font-mono bg-[#F5F0EB] rounded-lg px-3 py-2">Authorization: Bearer &lt;jwt&gt;</code>
              <p className="text-xs text-black/40">Didapat dari POST /v1/auth/refresh (cookie refresh_token). Dipakai BFF /api/*.</p>
            </div>
            <div className="bg-black text-white rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Via API Key (rekomendasi)</p>
              <code className="block text-xs font-mono bg-white/10 rounded-lg px-3 py-2">X-API-Key: rsk_...</code>
              <p className="text-xs text-white/60">Atau Authorization: ApiKey rsk_... — sama.</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">Format key</p>
              <p className="text-xs text-amber-700 leading-relaxed break-words [overflow-wrap:anywhere]">
                <code className="px-1 py-0.5 bg-white rounded font-mono">rsk_</code> + 32 byte random base64url (~43 char). Disimpan sebagai{" "}
                <code className="px-1 py-0.5 bg-white rounded">sha256(hex)</code>, prefix 12 char untuk display. Contoh:{" "}
                <code className="font-mono">rsk_abc123...</code> total ~47 char.
              </p>
              <p className="text-xs text-amber-700">Maks 5 key aktif per user. Kedaluwarsa: tidak pernah / 7 / 30 / 90 / 365 hari.</p>
            </div>
          </div>
        </section>

        {/* Mulai Cepat */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <Zap className="size-4" /> Mulai Cepat (3 langkah)
          </h3>
          <ol className="space-y-3 list-none">
            <li className="flex gap-3">
              <span className="size-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                1
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black">Buat key di website</p>
                <p className="text-xs text-black/40 mt-1">
                  Login → Dashboard → tab <strong className="text-black">API Keys</strong> → isi nama (mis. “curl laptop”) → pilih
                  kedaluwarsa → Buat. Salin <code className="px-1 py-0.5 bg-[#F5F0EB] rounded font-mono">rsk_...</code> — hanya
                  tampil sekali!
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="size-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-medium text-black">Cek tugas via curl</p>
                <CopyBlock text={'curl -H "X-API-Key: rsk_xxx" https://ressist-api.nodryx.com/v1/assignments'} />
              </div>
            </li>
            <li className="flex gap-3">
              <span className="size-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                3
              </span>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-medium text-black">Coba endpoint lain</p>
                <CopyBlock
                  text={'curl -H "X-API-Key: rsk_xxx" "https://ressist-api.nodryx.com/v1/calendar/preview?sort=deadline_asc"'}
                />
                <CopyBlock text={'curl -H "X-API-Key: rsk_xxx" https://ressist-api.nodryx.com/v1/courses'} />
                <CopyBlock text={'curl -H "X-API-Key: rsk_xxx" https://ressist-api.nodryx.com/v1/user'} />
              </div>
            </li>
          </ol>
        </section>

        {/* Kelola Key */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <KeyRound className="size-4" /> Kelola API Key (via website, butuh login)
          </h3>
          <div className="space-y-2">
            <EndpointRow method="POST" path="/v1/api-keys" desc='buat key {name, expires_in_days? 1-3650}' auth="Bearer" />
            <div className="bg-white border border-black/5 rounded-xl p-3 space-y-2 overflow-hidden">
              <p className="text-xs font-medium text-black/40">Body</p>
              <code className="block text-xs font-mono bg-[#F5F0EB] rounded-lg px-3 py-2 break-all [overflow-wrap:anywhere]">
                {`{ "name": "curl laptop", "expires_in_days": 30 }`}
              </code>
              <p className="text-xs text-black/40">Omit expires_in_days = tidak pernah kedaluwarsa. Response 201:</p>
              <code className="block text-xs font-mono bg-black text-white rounded-lg px-3 py-2 break-all [overflow-wrap:anywhere]">
                {`{ "id":"uuid", "name":"curl laptop", "prefix":"rsk_abc123", "api_key":"rsk_... (sekali!)", "expires_at":"2026-04-07T00:00:00Z" }`}
              </code>
            </div>
            <EndpointRow method="GET" path="/v1/api-keys" desc="list key kamu" auth="Bearer" />
            <EndpointRow method="DELETE" path="/v1/api-keys/:id" desc="revoke key" auth="Bearer" />
          </div>
          <p className="text-xs text-black/40">
            BFF proxy untuk UI: <code className="px-1 py-0.5 bg-[#F5F0EB] rounded">GET/POST /api/api-keys</code> &{" "}
            <code className="px-1 py-0.5 bg-[#F5F0EB] rounded">DELETE /api/api-keys/:id</code> (Dashboard).
          </p>
        </section>

        {/* Endpoint baca */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <GraduationCap className="size-4" /> Endpoint Baca (mendukung API Key)
          </h3>
          <p className="text-xs text-black/40">
            Semua di bawah menerima <code className="px-1 py-0.5 bg-[#F5F0EB] rounded">X-API-Key</code> atau{" "}
            <code className="px-1 py-0.5 bg-[#F5F0EB] rounded">Bearer</code>. Rate limit 60/menit per key (bucket prefix 12).
          </p>
          <div className="space-y-2">
            <EndpointRow method="GET" path="/v1/assignments" desc="daftar tugas (filter muted/kelas, sort deadline ASC)" auth="API Key / Bearer" />
            <EndpointRow method="GET" path="/v1/calendar/preview?sort=deadline_asc&force=false" desc="preview kalender cache, sort: deadline_asc/desc/newest/oldest" auth="API Key / Bearer" />
            <EndpointRow method="GET" path="/v1/courses" desc="daftar mata kuliah unik" auth="API Key / Bearer" />
            <EndpointRow method="GET" path="/v1/user" desc="profil + settings kamu" auth="API Key / Bearer" />
            <EndpointRow method="GET" path="/v1/auth/me" desc="profil minimal (id,email,name)" auth="Bearer" />
          </div>
        </section>

        {/* Endpoint tulis / publik */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <FileText className="size-4" /> Endpoint Lain
          </h3>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide">Hanya JWT (via website)</p>
            <EndpointRow method="PUT" path="/v1/user" desc="update profil (optional fields)" auth="Bearer" />
            <EndpointRow method="POST" path="/v1/assignments/complete" desc='{assignment_id} tandai selesai' auth="Bearer" />
            <EndpointRow method="POST" path="/v1/user/telegram/verify-code" desc="generate kode Telegram" auth="Bearer" />
            <EndpointRow method="POST" path="/v1/telegram/test-reminder" desc="tes notifikasi" auth="Bearer" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide">Publik</p>
            <EndpointRow method="GET" path="/livez, /healthz, /readyz, /metrics" desc="liveness/readiness/prometheus" auth="—" />
            <EndpointRow method="GET" path="/openapi.json & /v1/openapi.json" desc="dokumen OpenAPI" auth="—" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide">Auth OAuth</p>
            <EndpointRow method="GET" path="/v1/auth/google/login → 307" desc="redirect Google" auth="rate-limit" />
            <EndpointRow method="GET" path="/v1/auth/google/callback → 307" desc="set refresh_token cookie" auth="rate-limit" />
            <EndpointRow method="POST" path="/v1/auth/refresh" desc="rotate cookie → access_token" auth="cookie" />
          </div>
        </section>

        {/* Rate & Error */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <Clock className="size-4" /> Rate Limit & Error
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#F5F0EB] rounded-2xl p-4 border border-black/5">
              <p className="text-xs font-semibold text-black">API Key: 60/menit, burst 20</p>
              <p className="text-xs text-black/40 mt-1">Bucket per prefix 12 char, TTL 15 menit. Header tidak ada fallback ke IP.</p>
            </div>
            <div className="bg-[#F5F0EB] rounded-2xl p-4 border border-black/5">
              <p className="text-xs font-semibold text-black">Auth: 30/menit, burst 10</p>
              <p className="text-xs text-black/40 mt-1">Untuk /auth/google/*, /refresh, /logout. 429 {"{"}error: too many requests{"}"}.</p>
            </div>
          </div>
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
            <div className="px-4 py-2 border-b border-black/5 text-xs font-semibold text-black/40">Error umum</div>
            <div className="divide-y divide-black/5 text-xs font-mono">
              <div className="px-4 py-2 flex justify-between gap-4">
                <span>401 {"{"}error: missing bearer token{"}"}</span>
                <span className="text-black/40">tanpa header</span>
              </div>
              <div className="px-4 py-2 flex justify-between gap-4">
                <span>401 {"{"}error: invalid api key{"}"}</span>
                <span className="text-black/40">key salah/expired/revoked</span>
              </div>
              <div className="px-4 py-2 flex justify-between gap-4">
                <span>400 {"{"}error: invalid name{"}"}</span>
                <span className="text-black/40">create key</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contoh lengkap */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <Terminal className="size-4" /> Contoh Lengkap
          </h3>
          <CopyBlock
            text={`# simpan key di env
export API_KEY="rsk_xxx"
# tugas mendatang
curl -s -H "X-API-Key: $API_KEY" https://ressist-api.nodryx.com/v1/assignments | jq '.[].title'
# kalender terlewat vs mendatang (via assignment deadline)
curl -s -H "X-API-Key: $API_KEY" https://ressist-api.nodryx.com/v1/calendar/preview | jq .events
# alternatif header
curl -s -H "Authorization: ApiKey $API_KEY" https://ressist-api.nodryx.com/v1/courses | jq`}
          />
          <div className="bg-black text-white rounded-2xl p-5 space-y-2">
            <p className="text-sm font-semibold">Butuh bantuan?</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Buka Dashboard → API Keys untuk buat/revoke key. Dokumentasi OpenAPI lengkap di{" "}
              <code className="px-1 py-0.5 bg-white/10 rounded">/v1/openapi.json</code>. Rate limit aman untuk cron 1 menit sekali.
            </p>
          </div>
        </section>
      </div>
    </InfoLayout>
  );
}
