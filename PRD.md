# PRD: Personal Website Portfolio (Neobrutalism Orange-Duotone)

> Dokumen ini adalah satu-satunya sumber kebenaran (single source of truth) untuk membangun proyek. Baca seluruh dokumen sebelum menulis kode. Jika ada keputusan teknis yang ambigu, pilih opsi paling sederhana dan jelaskan alasannya secara singkat. Jangan menambah dependency yang tidak perlu.

---

## 1. Ringkasan

Bangun personal website portfolio bertema **neobrutalism (orange-duotone)** dengan **Astro + React**, **Cloudflare D1** (database, diakses lewat **Prisma**), dan **Cloudflare R2** (penyimpanan gambar). Website di-deploy ke **Cloudflare Workers/Pages**. Konten dikelola secara dinamis lewat halaman admin yang hanya bisa diakses dengan **Google OAuth** dan **allowlist email**.

**Referensi struktur & fitur:** https://ilh4m.com. Ambil strukturnya saja (navbar sederhana, hero dengan teks berganti, about + skills, daftar project dengan thumbnail/tech stack/link, contact + social links, badge availability). **Jangan menjiplak desain atau kontennya.** Tampilan harus neobrutalism.

### 1.1 Tujuan
- Etalase portfolio yang cepat, rapi, responsif, dan SEO-friendly
- Seluruh konten (profil, project, skills, dll.) dapat diubah tanpa deploy ulang
- Admin aman: hanya email yang diizinkan yang bisa masuk, dan daftar email bisa dikelola dari UI
- Menerapkan OWASP Top 10:2025 sebagai syarat selesai, bukan tahap opsional

### 1.2 Non-Goals
- Tidak ada blog (boleh ditambahkan nanti sebagai tabel `Post`)
- Tidak ada login username/password, registrasi, atau reset password
- Tidak ada multi-bahasa (i18n) pada versi awal
- Tidak ada multi-user dengan role berbeda (semua admin yang diizinkan punya akses penuh)

---

## 2. Tech Stack

| Area | Pilihan |
|---|---|
| Framework | Astro (SSR, `output: "server"`) + `@astrojs/react` + `@astrojs/cloudflare` |
| Bahasa | TypeScript strict |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| UI | shadcn/ui, style neobrutalism orange-duotone |
| Database | Cloudflare D1 |
| ORM | **Prisma** dengan driver adapter D1 (`@prisma/adapter-d1`) |
| Storage | Cloudflare R2 |
| Auth | Google OAuth 2.0 (PKCE) memakai `arctic`, session custom di D1 |
| Validasi | Zod |
| Package manager | pnpm |

---

## 3. Design System (WAJIB diikuti)

### 3.1 Setup tema
Inisialisasi shadcn, lalu install tema:

```bash
npx shadcn@latest add https://neobrutalism.dev/r/styling/orange-duotone.json
```

Tambahkan di `globals.css` agar radius, shadow, dan font weight sesuai:

```css
:root {
  --shadow: 4px 4px 0px 0px var(--border);
}

@theme inline {
  --spacing-boxShadowX: 4px;
  --spacing-boxShadowY: 4px;
  --spacing-reverseBoxShadowX: -4px;
  --spacing-reverseBoxShadowY: -4px;
  --radius-base: 5px;
  --font-weight-base: 500;
  --font-weight-heading: 700;
}
```

### 3.2 Aturan visual
- Border tebal hitam, hard shadow (tanpa blur), sudut sedikit membulat (5px)
- Warna dominan oranye + hitam + putih/krem, tanpa gradient halus
- Efek hover/active khas neobrutalism: elemen bergeser ke arah shadow (`translate-x-boxShadowX translate-y-boxShadowY shadow-none`)
- Gunakan komponen shadcn neobrutalism (Button, Card, Badge, Input, Textarea, Dialog, Table, Tabs, Toast, dll.) sebelum membuat komponen custom
- Heading bold (700), body medium (500), tipografi tegas
- Fully responsive (mobile-first); navbar menjadi menu hamburger di mobile
- Light mode adalah prioritas; dark mode opsional
- Aksesibilitas dasar: kontras cukup, focus ring jelas, semantic HTML, alt text pada gambar, navigasi keyboard

