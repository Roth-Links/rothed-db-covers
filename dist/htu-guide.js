// htu-guide.js — Panduan "How to Use" (download & inject save data)
// Dipisah dari template.html supaya JS-nya di-load lazy: hanya diambil
// browser saat pengunjung pertama kali klik tombol "How to Use", bukan
// ikut ter-parse di awal load halaman.

export const HTU_DATA = {
  PS4: {
    subtitle: '⚠️ Selalu backup save data asli kamu sebelum replace! Butuh PS4 jailbreak + Apollo Save Tool.',
    tool: '🛠 Apollo Save Tool — tersedia di PS4 homebrew store (PKG)',
    steps: [
      { title: 'Ekstrak file RAR', desc: 'Ekstrak file RAR yang sudah didownload.' },
      { title: 'Copy ke USB', desc: 'Salin folder <code>[SERIAL ID]</code> ke USB kamu di path: <code>\\PS4\\APOLLO\\</code>' },
      { title: 'Colok USB ke PS4', desc: 'Sambungkan USB ke konsol PS4 kamu.' },
      { title: 'Buka Apollo Save Tool', desc: 'Gunakan Apollo Save Tool untuk copy savegame ke HDD konsol.' },
      { title: 'Resign (jika perlu)', desc: 'Resign save file ke akun kamu jika diminta.' },
      { title: 'Launch game', desc: 'Buka game dan nikmati! 🎮' },
    ]
  },
  PS3: {
    subtitle: 'Untuk emulator RPCS3. Copy folder save ke direktori savedata RPCS3 kamu.',
    tool: '🛠 Emulator: RPCS3',
    steps: [
      { title: 'Copy folder save', desc: 'Salin folder save ke: <code>\\&lt;RPCS3 FOLDER&gt;\\dev_hdd0\\home\\00000001\\savedata\\</code>' },
      { title: 'Catatan User ID', desc: '<code>00000001</code> adalah default User ID. Jika kamu pakai ID lain, sesuaikan: <code>\\dev_hdd0\\home\\&lt;YOUR USER ID&gt;\\savedata\\</code>' },
      { title: 'Launch game', desc: 'Buka RPCS3 dan jalankan game — save sudah siap digunakan.' },
    ]
  },
  PS2: {
    subtitle: 'Untuk emulator PCSX2. Copy file .ps2 langsung ke folder memcards PCSX2 kamu.',
    tool: '🛠 Emulator: PCSX2',
    steps: [
      { title: 'Copy file .ps2', desc: 'Salin file <code>&lt;SERIAL_ID&gt;.ps2</code> ke folder: <code>\\&lt;PCSX2 FOLDER&gt;\\memcards\\</code>' },
      { title: 'Buka Memory Card Settings', desc: 'Di PCSX2, buka pengaturan Memory Cards.' },
      { title: 'Set ke Slot 1', desc: 'Klik kanan file tersebut lalu pilih <code>Use this for Slot 1</code>.' },
      { title: 'Enjoy!', desc: 'Jalankan game dan save-nya langsung terbaca. 😄' },
    ]
  },
  PSP: {
    subtitle: 'Untuk emulator PPSSPP. Copy folder save ke direktori SAVEDATA PPSSPP kamu.',
    tool: '🛠 Emulator: PPSSPP',
    steps: [
      { title: 'Copy folder save', desc: 'Salin folder save ke: <code>C:\\Users\\&lt;USERNAME&gt;\\Documents\\PPSSPP\\PSP\\SAVEDATA\\</code>' },
      { title: 'Tidak tahu path-nya?', desc: 'Buka PPSSPP → klik toolbar <code>File</code> → <code>Open Memory Stick</code>. Ini akan membuka folder yang tepat.' },
      { title: 'Paste folder save', desc: 'Paste folder save ke dalam folder yang terbuka tersebut.' },
      { title: 'Launch game', desc: 'Buka game di PPSSPP — save langsung terbaca.' },
    ]
  },
  VITA: {
    subtitle: 'PS Vita save data butuh tool khusus karena sistem enkripsi Sony.',
    tool: '🛠 VitaShell + Rincheat Dumper, atau PSVSD / StorageMgr',
    steps: [
      { title: 'Install HENkaku', desc: 'Pastikan Vita kamu sudah jailbreak dengan HENkaku / Enso.' },
      { title: 'Buka VitaShell', desc: 'Navigasi ke <code>ux0:user/00/savedata/</code> untuk melihat folder save per game.' },
      { title: 'Copy via FTP atau USB', desc: 'Gunakan FTP mode di VitaShell untuk transfer save dari PC ke Vita atau sebaliknya.' },
      { title: 'Resign jika perlu', desc: 'Beberapa save butuh resign dengan <code>Account ID</code> kamu. Gunakan Save Data Resigner Tool.' },
    ]
  },
  SWITCH: {
    subtitle: 'Untuk emulator Switch (eden/yuzu/Ryujinx). Copy folder save ke lokasi savedata emulator kamu.',
    tool: '🛠 Emulator: eden / yuzu / Ryujinx',
    steps: [
      { title: 'Temukan folder savedata', desc: 'Klik kanan game di emulator → pilih <code>Open Save Data Location</code> untuk langsung buka foldernya.' },
      { title: 'Copy folder save', desc: 'Salin folder <code>&lt;SERIAL ID&gt;</code> ke lokasi tersebut. Contoh path eden: <code>C:\\Users\\&lt;USERNAME&gt;\\AppData\\Roaming\\eden\\nand\\user\\save\\0000000000000000\\&lt;YOUR USERID&gt;\\&lt;SERIAL ID&gt;\\</code>' },
      { title: 'Paste di dalam folder yang benar', desc: 'Paste isi folder save (bukan foldernya) ke dalam direktori <code>&lt;SERIAL ID&gt;</code> tersebut.' },
      { title: 'Launch game', desc: 'Buka game di emulator — save langsung terbaca. Enjoy! 😄' },
    ]
  },
  PC: {
    subtitle: 'PC save data sangat mudah — tinggal replace file di folder save game.',
    tool: '🛠 Tidak perlu tool khusus — File Explorer sudah cukup',
    steps: [
      { title: 'Temukan folder save', desc: 'Biasanya di <code>%APPDATA%</code>, <code>Documents/My Games/</code>, atau folder instalasi Steam (<code>userdata/</code>).' },
      { title: 'Backup save lama', desc: 'Rename atau salin folder save asli ke tempat lain sebelum replace.' },
      { title: 'Copy save baru', desc: 'Ekstrak file save yang didownload, lalu salin ke folder yang tepat. Match nama file jika diminta.' },
      { title: 'Verifikasi', desc: 'Buka game dan cek apakah save muncul di menu Load Game.' },
    ]
  },
  default: {
    subtitle: 'Cara inject save data berbeda tiap platform. Pilih platform spesifik untuk panduan detail.',
    tool: '💡 Pilih platform di sidebar untuk panduan yang lebih spesifik',
    steps: [
      { title: 'Download save file', desc: 'Klik tombol Download pada game yang kamu inginkan.' },
      { title: 'Ekstrak file', desc: 'Unzip file yang didownload dan lihat isinya.' },
      { title: 'Ikuti panduan platform', desc: 'Setiap platform memiliki cara inject yang berbeda. Pilih platform di filter untuk panduan spesifik.' },
      { title: 'Verifikasi', desc: 'Buka game dan pastikan save data sudah terbaca dengan benar.' },
    ]
  }
};

