// ── VAULT / OTP MODULE — lazy-loaded ─────────────────────────────
// Isi asli 11 fungsi vault yang HANYA reachable setelah user berinteraksi
// (klik "Login", buka riwayat CR, klaim item premium, dst) hidup di sini
// (dynamic import dari template.html), sama seperti pola htu-guide.js.
//
// PENTING — kenapa fungsi di sini bebas pakai bare identifier seperti
// `_vaultSession`, `GAS_URL`, `esc`, `_lbHidden`, `_premiumFiles`,
// `searchQuery` tanpa import apa pun:
// Semua itu sengaja diubah jadi `window.X = ...` (bukan let/const) di
// script inline template.html. Properti window otomatis bisa dibaca/ditulis
// sebagai bare identifier dari MANA SAJA yang jalan di browser — termasuk
// dari ES module ini — karena keduanya sama-sama "global object". Ini
// mencegah split-brain: module ini dan script inline baca-tulis ke
// variable yang SAMA persis, bukan copy masing-masing.
//
// Fungsi lain (mis. _renderLoggedIn, loadPremiumSection, _saveVaultSession,
// showToast, t, buildNav, dst) TETAP didefinisikan inline sebagai
// `function foo(){}` biasa — deklarasi fungsi top-level di classic <script>
// otomatis nempel ke window juga, jadi module ini bisa langsung manggil
// itu semua tanpa import.
//
// closeCreditHistory SENGAJA TIDAK dipindah ke sini — dia trivial (cuma
// toggle display modal, tanpa network call), dan dipanggil dari Escape-key
// handler yang harus selalu siap dipanggil kapan saja, termasuk SEBELUM
// module ini sempat ke-load. Lihat closeVaultLogin/closeHowToUse untuk
// pola yang sama.

export async function vlmSendOtp() {
  const email = document.getElementById("vlm-email-input").value.trim().toLowerCase();
  const msg   = document.getElementById("vlm-email-msg");
  const btn   = document.getElementById("vlm-send-btn");
  if (!email || !email.includes("@")) { _vlmMsg(msg, "Please enter a valid email.", "err"); return; }

  btn.disabled = true; btn.textContent = "Sending…";
  _vlmMsg(msg, "", "");

  try {
    const res  = await fetch(`${GAS_URL}?action=sendotp&email=${encodeURIComponent(email)}`, { cache: "no-store" });
    const data = await res.json();

    if (data.status === "sent") {
      document.getElementById("vlm-otp-email-label").textContent = email;
      document.getElementById("vlm-step-email").style.display = "none";
      document.getElementById("vlm-step-otp").style.display   = "block";
      document.getElementById("vlm-otp-input").focus();
    } else if (data.status === "no_account") {
      _vlmMsg(msg, "No premium account found for this email.", "err");
    } else if (data.status === "rate_limited") {
      _vlmMsg(msg, "Too many requests. Try again in 1 hour.", "err");
    } else {
      _vlmMsg(msg, "Failed to send code. Try again.", "err");
    }
  } catch(e) {
    _vlmMsg(msg, "Network error. Try again.", "err");
  }
  btn.disabled = false; btn.textContent = t("sendLoginCode");
}