---

## 4. Requirement Fungsional: Halaman Publik

Semua konten diambil dari D1 (bukan hardcode). Semua halaman: SEO meta (title, description, OG, canonical), `sitemap.xml`, `robots.txt`, favicon, halaman 404 dan 500 kustom bertema neobrutalism.

### 4.1 Home (`/`)
- Hero: nama, headline dengan teks yang berganti otomatis (typewriter/rotating), deskripsi singkat, CTA ("Lihat Projects", "Hubungi Saya")
- Badge status availability (Available for Work / Not Available), diubah dari admin
- Preview about singkat
- Featured projects (maksimal 3-4)
- CTA ke halaman contact

### 4.2 About (`/about`)
- Deskripsi diri dan quick bio (lokasi, pendidikan, role, hobi)
- Skills dikelompokkan per kategori (Web, Backend, Languages, DevOps, Database, dll.) ditampilkan sebagai badge
- Timeline pengalaman
- Sertifikasi dan penghargaan (kompetisi dan sertifikasi)

### 4.3 Projects (`/projects`)
- Grid card: thumbnail (dari R2), judul, deskripsi, tahun, tech stack (badge), link GitHub dan Live Demo
- Filter berdasarkan tech/tag, plus pagination atau "load more"
- Halaman detail opsional `/projects/[slug]`
- Hanya project `published = true` yang tampil

### 4.4 Contact (`/contact`)
- Form: nama, email, pesan; disimpan ke tabel `Message`
- Proteksi spam: honeypot field + rate limit per IP (tabel `RateLimit`)
- Daftar social links (dikelola dari admin)
- Umpan balik sukses/gagal yang jelas (toast atau inline)

---

## 5. Requirement Fungsional: Autentikasi Admin (Google OAuth + Allowlist)

Login admin **hanya** lewat Google. Tidak ada login password dan tidak ada registrasi.

### 5.1 Alur
1. `/admin/login` menampilkan satu tombol "Login dengan Google"
2. `GET /api/auth/google`: buat `state` dan `codeVerifier`, simpan di cookie sementara (`HttpOnly`, `Secure`, `SameSite=Lax`, TTL pendek, sekali pakai), lalu redirect ke Google dengan scope `openid email profile`
3. `GET /api/auth/google/callback`:
   - Validasi `state`, tukar `code` dengan token (PKCE)
   - Ambil profil Google (`sub`, `email`, `email_verified`, `name`, `picture`)
   - **Tolak** jika `email_verified` bukan `true`
   - Normalisasi email (lowercase, trim), cek keberadaan di tabel `AdminEmail`
   - Jika tidak ada: tolak, redirect ke `/admin/login?error=unauthorized`, **tanpa** membuat session, dan catat di `AuditLog`
   - Jika ada: buat session di D1 (token acak 32 byte dari CSPRNG; DB hanya menyimpan **hash SHA-256**, cookie berisi token mentah), expiry 7 hari (absolute) dengan idle timeout
4. `POST /api/auth/logout`: hapus session di DB dan cookie
5. Middleware Astro memproteksi semua `/admin/*` (kecuali `/admin/login`) dan semua `/api/admin/*`. Di setiap request: validasi session di DB dan **cek ulang bahwa email session masih ada di allowlist** (jika email dihapus dari allowlist, session otomatis tidak valid)

### 5.2 Manajemen email yang diizinkan
- Halaman `/admin/access` (CRUD): daftar email, tambah, hapus
- Validasi format dengan Zod, normalisasi lowercase, cegah duplikat
- Email default dari env `DEFAULT_ADMIN_EMAIL`: otomatis di-seed ke `AdminEmail` bila tabel masih kosong (lewat seed script dan juga pengecekan saat login pertama)
- **Anti-lockout:** admin tidak boleh menghapus email dirinya sendiri, tidak boleh menghapus email terakhir, dan email default ditandai "default" serta tidak bisa dihapus dari UI
- Catat `addedBy` dan waktu penambahan

---

## 6. Requirement Fungsional: Halaman Admin (`/admin/*`)

