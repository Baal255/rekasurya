# Audit UI/UX Kondisi Awal (`BEFORE REDESIGN`) — REKASURYA

Dokumen ini merupakan hasil audit **Computer Use (Browser Verification)** terhadap aplikasi REKASURYA versi v1 pada `http://localhost:3000/` sebelum dilakukan perombakan total antarmuka menuju sistem desain **Light-Theme Modern Industrial SaaS (ThingsBoard + Linear + Grafana)**.

Seluruh temuan berikut diverifikasi langsung melalui pengamatan tangkapan layar pada viewport **Desktop (`1440×900`)** dan **Mobile (`390×844`)** yang tersimpan di `docs/visual-qa/before/`.

---

## 1. Daftar Tangkapan Layar Kondisi Awal

| Viewport | Halaman | Berkas Bukti |
| --- | --- | --- |
| Desktop `1440×900` | Beranda (`/`) | [desktop_1_home.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_1_home.png) |
| Desktop `1440×900` | Diagnostik Tiang (`/devices/SRG-009` loading flash) | [desktop_2_srg009.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_2_srg009.png) |
| Desktop `1440×900` | Work Order & Aduan (`/work-orders`) | [desktop_3_workorders.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_3_workorders.png) |
| Desktop `1440×900` | Energi & Regulasi (`/energy`) | [desktop_4_energy.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_4_energy.png) |
| Desktop `1440×900` | Simulator Gangguan (`/simulator`) | [desktop_5_simulator.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_5_simulator.png) |
| Desktop `1440×900` | Arsitektur & AI (`/architecture`) | [desktop_6_architecture.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_6_architecture.png) |
| Mobile `390×844` | Beranda (`/`) | [mobile_1_home.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/mobile_1_home.png) |
| Mobile `390×844` | Diagnostik Tiang (`/devices/SRG-009`) | [mobile_2_srg009.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/mobile_2_srg009.png) |
| Mobile `390×844` | Work Order & Aduan (`/work-orders`) | [mobile_3_workorders.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/mobile_3_workorders.png) |

---

## 2. Evaluasi Eksplisit 10 Aspek Kelemahan UI/UX Awal

### 1) Karakter *AI-Generated Generic Dashboard* (*AI Slop*)
- Pada beranda ([desktop_1_home.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_1_home.png)), ruang paling atas halaman didominasi oleh **5 kartu KPI gelap simetris** (`14/18 tiang`, `4 (1 sabotase)`, `4 WO · 2 aduan`, `98,1%`, `Rp 486.678.400`) dengan angka monospasi raksasa berwarna hijau neon/cyan di atas latar `#0B0F17`. Pola kartu metrik seragam ini merupakan ciri paling kuat dari templat dashboard generik yang tidak disusun berdasarkan prioritas kerja operator.
- Latar gelap `#0B0F17` berpadu aksen biru cyan `#0EA5E9` dan magenta `#D946EF` yang kontras tinggi menciptakan kesan "demo sci-fi/hackathon" alih-alih perangkat lunak operasi utilitas publik (Dishub / DPU).

### 2) Komponen Terasa Generik & Tidak Terintegrasi
- Kartu pada halaman `/work-orders` ([desktop_3_workorders.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_3_workorders.png)) menampilkan blok besar yang mengulang komponen yang sama persis: setiap baris Work Order menyematkan `textarea` catatan lapangan dan 4 tombol aksi besar (`Tugaskan Regu`, `Check-In Teknisi GPS`, `Simulasikan Pemulihan`, `Simpan Catatan`). Dalam 1 layar tinggi `900 px`, hanya muat **2 tiket Work Order**. Tidak ada pola daftar padat (*list table*) + panel inspeksi detail seperti pada Linear.
- Belum tersedia halaman khusus **Inventaris Perangkat (`/devices`)** dan halaman khusus **Manajemen Gangguan & Alarm (`/alerts`)**. Seluruh 18 tiang ditumpuk di bagian paling bawah beranda `/` setelah KPI cards, peta, dan antrean Work Order.