export async function vlmVerifyOtp() {
  const email = document.getElementById("vlm-otp-email-label").textContent.trim();
  const otp   = document.getElementById("vlm-otp-input").value.trim();
  const msg   = document.getElementById("vlm-otp-msg");
  const btn   = document.getElementById("vlm-verify-btn");
  if (!otp || otp.length !== 6) { _vlmMsg(msg, "Enter the 6-digit code.", "err"); return; }

  btn.disabled = true; btn.textContent = "Verifying…";
  _vlmMsg(msg, "", "");

  try {
    const res  = await fetch(`${GAS_URL}?action=verifyotp&email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`, { cache: "no-store" });
    const data = await res.json();

    if (data.status === "success") {
      _vaultSession = { email: data.email, sessionToken: data.sessionToken, balance: data.balance, lifetimeCr: data.lifetimeCr || 0, lastTopupAt: data.lastTopupAt || null };
      _saveVaultSession(data.email, data.sessionToken, data.balance, data.lifetimeCr || 0, data.lastTopupAt || null);
      closeVaultLogin();
      _renderLoggedIn(data.balance, {
        streak: data.streak, fomo: data.fomo, canClaimToday: data.canClaimToday
      });
      loadPremiumSection(true); // force refresh: baru login, cache guest sebelumnya tidak relevan lagi
      if (_isAdFreeEligible(_vaultSession)) {
        // Eligible (topup CR ≤30 hari) — reload paksa. Kalau AdSense script
        // sempat kelanjur load sebagai guest sebelumnya, Auto ads akan terus
        // nyoba nyisipin ads baru selama script itu aktif (bukan cuma sekali),
        // jadi DOM-scrub sekali doang tidak cukup. Reload memastikan loader
        // di <head> re-check localStorage dan skip load AdSense sama sekali.
        window.location.reload();
        return;
      }
      document.getElementById("vlm-otp-input").value          = "";
      document.getElementById("vlm-step-otp").style.display   = "none";
      document.getElementById("vlm-step-email").style.display = "block";
    } else if (data.status === "wrong_otp") {
      _vlmMsg(msg, "Wrong code. Check your email and try again.", "err");
    } else {
      _vlmMsg(msg, "Verification failed. Try again.", "err");
    }
  } catch(e) {
    _vlmMsg(msg, "Network error. Try again.", "err");
  }
  btn.disabled = false; btn.textContent = t("verifyLogin");
}

export function vlmResendOtp() {
  document.getElementById("vlm-step-otp").style.display   = "none";
  document.getElementById("vlm-step-email").style.display = "block";
  document.getElementById("vlm-otp-input").value          = "";
  _vlmMsg(document.getElementById("vlm-otp-msg"), "", "");
}

// ── LEADERBOARD VISIBILITY (opt-out) ─────────────────────────────
// _lbHidden (window property) + _updateLbVisibilityLabel() + _loadLeaderboardVisibility()
// TETAP hidup inline di template.html (dipanggil eager dari _renderLoggedIn saban kali
// status login berubah/direstore). Di sini cuma toggleLeaderboardVisibility() — dia
// manggil window._updateLbVisibilityLabel() yang sudah otomatis ready sebagai bare
// identifier (function declaration inline nempel ke window).
export async function toggleLeaderboardVisibility() {
  if (!_vaultSession) return;
  const { email, sessionToken } = _vaultSession;
  const next = !_lbHidden;
  const btn  = document.getElementById('vlw-lb-visibility-btn');
  if (btn) btn.disabled = true;
  try {
    const res  = await fetch(`${GAS_URL}?action=setleaderboardvisibility&email=${encodeURIComponent(email)}&sessionToken=${encodeURIComponent(sessionToken)}&hidden=${next ? "1" : "0"}`, { cache: "no-store" });
    const data = await res.json();
    if (data.status === "ok") {
      _lbHidden = data.hidden;
      _updateLbVisibilityLabel();
      showToast(_lbHidden ? '🙈 Kamu disembunyikan dari leaderboard' : '👁️ Kamu sekarang tampil di leaderboard', 2500);
    } else if (data.status === "unauthorized") {
      alert('Sesi login kamu sudah habis. Silakan login ulang.');
      vaultLogout(); openVaultLogin();
    } else if (data.status === "invalid_action") {
      alert('Fitur ini belum aktif di server (backend perlu diperbarui/deploy ulang). Hubungi admin.');
    } else {
      alert('Gagal mengubah pengaturan (' + data.status + '). Coba lagi.');
    }
  } catch(e) {
    alert('Koneksi gagal. Coba lagi.');
  }
  if (btn) btn.disabled = false;
}

export function vlmBackToEmail() { vlmResendOtp(); }