| Modul | Fitur |
|---|---|
| **Projects** | CRUD: judul, slug, deskripsi, tahun, tech stack (tags), link GitHub/demo, thumbnail (upload ke R2), urutan, featured, published |
| **Profil/About** | nama, headline, teks rotating hero, deskripsi, bio (lokasi, pendidikan, role, hobi), foto, status availability |
| **Skills** | CRUD kategori dan item, atur urutan |
| **Experience & Certifications** | CRUD pengalaman, sertifikasi, dan penghargaan |
| **Social Links** | CRUD platform + URL, atur urutan |
| **Messages** | Daftar pesan contact, tandai sudah dibaca, hapus |
| **Access** | Kelola email admin (lihat 5.2) |
| **Audit** | `/admin/audit`: log read-only aktivitas terbaru |

Ketentuan:
- UI admin bertema neobrutalism dengan Table, Dialog, Form, dan toast
- Header admin menampilkan nama + avatar Google dan tombol logout
- Aksi destruktif membutuhkan dialog konfirmasi
- **Upload gambar:** validasi tipe (jpeg/png/webp) lewat magic bytes, ukuran maksimal ditentukan, nama file di-generate server, simpan ke R2, tampilkan lewat route `/media/[key]` dengan cache header yang benar. Hapus objek R2 lama saat gambar diganti atau dihapus

---

## 7. Model Data (Prisma + D1)

- `provider = "sqlite"` dengan driver adapter D1; ikuti dokumentasi Prisma terbaru untuk Cloudflare D1 (termasuk pengaturan generator yang kompatibel dengan Workers)
- Hindari fitur yang tidak didukung SQLite (mis. tipe `Json` native pada versi lama, `enum` bila tidak didukung versi yang dipakai): gunakan `String` (JSON string yang divalidasi Zod)
- Inisialisasi `PrismaClient` **per-request** dari binding `env.DB` (jangan menyimpan binding di singleton global)
- Migrasi: generate SQL dengan `prisma migrate diff`, terapkan dengan `wrangler d1 migrations apply`. Sediakan script npm (generate, apply local, apply remote)

### 7.1 Draf skema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model AdminEmail {
  id        String   @id @default(cuid())
  email     String   @unique
  isDefault Boolean  @default(false)
  addedBy   String?
  createdAt DateTime @default(now())
}

model Session {
  id         String   @id @default(cuid())
  tokenHash  String   @unique
  email      String
  googleSub  String
  name       String?
  picture    String?
  expiresAt  DateTime
  lastSeenAt DateTime @default(now())
  createdAt  DateTime @default(now())

  @@index([expiresAt])
  @@index([email])
}

model Profile {
  id               String   @id @default("main")
  name             String
  headline         String
  rotatingTitles   String   @default("[]") // JSON array of string
  description      String
  location         String?
  education        String?
  currentRole      String?
  hobbies          String?
  photoKey         String?
  ogImageKey       String?
  available        Boolean  @default(true)
  availabilityNote String?
  updatedAt        DateTime @updatedAt
}

model Project {
  id           String   @id @default(cuid())
  slug         String   @unique
  title        String
  description  String
  year         Int
  techStack    String   @default("[]") // JSON array of string
  githubUrl    String?
  demoUrl      String?
  thumbnailKey String?
  sortOrder    Int      @default(0)
  featured     Boolean  @default(false)
  published    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([published, sortOrder])
}

model SkillCategory {
  id        String  @id @default(cuid())
  name      String
  sortOrder Int     @default(0)
  skills    Skill[]
}

model Skill {
  id         String        @id @default(cuid())
  name       String
  sortOrder  Int           @default(0)
  categoryId String
  category   SkillCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([categoryId])
}

model Experience {
  id           String  @id @default(cuid())
  title        String
  organization String
  startDate    String
  endDate      String? // null = sekarang
  description  String?
  sortOrder    Int     @default(0)
}

model Certification {
  id        String @id @default(cuid())
  kind      String // "competition" | "certification"
  title     String
  issuer    String
  year      Int
  sortOrder Int    @default(0)
}

model SocialLink {
  id        String @id @default(cuid())
  platform  String
  url       String
  sortOrder Int    @default(0)
}

model Message {
  id        String   @id @default(cuid())
  name      String
  email     String
  body      String
  ipHash    String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([isRead, createdAt])
}

