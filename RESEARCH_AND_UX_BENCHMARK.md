# RISET PENGALAMAN PENGGUNA & TOLOK UKUR PLATFORM IIoT — REKASURYA

## 1. Platform Pembanding yang Diriset

Sebelum merancang struktur navigasi dan antarmuka SCADA REKASURYA, dilakukan studi terhadap empat pola platform sejenis serta satu sistem layanan publik lokal:

1. **Signify Interact City (Smart Street Lighting Management)**
   - *Pola yang dipelajari:* Hierarki *Map-first fleet overview* (peta sebaran lampu berbasis kesehatan status), pemilihan tiang untuk melihat *dimming profile* & kesalahan lampu, serta integrasi langsung antara peringatan kesalahan listrik dengan daftar tiket pemeliharaan lapangan.
   - *Adaptasi di REKASURYA:* Halaman utama `/` memadukan peta koridor Solo Raya dengan panel inspeksi tiang instan agar operator tidak perlu berpindah-pindah halaman hanya untuk triase awal.
2. **Clear Blue Illumience (Smart Off-Grid Solar Lighting Control)**
   - *Pola yang dipelajari:* Fokus manajemen otonomi energi off-grid (panel PV vs baterai vs beban lampu, riwayat *SoC* beberapa hari hujan, kontrol *adaptive dimming* aman tegangan rendah) serta penekanan bahwa kerusakan panel tidak selalu berarti lampu mati malam itu juga berkat cadangan baterai.
   - *Adaptasi di REKASURYA:* Halaman `/devices/[id]` menampilkan tiga kanal terpisah (`PV INA228`, `BATT INA226`, `LOAD INA226`), grafik *EWMA* daya aktual vs ekspektasi regresi, dan aturan pengamanan perintah `PWM` terhadap batas *UVLO* & suhu.
3. **Industrial SCADA / Fleet APM (Grafana / Ignition / CMMS Operasional)**
   - *Pola yang dipelajari:* Penggunaan kontras gelap berdensitas informasi terukur, angka bermakna operasional dalam font *monospace tabular* (`tabular-nums`), pembedaan jelas antara *Early Warning* (kuning/amber) vs *Critical Fault* (merah) vs *Security Tamper* (magenta/fuchsia), dan checklist suku cadang sebelum truk berangkat.
   - *Adaptasi di REKASURYA:* Mengganti kartu-kartu generik dengan strip KPI bermuatan konteks serta kartu Work Order yang memaksa verifikasi telemetri pemulihan sebelum tiket boleh ditutup.
4. **Unit Layanan Aduan Surakarta — ULAS (`https://ulas.surakarta.go.id/`)**
   - *Temuan observasi langsung pada portal publik ULAS:*
     - Nomor tiket terstruktur 10 digit (`ID. YYYY######`, contoh terlihat di portal: `ID. 2026007610`).
     - Status alur pengaduan ringkas: `Open` → `Responded` → `Process` → `Resolved`.
     - Kategorisasi terpisah termasuk `Penerangan Jalan Umum (PJU)` yang diarahkan ke `Dinas Perhubungan (Dishub)` dengan pemantauan SLA 24 jam.
     - Dukungan multi-kanal pelaporan (`Web ULAS`, `Solo Destination`, `Lapor Mas Wali (WA)`, `SP4N LAPOR!`) dan mekanisme rujukan aduan berulang (`FOLLOW UP ADUAN ID. ...`).
     - Pelacakan progres oleh pelapor memakai nomor tiket dan informasi verifikasi ringkas (4 digit nomor HP).
   - *Adaptasi aman di REKASURYA:* Dibangun sebagai **modul simulasi internal** pada `/work-orders` (tab *Kanal Aduan Warga*). Tidak melakukan *scraping* data pribadi dan tidak mengklaim integrasi resmi dengan Pemkot Surakarta. Laporan warga dicocokkan menggunakan jarak Haversine ke koordinat tiang REKASURYA terdekat untuk menghubungkan keluhan warga dengan telemetri 3-kanal dan Work Order teknisi.

---

## 2. Keputusan Arsitektur Informasi (6 Ruang Kerja Operasional)

Berdasarkan hasil riset di atas, aplikasi dibagi menjadi 6 rute yang mencerminkan tugas harian tiga peran pengguna (**Operator Dishub**, **Teknisi Sky-Lift**, **Auditor PJU & Pemda**):

| Rute | Tujuan Keputusan Operator | Aksi Nyata yang Tersedia |
| :--- | :--- | :--- |
| `/` | Memahami tiang mana yang bermasalah di Solo Raya dan apa yang harus segera dikirim | Filter koridor/status, triase peta & tabel, lihat daftar suku cadang aktif |
| `/devices/[id]` | Menentukan komponen spesifik yang rusak (`PV`, `SCC`, `Baterai`, `Buck CC-CV`, `Tamper`) & memverifikasi apakah cuma mendung seruas | Diagram PCB 3-kanal, grafik EWMA & koridor tetangga, perintah PWM / Mode Servis |
| `/work-orders` | Mengirim teknisi sky-lift dengan komponen tepat & melacak pengaduan warga | Check-in GPS (otorisasi panel 90m), Verifikasi telemetri normal, Lacak/Kirim aduan demo |
| `/energy` | Menilai kelayakan anggaran konversi (SON-T vs LED 60 W) & mengaudit O&M PJUTS | Simulasi 2-aliran interaktif, perbandingan payback 4 lampu, kepatuhan PM 47/2023 & PP 4/2023 |
| `/simulator` | Menguji skenario fisik 8 kasus termasuk cuaca seruas tanpa merusak data produksi | Injeksi F1–F6 / mendung koridor, melihat JSON kontrak AI & Reset Demo |
| `/architecture` | Memeriksa kesiapan integrasi AI eksternal & keutuhan log operasional | Uji langsung `POST /api/ai/infer`, delta PCB, verifikator hash SHA-256 `audit_log` |
