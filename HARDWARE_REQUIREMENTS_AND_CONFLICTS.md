# KEBUTUHAN HARDWARE, VERIFIKASI DESAIN & RESOLUSI KONFLIK DOKUMEN

Dokumen ini memverifikasi kesesuaian implementasi perangkat lunak dan firmware REKASURYA terhadap dokumen sumber primer (`Proposal_REKASURYA_Retrofit_v1.pdf`, `ARSITEKTUR BOARD REKASURYA.pdf`, `FITURPEMENANG_KIT SURYA.pdf`) serta referensi pendukung (`AURORA_Control Board.png`, `Draf_Proposal_REKASURYA_UNS_Hackathon_2026.pdf`), dan mencatat konflik antar-dokumen secara transparan.

---

## 1. Sumber Keputusan & Keterbatasan Dokumen

1. **Dokumen Proposal (`Proposal_REKASURYA_Retrofit_v1.pdf`):** Menentukan batas ruang lingkup bisnis Solo Raya (25.843 titik PJU Surakarta, 10 teknisi + 2 armada sky-lift, skema konversi Rp 6,5 juta dengan estimasi payback ±3,7 tahun dibanding SON-T 250 W pada tarif P-3 Rp 1.699,53/kWh).
2. **Dokumen Arsitektur Board (`ARSITEKTUR BOARD REKASURYA.pdf`):** Menetapkan keputusan teknis PCB kendali terbaru yang mengoreksi kekurangan purwarupa awal AURORA.
3. **Dokumen Fitur Pemenang (`FITURPEMENANG_KIT SURYA.pdf`):** Menegaskan hierarki pengalaman pengguna: diagnosis terlokalisasi → Work Order + rekomendasi suku cadang → dampak penghematan → keamanan anti-pencurian.
4. **Status Dokumen Lanjutan Claude Opus:** Tiga file lanjutan (`REKASURYA_Extended_Proposal_FINAL.pdf`, `REKASURYA_AI_Implementation_Specification.md`, `REKASURYA_Architecture_Decisions.md`) **tidak tersedia** di folder proyek saat pengerjaan. Platform mengatasi kekosongan ini dengan menetapkan kontrak JSON terbuka `AI-CONTRACT-v1.0.0` dan adaptor deterministik yang siap diganti ketika endpoint Python PoC tim AI tersedia.
5. **Status Referensi A (Claude Artifact):** Tautan `https://claude.ai/artifact/PnB6S7gqskthgGa2LWEZ8d` dapat dibuka dan menampilkan model 3D *"Model 3D Kit REKASURYA"* (baterai, SCC, driver Buck CC-CV, rel DIN, kotak kontrol cetak 3D, antena, dan tata letak konektor PCB), sedangkan ekspor/duplikasi artifact memerlukan akun Claude.

---

## 2. Pemisahan Jalur Daya & Delta Arsitektur (`AURORA → REKASURYA`)

Sesuai `ARSITEKTUR BOARD REKASURYA.pdf`, **daya utama lampu LED 40 W tidak melewati PCB kendali**. Jalur beban dikabelkan langsung:

`Panel Surya (300 Wp)` → `[Shunt INA228 85V]` → `SCC MPPT` ↔ `[Shunt INA226 BATT]` ↔ `Baterai LiFePO4 (25,6 V)`  
`SCC LOAD` → `[Shunt INA226 LOAD]` → `Driver Eksternal Buck CC-CV 6–40V 2A` → `Armatur LED DC 40W`

PCB kendali (`ESP32-WROOM-32E`) hanya menyadap daya kontrol `1–2 W` langsung dari bus baterai (dilindungi sekering, P-FET >= 60 V, TVS `SMBJ30A`, step-down `9–60 V → 5 V`, LDO `3,3 V`, dan buck khusus `4,0 V >= 2,5 A` untuk modem `LTE Cat-1`) serta dilengkapi **sel cadangan `18650`** dengan *power-path* untuk memastikan alarm pencurian dan koordinat GNSS tetap terkirim saat pack baterai utama dicabut.

---

## 3. Matriks Konflik Spesifikasi & Resolusi Implementasi

