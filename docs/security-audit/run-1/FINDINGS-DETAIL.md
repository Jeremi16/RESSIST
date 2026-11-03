# FINDINGS-DETAIL.md — RESSIST run-1

Run ini memproduksi **nol record `confirmed`** (medium/high/critical semuanya kosong), karena tidak ada sandbox OS-enforced di host audit sehingga tidak ada satu pun pemeriksaan yang dapat dieksekusi dan tidak ada `observed_result` yang dapat diisi secara jujur. Sesuai schema, file detail per-temuan-terkonfirmasi ini dengan demikian tidak memuat entri apa pun.

Semua 23 lead yang bertahan berstatus `needs_validation` dan didokumentasikan lengkap (jejak sumber, bukti terverifikasi, blocker eksak, rencana resolusi lokal dan owner-observed) di **NEEDS-VALIDATION.md**. Tiga record lain berstatus `rejected` dan bukan temuan.