export function vaultLogout() {
  _clearVaultSession();
  _vaultSession = null;
  // Reload penuh — biar script AdSense di <head> re-check localStorage (sekarang kosong)
  // dan Auto ads dimuat lagi untuk visitor yang sudah jadi guest ini.
  window.location.reload();
}

function _vlmMsg(el, text, type) {
  el.textContent  = text;
  el.className    = "vlm-msg" + (type ? " " + type : "");
}
export async function claimPremiumFromNav(fileId, fileName, price, btn) {
  if (!_vaultSession) return;
  const { email, sessionToken } = _vaultSession;
  btn.disabled = true;
  btn.classList.add('loading');
  const origHTML = btn.innerHTML;
  btn.innerHTML = "Claiming...";
  const svgDl = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  try {
    const res  = await fetch(
      `${GAS_URL}?action=getdownloadurl&email=${encodeURIComponent(email)}&sessionToken=${encodeURIComponent(sessionToken)}&fileId=${encodeURIComponent(fileId)}&price=${price}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error('bad_response');
    const data = await res.json();
    if (data.status === "ok") {
      const bytes = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
      const blob  = new Blob([bytes], { type: data.mimeType });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href = url; a.download = data.fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      _persistBalance(data.balance);
      document.getElementById("vlw-bal-num").textContent = data.balance.toLocaleString();
      // Update in-memory list + cache lokal (owned=true) biar konsisten kalau reload hari ini juga
      const _f = _premiumFiles.find(x => String(x.id) === String(fileId));
      if (_f) _f.owned = true;
      _writePremiumCache(_premiumFiles);
      renderPremiumPlatform(searchQuery);
      if (data.alreadyOwned) {
        showToast('📥 Downloaded again — free, you already own this!', 2500);
      }
    } else if (data.status === "insufficient") {
      _persistBalance(data.balance);
      renderPremiumPlatform(searchQuery);
    } else if (data.status === "redownload_limited") {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = origHTML;
      alert("Kamu sudah download ulang file ini hari ini. Coba lagi besok ya — dibatasi 1x/hari biar hemat bandwidth 🙏");
    } else if (data.status === "unauthorized") {
      vaultLogout(); openVaultLogin();
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = origHTML;
      alert("Klaim gagal. CR kamu belum dipotong. Silakan coba lagi.");
    }
  } catch(e) {
    // PENTING: jangan diam-diam reset tombol. Request mungkin sudah sempat
    // diproses & CR sudah terpotong di server walau respons gagal sampai ke HP.
    // Sinkronkan ulang saldo asli dari server sebelum membiarkan member klik lagi,
    // supaya tombol tidak menyesatkan (tampak "belum bayar" padahal sudah kepotong).
    try {
      const freshBal = await _refreshVaultBalance();
      if (freshBal !== null) {
        alert("Koneksi terputus saat memproses klaim. Saldo CR kamu sudah kami sinkronkan ulang — cek riwayat/saldo sebelum mencoba lagi. Jika CR sudah terpotong tapi file belum kamu terima, hubungi Contact/Support dan sertakan bukti (screenshot saldo).");
      } else {
        alert("Koneksi terputus saat memproses klaim. Jika CR kamu sudah terpotong tapi file belum kamu terima, JANGAN klaim ulang — langsung hubungi Contact/Support dengan bukti (screenshot saldo) agar tidak double.");
      }
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = origHTML;
      renderPremiumPlatform(searchQuery);
    }
  }
}

// Re-sync balance from server after a failed/uncertain request, so the UI
// never shows a stale "Claim" state that could lead to a duplicate charge.
// Reuses the existing getcredithistory endpoint (confirmed to return a fresh
// balance) rather than inventing a new backend action.
async function _refreshVaultBalance() {
  if (!_vaultSession) return null;
  const { email, sessionToken } = _vaultSession;
  try {
    const res  = await fetch(
      `${GAS_URL}?action=getcredithistory&email=${encodeURIComponent(email)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "ok" && typeof data.balance === "number") {
      const wasAdFree = _isAdFreeEligible(_vaultSession);
      _vaultSession.balance     = data.balance;
      _vaultSession.lifetimeCr  = data.lifetimeCr  ?? _vaultSession.lifetimeCr;
      _vaultSession.lastTopupAt = data.lastTopupAt ?? _vaultSession.lastTopupAt;
      _saveVaultSession(email, sessionToken, data.balance, _vaultSession.lifetimeCr, _vaultSession.lastTopupAt);
      const el = document.getElementById("vlw-bal-num");
      if (el) el.textContent = data.balance.toLocaleString();

      const nowAdFree = _isAdFreeEligible(_vaultSession);
      const adFreeBadge = document.getElementById("vlw-adfree-badge");
      if (adFreeBadge) adFreeBadge.style.display = nowAdFree ? "inline-block" : "none";
      if (!wasAdFree && nowAdFree) {
        // Baru saja topup dalam sesi ini — reload paksa (lihat alasan di
        // handler login sukses: DOM-scrub sekali tidak cukup untuk Auto ads)
        window.location.reload();
        return null;
      } else if (wasAdFree && !nowAdFree) {
        // Status ad-free habis (topup terakhir sudah lewat 30 hari) — reload
        // supaya loader di <head> muat ulang AdSense untuk sesi berikutnya.
        window.location.reload();
      }
      return data.balance;
    }
  } catch(e) { /* server unreachable — nothing more we can do client-side */ }
  return null;
}



export async function claimPremium(fileId, btn) {
  if (!_vaultSession || _vaultSession.balance <= 0) return;
  const { email, sessionToken } = _vaultSession;

  btn.disabled = true; btn.textContent = t('claiming');

  try {
    const res  = await fetch(
      `${GAS_URL}?action=getdownloadurl&email=${encodeURIComponent(email)}&sessionToken=${encodeURIComponent(sessionToken)}&fileId=${encodeURIComponent(fileId)}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (data.status === "ok") {
      // Decode base64 → blob → trigger download
      const bytes    = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
      const blob     = new Blob([bytes], { type: data.mimeType });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = data.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      // Update balance
      _persistBalance(data.balance);
      document.getElementById("vlw-bal-num").textContent      = data.balance;
      const premBalEl = document.getElementById("prem-bal-display");
      if (premBalEl) premBalEl.textContent = data.balance;

      btn.textContent = t("alreadyClaimed");
      btn.classList.add("claimed");
      btn.disabled = true;

      // If balance = 0, disable all remaining claim buttons
      if (data.balance === 0) {
        document.querySelectorAll(".prem-dl-btn:not(.claimed)").forEach(b => {
          b.textContent = t("noCredits");
          b.classList.add("claimed");
          b.disabled = true;
        });
      }
    } else if (data.status === "no_credits") {
      btn.textContent = t("noCredits"); btn.classList.add("claimed"); btn.disabled = true;
    } else if (data.status === "unauthorized") {
      vaultLogout(); closeVaultLogin(); openVaultLogin();
    } else {
      btn.disabled = false; btn.textContent = t("claimBtn");
      alert("Download failed. Please try again.");
    }
  } catch(e) {
    btn.disabled = false; btn.textContent = t("claimBtn");
    alert("Network error. Please try again.");
  }
}

// ── CREDIT HISTORY ────────────────────────────────────────────────
export function openCreditHistory() {
  const modal = document.getElementById('credit-history-modal');
  modal.style.display = 'flex';
  _loadCreditHistory();
}
export async function _loadCreditHistory() {
  if (!_vaultSession) return;
  const list = document.getElementById('hist-list');
  list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">Loading…</div>';

  try {
    const { email, sessionToken } = _vaultSession;
    const res  = await fetch(
      `${GAS_URL}?action=getcredithistory&email=${encodeURIComponent(email)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      { cache: 'no-store' }
    );

    // GAS kadang return HTML error page (quota habis, redirect) — tangkap sebelum .json()
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
      // Coba parse tetap, tapi siapkan fallback
    }

    let data;
    try {
      data = await res.json();
    } catch(_) {
      // Response bukan JSON (HTML error page, dll) — coba ambil text untuk debug
      list.innerHTML = `<div style="color:#ef4444;font-size:13px;text-align:center;padding:24px 0;">
        Failed to load history.<br>
        <span style="font-size:11px;color:var(--text-muted);display:block;margin-top:6px;">Server returned an unexpected response. Try again later.</span>
      </div>`;
      return;
    }

    if (data.status === 'already_claimed') {
      // Session masih valid, tapi endpoint ini tidak relevan dengan claim — tampilkan history kosong
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      localStorage.setItem('rdb_claimed_' + today, '1');
      list.innerHTML = `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">${t('noTransactions')}</div>`;
      return;
    }

    if (data.status === 'invalid_session' || data.status === 'unauthorized') {
      list.innerHTML = `<div style="color:#ef4444;font-size:13px;text-align:center;padding:24px 0;">
        Session expired. Please <button onclick="closeCreditHistory();openVaultLogin()"
          style="background:none;border:none;color:var(--gold);cursor:pointer;font-size:13px;text-decoration:underline;">login again</button>.
      </div>`;
      return;
    }

    if (data.status !== 'ok') {
      list.innerHTML = `<div style="color:#ef4444;font-size:13px;text-align:center;padding:24px 0;">
        Failed to load history.
        <span style="font-size:11px;color:var(--text-muted);display:block;margin-top:4px;">${esc(data.message || data.status || 'Unknown error')}</span>
      </div>`;
      return;
    }

    document.getElementById('hist-balance').textContent = Number(data.balance).toLocaleString();

    if (!data.history || !data.history.length) {
      list.innerHTML = `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">${t('noTransactions')}</div>`;
      return;
    }

    // ── Field mapping kept IN SYNC with dashboard.html's renderHistory() ──
    // Sama-sama defensif terhadap variasi nama field dari GAS (amount vs
    // change, reason vs label vs type, date vs time) dan sama-sama nentuin
    // arah transaksi dari TANDA angkanya (amt >= 0 = masuk), bukan dari
    // string h.type — supaya dropdown premium & dashboard selalu nunjukin
    // hasil identik untuk data yang sama. Kalau logika ini diubah di salah
    // satu file, ubah juga di file satunya (dashboard_template.html →
    // renderHistory()).
    list.innerHTML = data.history.map(h => {
      const amt        = Number(h.amount ?? h.change ?? 0);
      const isPurchase  = amt >= 0;
      const color       = isPurchase ? '#22c55e' : '#ef4444';
      const icon        = isPurchase ? '⬆' : '⬇';
      const amountStr   = amt ? `${isPurchase ? '+' : ''}${amt.toLocaleString()} cr` : '';
      const rawLabel    = String(h.reason || h.label || h.type || 'Transaction');
      const labelShort  = rawLabel.length > 40 ? rawLabel.slice(0, 37) + '…' : rawLabel;
      const dateStr     = h.date || h.time || '';

      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;
                      font-size:13px;flex-shrink:0;
                      background:${isPurchase ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.1)'};">
            ${icon}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(labelShort)}</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px;">${esc(dateStr)}</div>
          </div>
          <div style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:${color};flex-shrink:0;">${amountStr}</div>
        </div>`;
    }).join('');

  } catch(e) {
    // Fetch itself failed (offline, CORS, timeout)
    const isOffline = !navigator.onLine;
    list.innerHTML = `<div style="color:#ef4444;font-size:13px;text-align:center;padding:24px 0;">
      ${isOffline ? '📶 You appear to be offline.' : t('networkError')}
      <br><button onclick="_loadCreditHistory()"
        style="margin-top:10px;background:rgba(61,142,255,.1);border:1px solid rgba(61,142,255,.3);
               color:var(--blue);font-family:var(--font-mono);font-size:11px;padding:5px 14px;
               border-radius:20px;cursor:pointer;">
        ${t('retry')}
      </button>
    </div>`;
  }
}