Tidak ada spesifikasi yang dipilih secara diam-diam. Seluruh perbedaan antar dokumen diselesaikan melalui konfigurasi eksplisit berikut:

| No | Area Spesifikasi | Konflik Antar Dokumen | Keputusan Implementasi | Memerlukan Konfirmasi Fisik? |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Kapasitas Baterai** | Proposal menyebut `25,6 V 40 Ah` (acuan PJUTS ESDM 1.024 Wh); Diagram Board hal. 2 mencantumkan `25,6 V 50 Ah` (1.280 Wh); Poster AURORA `12,8 V 12 Ah` (153,6 Wh). | Diwujudkan sebagai enum `DeviceProfile` (`25.6V_40Ah` default, `25.6V_50Ah`, `12.8V_40Ah`, `12.8V_12Ah_BENCH`) di firmware (`rekasurya_config.h`) dan kolom `battery_profile` di DB. | **Ya** — konfirmasi BOM pengadaan pack LiFePO4 per batch koridor. |
| 2 | **Sensor Arus & Tegangan** | AURORA awal memakai 3× `INA219` (maks 26 V); `ARSITEKTUR BOARD REKASURYA.pdf` mewajibkan `INA228` (85 V) di kanal PV dan `INA226` (36 V) di kanal BATT/LOAD. | Firmware (`sensor_pipeline.h`) & UI menetapkan `INA228` untuk PV ($V_{oc}$ dingin mencapai 46–48 V) dan `INA226` untuk BATT/LOAD dengan isolasi `B0303S-1W` + `ADuM1250`. | **Ya** — kalibrasi resistor shunt fisik (`2–5 mΩ >= 3W`). |
| 3 | **Jumlah Kanal Suhu** | Proposal & Diagram PCB mencantumkan `5x NTC` (`ADS1115` + `LM75B`); *FITURPEMENANG* menyebut `4x NTC`. | Diimplementasikan 5 kanal termal penuh: `temp_panel_c`, `temp_batt_c`, `temp_scc_c`, `temp_driver_c`, dan `temp_board_c` (`LM75B`). | **Ya** — jumlah header konektor NTC pada revisi netlist KiCad final. |
| 4 | **Modem Komunikasi** | AURORA / Draf awal memakai *mesh* `LoRa E220` relay+sink; Proposal & Arsitektur Board memilih `LTE Cat-1 + GNSS` per tiang (dengan opsional footprint LoRa). | Arsitektur utama menggunakan `LTE Cat-1 + GNSS` per tiang via `UART1` dengan topik MQTT `rekasurya/v1/{id}/*`. | **Ya** — uji *coverage* sinyal seluler & kuota M2M di koridor pinggiran. |
| 5 | **Penyimpanan Offline** | Kanvas proposal menyebut *SPIFFS* internal ESP32; Arsitektur Board menentukan SPI Flash eksternal `W25Q` + RTC `DS3231MZ`. | Firmware membangun `OfflineRingBuffer` berbobot CRC-16 lewat abstraksi HAL `W25Q` dan stempel waktu dari `DS3231MZ`. | **Ya** — verifikasi kapasitas chip flash `W25Q` terpasang (32/64 Mbit). |
| 6 | **Taksonomi Gangguan** | Proposal merangkum 6 keluarga (`F1–F6`); Draf Opus menguraikan hingga 14 sub-kode rinci. | Diimplementasikan secara hierarkis: 6 keluarga utama (`F1–F6`) + 16 sub-kode rinci tervalidasi Zod di `contract.ts` yang semuanya terpetakan ke SKU suku cadang. | **Tidak** (perangkat lunak), dapat ditambah via kontrak. |
| 7 | **Pin Mapping GPIO ESP32** | Skematik netlist pin-by-pin GPIO ESP32 belum terlampir dalam dokumen PDF. | Seluruh pin pada `PinConfigPlaceholder` di `rekasurya_config.h` diberi penanda eksplisit *placeholder* dan diisolasi di belakang `IHardwareHal`. | **Wajib** — sinkronkan sebelum memprogram PCB prototipe pertama. |