function switchHtuTab(tab) {
  document.getElementById('htu-panel-download').classList.toggle('active', tab === 'download');
  document.getElementById('htu-panel-inject').classList.toggle('active', tab === 'inject');
  document.getElementById('htu-panel-premium').classList.toggle('active', tab === 'premium');
  document.getElementById('htu-panel-leaderboard').classList.toggle('active', tab === 'leaderboard');
  document.getElementById('htu-tab-download').classList.toggle('active', tab === 'download');
  document.getElementById('htu-tab-inject').classList.toggle('active', tab === 'inject');
  document.getElementById('htu-tab-premium').classList.toggle('active', tab === 'premium');
  document.getElementById('htu-tab-leaderboard').classList.toggle('active', tab === 'leaderboard');
}

// cache rendered HTU HTML per platform biar tidak rebuild tiap buka
const _htuCache = {};

function openHowToUse(platform) {
  const platKey = (platform || 'all').toUpperCase();
  const data = HTU_DATA[platKey] || HTU_DATA.default;

  document.getElementById('htu-plat-label').textContent =
    platKey === 'ALL' ? 'All Platforms' : platKey;

  if (!_htuCache[platKey]) {
    document.getElementById('htu-subtitle').textContent = data.subtitle;
    document.getElementById('htu-steps').innerHTML = data.steps.map((s, i) => `
      <div class="htu-step">
        <div class="htu-step-num">${i + 1}</div>
        <div class="htu-step-body">
          <div class="htu-step-title">${s.title}</div>
          <div class="htu-step-desc">${s.desc}</div>
        </div>
      </div>`).join('');
    document.getElementById('htu-tool-badge').innerHTML = data.tool;
    _htuCache[platKey] = true;
  }

  // reset scroll ke atas tiap buka
  const box = document.getElementById('htu-box');
  box.scrollTop = 0;

  document.getElementById('htu-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

export { switchHtuTab, openHowToUse };

// Expose ke window supaya inline onclick="switchHtuTab(...)" di dalam HTML
// yang di-render (htu-steps dsb, kalau ada) tetap bisa manggil langsung.
window.switchHtuTab = switchHtuTab;