### 3) Header & Footer Tidak Pantas untuk Aplikasi Operasional
- **Navigasi atas horizontal**: Aplikasi memakai *top navigation bar* 6 tab di bawah baris header dual-badge dan role selector. Di viewport mobile ([mobile_1_home.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/mobile_1_home.png)), tab `Work Order & Aduan` terpotong di sisi kanan dan 3 menu terakhir (`Energi & Regulasi`, `Simulator Gangguan`, `Arsitektur & AI v1.0`) tidak terlihat sama sekali tanpa *scroll* horizontal tersembunyi.
- **Footer informatif generik**: Setiap halaman diakhiri oleh footer 1–2 baris berisi pengulangan deskripsi platform dan peran aktif. Pada aplikasi enterprise/operasional modern (seperti Linear dan Grafana), ruang bawah tidak dipakai untuk banner deskriptif berulang, melainkan dialihkan menjadi **Left Sidebar Navigation** + **Compact Application Toolbar**.

### 4) Hierarki Informasi yang Salah
- Di halaman `/`, elemen pertama yang dilihat operator adalah **banner alur proses** (`ALUR OPERASI: 1. Deteksi F1-F6 → ...`), disusul **5 KPI card**. **Tabel perangkat bermasalah yang membutuhkan perhatian segera** justru baru muncul setelah menggulir jauh ke bawah di bawah peta dan kartu Work Order. Bagi operator ruang kendali PJU, pertanyaan pertamanya adalah *"Tiang mana yang saat ini mati/sabotase dan tindakan apa yang harus diambil?"*, bukan membaca 5 angka agregat dan slogan alur kerja.
- Di halaman `/energy` ([desktop_4_energy.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_4_energy.png)), **asumsi proposal keuangan** (`Payback 3,66 tahun`, `Rp 308.970.000`) disajikan langsung di 4 KPI card paling atas tanpa pemisahan visual yang tegas terhadap **data pengukuran simulasi telemetri armada**.
- Di halaman `/devices/SRG-009` ([desktop_2_srg009.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_2_srg009.png)), belum ada *loading skeleton* struktural sehingga selama proses fetch API, seluruh halaman hanya menampilkan satu kotak teks kosong `"Memuat diagnostik 3-kanal untuk SRG-009..."`.

### 5) Elemen Dekoratif Tanpa Fungsi
- Banner `ALUR OPERASI: 1. Deteksi F1–F6 → 2. Lokalisasi Komponen → ... → 6. Dampak Rupiah/kWh` muncul permanen di bagian paling atas `/` pada setiap kunjungan. Elemen ini statis, tidak dapat diklik, memakan ~64 px tinggi layar, dan hanya bersifat penjelasan presentasi/pitch deck.
- Latar kotak grid `.scada-grid-bg` di kanvas SVG peta menambah derau visual tanpa membantu orientasi jalan maupun wilayah Solo Raya.

### 6) Penggunaan Tipografi yang Tidak Konsisten
- Label bagian kecil sering memakai `font-mono uppercase text-[10px]` dan `text-[11px]` bercampur dengan angka `text-2xl` dan isi teks `text-xs`, sehingga mata pengguna sulit membedakan label metadata, nilai pengukuran kritis, dan keterangan sekunder.
- Di peta SVG ([desktop_1_home.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/desktop_1_home.png)), teks nama wilayah (`SRAGEN`, `KARANGANYAR`, `SUKOHARJO`, `KLATEN`) bertabrakan tepat di belakang pill ID tiang (`SRG-009`, `KRA-042`, `SKH-107`, `KLT-018`).