model RateLimit {
  key     String   @id // contoh: "contact:<ipHash>" atau "login:<ipHash>"
  count   Int
  resetAt DateTime
}

model AuditLog {
  id         String   @id @default(cuid())
  actorEmail String?
  action     String
  target     String?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([createdAt])
}
```

### 7.2 Seed
Seed script wajib: (1) memasukkan `DEFAULT_ADMIN_EMAIL` ke `AdminEmail` dengan `isDefault = true`, (2) mengisi konten dummy (profil, beberapa project, skills, pengalaman, sertifikasi, social links) agar website langsung terlihat penuh. Bersihkan session kedaluwarsa secara berkala (saat login atau lewat Cron Trigger).

---

## 8. Keamanan (WAJIB menerapkan OWASP Top 10:2025)

Petakan kontrol berikut di `SECURITY.md` (kontrol apa → file/kode mana yang menerapkannya). Keamanan adalah syarat selesai.

### A01: Broken Access Control
- Deny by default: semua `/admin/*` dan `/api/admin/*` diproteksi middleware, kecuali whitelist eksplisit (`/admin/login`, `/api/auth/google*`, endpoint publik contact)
- Otorisasi dicek **di server pada setiap request**, bukan hanya disembunyikan di UI; cek ulang email session terhadap allowlist
- Cegah IDOR: semua query by ID divalidasi (format, keberadaan, konteks)
- Cegah SSRF: server tidak pernah fetch ke URL yang dikontrol user; upload hanya lewat file; endpoint Google OAuth di-hardcode
- CORS ketat (tanpa wildcard pada endpoint ber-cookie); `/media/[key]` memvalidasi key (tanpa path traversal) dan hanya melayani objek yang memang publik
- Draft/unpublished tidak boleh bocor lewat route publik atau `/media`

### A02: Security Misconfiguration
- Header: `Content-Security-Policy` (tanpa `unsafe-eval`; nonce/hash untuk inline script bila perlu), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (atau `frame-ancestors 'none'`), `Referrer-Policy`, `Permissions-Policy`
- Bucket R2 **tidak publik**; akses hanya lewat `/media`
- Tidak ada secret di repo; `.env`/`.dev.vars` masuk `.gitignore`; sediakan `.env.example`
- Matikan debug/verbose error di produksi; tidak ada endpoint/halaman default yang tidak dipakai
- Validasi env saat startup dengan Zod (fail fast)
- Least privilege: scope Google hanya `openid email profile`
- Catatan: jika CSP ketat bentrok dengan inline script Astro/React, gunakan nonce atau hash, jangan melonggarkan dengan `unsafe-inline` begitu saja

### A03: Software Supply Chain Failures
- Commit lockfile (`pnpm-lock.yaml`), install dengan `--frozen-lockfile` di CI
- Minimalkan dependency, pilih paket populer dan terawat, pin versi
- Jalankan `pnpm audit`; aktifkan Dependabot/Renovate
- GitHub Actions: pin action ke SHA/versi tetap, permission token minimal
- Tidak ada script CDN pihak ketiga tanpa Subresource Integrity (lebih baik self-host)

### A04: Cryptographic Failures
- HTTPS saja (redirect HTTP → HTTPS, HSTS)
- Token session dari CSPRNG (`crypto.getRandomValues`, minimal 32 byte); di DB hanya hash SHA-256
- Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`; gunakan prefix `__Host-` bila memungkinkan
- Bandingkan token/secret dengan constant-time comparison
- Jangan membuat kripto sendiri; gunakan Web Crypto dan library teruji (`arctic`)

### A05: Injection (termasuk XSS)
- Semua akses DB lewat Prisma (parameterized). **Dilarang** `$queryRawUnsafe`/`$executeRawUnsafe`; bila raw query tak terhindarkan, pakai tagged template `$queryRaw`
- Validasi semua input server-side dengan Zod (tipe, panjang maksimum, format, allowlist nilai)
- Output encoding: jangan pakai `set:html`, `dangerouslySetInnerHTML`, atau `innerHTML` dengan data user. Bila perlu render markdown/rich text, sanitasi dengan library (DOMPurify/`sanitize-html`) dan whitelist tag
- Validasi URL tersimpan (GitHub/demo/social): hanya skema `https:`/`http:`; tolak `javascript:` dan `data:`
- Upload file: validasi MIME dari **magic bytes**, batasi ukuran, nama file di-generate server, jangan melayani SVG upload-an user (atau sanitasi ketat)
- Cegah header injection dan open redirect: parameter redirect hanya boleh path internal

### A06: Insecure Design
- Threat model singkat di `SECURITY.md` (aset: akun admin, data D1, objek R2, pesan contact; ancaman utama dan mitigasinya)
- Rate limiting dan batas ukuran pada form contact, login, dan upload; batasi jumlah dan panjang field
- Anti-lockout allowlist (lihat 5.2)
- Aksi destruktif butuh konfirmasi; semua mutasi admin wajib CSRF-protected (cek `Origin` + token)
- Pisahkan data publik vs admin pada level query (select hanya kolom yang perlu)

### A07: Authentication Failures
- Validasi `state`, PKCE `code_verifier`, tolak `email_verified` ≠ true, cek allowlist
- Session ID baru saat login, idle + absolute expiry, logout menghapus session di server
- Cookie sementara OAuth berumur pendek dan sekali pakai
- Rate limit pada `/api/auth/google*`; pesan error generik (tidak membocorkan apakah email ada di allowlist)
- Tidak ada fitur password, reset password, atau registrasi

### A08: Software or Data Integrity Failures
- Tidak ada deserialisasi data tak tepercaya; hindari `eval` dan `new Function`
- Semua data dari client (body, query, cookie, header) dianggap tak tepercaya dan divalidasi ulang di server
- CI/CD: deploy hanya dari branch utama, secret di GitHub/Cloudflare secrets, migrasi DB dijalankan dengan sengaja

### A09: Security Logging & Alerting Failures
- Tabel `AuditLog`: catat login berhasil/gagal, penolakan allowlist, penambahan/penghapusan email admin, CRUD konten admin, upload, logout (waktu, email aktor, aksi, IP, user agent)
- **Jangan** log secret, token, cookie, atau isi pesan sensitif
- `/admin/audit` (read-only) untuk melihat log terbaru
- Sediakan hook/TODO yang jelas untuk alerting (mis. notifikasi saat banyak login gagal)

### A10: Mishandling of Exceptional Conditions
- Fail closed: bila pengecekan auth/otorisasi error, akses ditolak
- Handler error global: respons generik ke user (tanpa stack trace, SQL, atau path internal); detail hanya di log server
- Semua I/O (D1, R2, fetch ke Google) dibungkus try/catch dengan timeout; state tetap konsisten (gagal upload R2 tidak menyisakan baris DB yatim, dan sebaliknya)
- Halaman 404/500 kustom
- Validasi hasil operasi (cek `null` dari Prisma/R2) sebelum dipakai; jangan mengasumsikan sukses

---

## 9. Konfigurasi Cloudflare & Environment

### 9.1 Binding (`wrangler.jsonc`)
- `DB` → Cloudflare D1
- `BUCKET` → Cloudflare R2
- Compatibility flag `nodejs_compat` (dibutuhkan Prisma)
- Tipe environment di `env.d.ts` untuk binding dan secrets

### 9.2 Environment Variables & Secrets
Dokumentasikan di `.env.example` dan README.

| Nama | Keterangan |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID dari Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret (secret, jangan di-commit) |
| `GOOGLE_REDIRECT_URI` | Lokal: `http://localhost:4321/api/auth/google/callback`; produksi: `https://<domain>/api/auth/google/callback` |
| `DEFAULT_ADMIN_EMAIL` | Email admin default yang di-seed ke allowlist |
| `PUBLIC_SITE_URL` | URL publik situs (canonical, OG, sitemap) |

Secret produksi di-set dengan `wrangler secret put`; lokal lewat `.dev.vars`. Sertakan langkah singkat membuat OAuth client di Google Cloud Console (authorized redirect URI untuk lokal dan produksi).

### 9.3 Lokal & Deploy
- Lokal: `astro dev` dengan platform proxy agar D1 dan R2 berjalan di lokal
- Deploy: buat database D1, buat bucket R2, jalankan migrasi remote, set secrets, deploy

---

## 10. Struktur Proyek yang Diharapkan

```
.
├── PRD.md
├── SECURITY.md
├── README.md
├── wrangler.jsonc
├── astro.config.mjs
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── components/        # UI shadcn + komponen custom
│   ├── layouts/
│   ├── lib/               # db, auth, session, csrf, rate-limit, validation, r2, audit
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── projects/
│   │   ├── contact.astro
│   │   ├── media/[...key].ts
│   │   ├── admin/
│   │   └── api/
│   ├── middleware.ts
│   └── styles/globals.css
└── env.d.ts
```

---

## 11. Deliverables

1. Struktur folder proyek yang rapi (lihat bagian 10)
2. **Kode lengkap dan berjalan**, bukan potongan atau pseudo-code
3. `README.md`: setup lokal, setup Google OAuth, perintah migrasi/seed, langkah deploy
4. `SECURITY.md`: threat model singkat dan tabel pemetaan kontrol OWASP Top 10:2025 (A01-A10) ke implementasi di kode
5. Konten dummy via seed supaya website langsung terlihat penuh

---

## 12. Tahapan Pengerjaan

Kerjakan bertahap; pastikan tiap tahap bisa dijalankan sebelum lanjut.

1. Scaffold Astro + React + Tailwind + shadcn + tema neobrutalism
2. Layout, navbar, footer, dan semua halaman publik dengan data statis
3. Skema Prisma + adapter D1 + migrasi + seed
4. Hubungkan halaman publik ke D1
5. Google OAuth + session + middleware + allowlist email
6. Halaman admin CRUD (termasuk `/admin/access` dan `/admin/audit`)
7. Upload R2 + route `/media`
8. Form contact + proteksi spam
9. Security review: telusuri checklist A01-A10 satu per satu terhadap kode, perbaiki celah yang ditemukan, lengkapi `SECURITY.md`
10. SEO, polish, README

---

## 13. Acceptance Criteria

### Fungsional
- [ ] Empat halaman publik (Home, About, Projects, Contact) tampil dengan data dari D1
- [ ] Tema neobrutalism orange-duotone konsisten di seluruh halaman publik dan admin
- [ ] Responsif dengan baik di mobile (≥360px), tablet, dan desktop
- [ ] Form contact menyimpan pesan ke D1 dan dibatasi rate limit + honeypot
- [ ] Semua modul admin pada bagian 6 berfungsi (CRUD, upload, mark read)
- [ ] Gambar tersimpan di R2 dan tampil lewat `/media/[key]`; bucket tidak publik
- [ ] Perubahan konten di admin langsung terlihat di halaman publik tanpa deploy ulang

### Autentikasi
- [ ] Login hanya lewat Google; email di luar allowlist ditolak tanpa membuat session
- [ ] Email yang `email_verified` ≠ true ditolak
- [ ] Email default dari env ter-seed otomatis dan tidak bisa dihapus dari UI
- [ ] Admin tidak bisa menghapus email sendiri maupun email terakhir
- [ ] Menghapus email dari allowlist langsung membatalkan session aktif email tersebut
- [ ] Mengakses `/admin/*` atau `/api/admin/*` tanpa session valid selalu ditolak

### Keamanan
- [ ] Semua poin A01-A10 pada bagian 8 terimplementasi dan terpetakan di `SECURITY.md`
- [ ] Tidak ada `$queryRawUnsafe`, `dangerouslySetInnerHTML`, atau `set:html` dengan data user
- [ ] Header keamanan terkirim di semua respons; CSP tanpa `unsafe-eval`
- [ ] Tidak ada secret di repo; `.env.example` lengkap
- [ ] Error produksi tidak membocorkan stack trace atau detail internal
- [ ] `pnpm audit` tidak menyisakan kerentanan high/critical yang belum dijelaskan

### Kualitas
- [ ] `pnpm build` dan type-check (`astro check`) lulus tanpa error
- [ ] Skor Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95, Best Practices ≥ 95
- [ ] README cukup untuk menjalankan proyek dari nol di mesin baru (Windows/macOS/Linux)