### 7) Pemborosan Ruang (*Whitespace* dan Padding Tidak Efektif)
- Pada viewport tablet/mobile ([mobile_1_home.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/before/mobile_1_home.png)), header + banner + 5 kartu KPI menghabiskan seluruh tinggi viewport `844 px` tanpa menampilkan satu pun baris perangkat bermasalah atau peta lokasi tiang.
- Pada `/work-orders`, pengulangan kotak input dan tombol di setiap kartu memboroskan ~45% tinggi layar untuk kontrol yang sebenarnya baru dibutuhkan pada 1 tiket yang sedang dipilih.

### 8) Layout Mengorbankan *Data Density*
- Tidak adanya pola *compact data table* dengan fitur *sorting*, *column visibility/filtering*, dan *side detail inspector*. Seluruh 18 tiang dirender sebagai tabel panjang 8 kolom bertumpuk beberapa baris per sel di halaman beranda, dan daftar Work Order dirender sebagai kartu besar alih-alih daftar terstruktur bergaya **Linear**.

### 9) Komponen Berulang Tanpa Alasan
- Tombol `Injeksi Simulasi` dan `Reset Demo` selalu hadir permanen dalam gaya tombol berbingkai di bar atas, sementara halaman khusus `/simulator` juga memiliki tombol serupa.
- Di `/work-orders`, seluruh tombol status (`Tugaskan Regu`, `Check-In`, `Simulasikan Pemulihan`, `Simpan Catatan`) dirender berulang untuk semua kartu sekaligus.

### 10) Pola Interaksi yang Kurang Cocok bagi Operator & Teknisi PJU
- **Visibilitas luar ruangan**: Tema gelap `#0B0F17` dengan teks abu-abu redup (`#64748B` / `#94A3B8`) memiliki pantulan silau tinggi jika dibuka teknisi di lapangan pada siang hari menggunakan tablet atau ponsel. **Light theme** (`#F7F9FB` canvas, `#FFFFFF` surface, `#17212B` ink) jauh lebih sesuai untuk standar visibilitas luar ruangan dan penggunaan berkepanjangan di ruang kendali.
- **Ketiadaan rentang waktu & ambang batas grafis bergaya Grafana**: Grafik pada `/devices/[id]` belum memiliki kontrol pemilihan rentang waktu (`6 Jam`, `12 Jam`, `24 Jam`, `Semua Sampel`) maupun pemisah visual yang tajam antara **baseline deterministik EWMA** dan **model AI eksternal yang belum terhubung**.
- **Tumpukan pin pada peta**: Beberapa pin di koridor Karanganyar (`KRA-042`) dan Sukoharjo (`SKH-107`) saling berhimpitan tanpa pemisahan visual yang bersih, dan halaman Peta Operasional penuh (`/map`) belum dipisahkan untuk tugas pemetaan geografis terfokus.

---

## 3. Ringkasan Referensi Desain yang Diadopsi
Berdasarkan inspeksi terhadap **ThingsBoard**, **Linear**, dan **Grafana**:
1. **ThingsBoard (Asset Monitoring & Smart Energy)**: Status strip ringkas di puncak halaman, pemantauan armada terpusat dengan filter koridor/status, serta integrasi langsung antara **tabel perangkat bermasalah**, **peta geografis**, dan **inspector detail**.
2. **Linear (Work Order, Alerts & Navigation)**: Sidebar kiri terstruktur (`232 px`), antarmuka daftar *issue/alert/work order* berkerapatan tinggi, filter multi-kriteria yang bersih, serta **split detail panel** agar operator dapat meninjau 1 tiket lengkap tanpa memenuhi seluruh halaman dengan form berulang.
3. **Grafana (Telemetry Observability & Energy)**: Panel grafik berlatar terang `#FFFFFF`, grid halus `#E2E8F0`, garis ambang batas eksplisit (`LCL`, `UCL`, batas termal `50 °C`), pilihan rentang waktu aktif, dan kejelasan antara *sensor measurement*, *computed metric*, dan *assumption*.
