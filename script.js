// ============================================================
// CONFIG – Gọi qua Cloudflare Worker (API key ẩn hoàn toàn)
// Sau khi deploy Worker, thay URL bên dưới bằng URL của bạn
// ============================================================
const WORKER_URL = 'https://gemini-proxy-nkthelinh.namco-vc.workers.dev';

// ============================================================
// DOCTOR ROTATION – đổi tên ngẫu nhiên mỗi 30 phút
// ============================================================
const DOCTORS = ['Hoa','Lan','Minh','Tuấn','Huyền','Trang','Thảo','Phương','Quân','Mai'];

function getCurrentDoctor() {
  try {
    const stored = localStorage.getItem('doctorData');
    const now = Date.now();
    if (stored) {
      const data = JSON.parse(stored);
      if (now - data.ts < 30 * 60 * 1000) return data.name;
    }
    const name = DOCTORS[Math.floor(Math.random() * DOCTORS.length)];
    localStorage.setItem('doctorData', JSON.stringify({ name, ts: now }));
    return name;
  } catch(e) {
    return DOCTORS[Math.floor(Math.random() * DOCTORS.length)];
  }
}

const DOCTOR_NAME = getCurrentDoctor();

// ============================================================
// MARQUEE HEADER
// ============================================================
(function initMarquee() {
  const content = '🦷  TRÍ TUỆ NHÂN TẠO THẾ LINH — NHA KHOA THẾ LINH  ';
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  const repeated = Array(16).fill(null)
    .map(() => `<span class="marquee-item">${content}</span>`)
    .join('');
  track.innerHTML = repeated + repeated;
})();

// ============================================================
// PARTICLES BACKGROUND
// ============================================================
(function initParticles() {
  const container = document.getElementById('particlesContainer');
  if (!container) return;
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 4 + Math.random() * 8;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px; height: ${size}px;
      animation-duration: ${9 + Math.random() * 14}s;
      animation-delay: ${Math.random() * 12}s;
      opacity: ${0.25 + Math.random() * 0.5};
    `;
    container.appendChild(p);
  }
})();

// ============================================================
// CHAT STATE
// ============================================================
let pendingImage = null;
let pendingImageBase64 = null;
let pendingImageMime = null;
const chatMessages = document.getElementById('chatMessages');
let conversationHistory = [];
const SESSION_TIMEOUT = 30 * 60 * 1000;
let resetTimer = null;

function getSystemPrompt() {
  return `Bạn là bác sĩ ${DOCTOR_NAME} – bác sĩ răng hàm mặt tại Phòng Khám Nha Khoa Thế Linh, Nghệ An.

QUY TẮC BẮT BUỘC – PHẢI TUÂN THỦ TUYỆT ĐỐI:
1. BẮT BUỘC mở đầu MỌI câu trả lời bằng: "Chào bạn, mình là bác sĩ ${DOCTOR_NAME} tại Nha khoa Thế Linh."
2. Sau lời chào, tư vấn chuyên sâu về vấn đề răng miệng của bệnh nhân.
3. Giải thích rõ ràng, thân thiện, dễ hiểu như bác sĩ đang tư vấn trực tiếp.
4. Nếu bệnh nhân gửi ảnh răng: mô tả chi tiết những gì quan sát được (sâu răng, viêm nướu, mảng bám, nứt vỡ...) và đưa ra chẩn đoán sơ bộ.
5. Nếu triệu chứng nghiêm trọng: khuyên bệnh nhân đến khám trực tiếp tại Nha khoa Thế Linh ngay.
6. CHỈ tư vấn về sức khỏe răng miệng. Từ chối lịch sự nếu hỏi chủ đề khác.
7. Luôn trả lời bằng tiếng Việt, giọng ấm áp, chuyên nghiệp.
8. Kết thúc bằng câu hỏi nhẹ nhàng để hỗ trợ thêm.
9. KHÔNG nhớ các cuộc trò chuyện trước. Mỗi tin nhắn là một tư vấn mới.`;
}

// ============================================================
// SESSION RESET SAU 30 PHÚT
// ============================================================
function resetConversation() {
  conversationHistory = [];
  chatMessages.innerHTML = '';
  showWelcome();
}

function updateActivity() {
  clearTimeout(resetTimer);
  resetTimer = setTimeout(resetConversation, SESSION_TIMEOUT);
}

// ============================================================
// TIN NHẮN CHÀO
// ============================================================
function showWelcome() {
  const welcome = `Chào bạn, mình là bác sĩ ${DOCTOR_NAME} – bác sĩ răng hàm mặt tại Nha khoa Thế Linh.\nMình sẽ giúp bạn giải đáp mọi vấn đề về sức khỏe răng miệng. Bạn đang gặp triệu chứng gì? 😊`;
  addMessage('ai', welcome);
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { showWelcome(); updateActivity(); }, 700);
});

// ============================================================
// RENDER TIN NHẮN
// ============================================================
function addMessage(role, content, imgSrc) {
  const row = document.createElement('div');
  row.className = 'msg-row' + (role === 'user' ? ' user' : '');
  const av = document.createElement('div');
  av.className = 'avatar' + (role === 'user' ? ' user-av' : '');
  av.textContent = role === 'user' ? '👤' : '👨‍⚕️';
  const bub = document.createElement('div');
  bub.className = 'bubble ' + (role === 'user' ? 'user' : 'ai');
  if (imgSrc) {
    const img = document.createElement('img');
    img.src = imgSrc;
    bub.appendChild(img);
  }
  const span = document.createElement('span');
  span.textContent = content;
  bub.appendChild(span);
  if (role === 'user') { row.appendChild(bub); row.appendChild(av); }
  else { row.appendChild(av); row.appendChild(bub); }
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bub;
}

function addTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = 'typingRow';
  const av = document.createElement('div');
  av.className = 'avatar';
  av.textContent = '👨‍⚕️';
  const ind = document.createElement('div');
  ind.className = 'typing-indicator';
  ind.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  row.appendChild(av);
  row.appendChild(ind);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typingRow');
  if (el) el.remove();
}

function typewriterEffect(text) {
  const row = document.createElement('div');
  row.className = 'msg-row';
  const av = document.createElement('div');
  av.className = 'avatar';
  av.textContent = '👨‍⚕️';
  const bub = document.createElement('div');
  bub.className = 'bubble ai';
  row.appendChild(av);
  row.appendChild(bub);
  chatMessages.appendChild(row);
  let i = 0;
  const interval = setInterval(() => {
    bub.textContent = text.slice(0, i);
    i++;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (i > text.length) clearInterval(interval);
  }, 14);
}

// ============================================================
// GỬI TIN NHẮN → CLOUDFLARE WORKER
// ============================================================
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 110) + 'px';
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text && !pendingImage) return;

  addMessage('user', text || '📷 [Ảnh răng]', pendingImage || null);
  input.value = '';
  autoResize(input);

  const imgBase64 = pendingImageBase64;
  const imgMime = pendingImageMime || 'image/jpeg';
  const hadImage = !!pendingImage;
  clearImagePreview();

  const parts = [];
  if (hadImage && imgBase64) {
    parts.push({ inline_data: { mime_type: imgMime, data: imgBase64 } });
  }
  parts.push({ text: text || 'Hãy phân tích hình ảnh răng này và đưa ra chẩn đoán sơ bộ.' });

  conversationHistory.push({ role: 'user', parts });
  if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);

  updateActivity();

  const sendBtn = document.querySelector('.send-btn');
  sendBtn.disabled = true;
  sendBtn.style.opacity = '0.5';
  addTypingIndicator();

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: getSystemPrompt() }] },
        contents: conversationHistory
      })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (data.error) {
      addMessage('ai', '❌ Lỗi: ' + data.error.message);
      conversationHistory.pop();
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Xin lỗi, mình chưa hiểu rõ câu hỏi. Bạn có thể mô tả chi tiết hơn không?';

    conversationHistory.push({ role: 'model', parts: [{ text: reply }] });
    typewriterEffect(reply);

  } catch (err) {
    removeTypingIndicator();
    addMessage('ai', '❌ Không thể kết nối. Vui lòng thử lại sau.');
    conversationHistory.pop();
  } finally {
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
  }
}

// ============================================================
// UPLOAD ẢNH
// ============================================================
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    pendingImage = dataUrl;
    pendingImageBase64 = dataUrl.split(',')[1];
    pendingImageMime = file.type || 'image/jpeg';
    showImagePreview(dataUrl);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function showImagePreview(src) {
  const wrap = document.getElementById('imgPreviewWrap');
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="img-preview-wrap">
      <img class="img-preview" src="${src}" alt="preview">
      <div class="img-remove" onclick="clearImagePreview()">✕</div>
    </div>`;
}

function clearImagePreview() {
  pendingImage = null;
  pendingImageBase64 = null;
  pendingImageMime = null;
  const wrap = document.getElementById('imgPreviewWrap');
  wrap.style.display = 'none';
  wrap.innerHTML = '';
}

// ============================================================
// MODAL ĐẶT LỊCH
// ============================================================
function openModal() { document.getElementById('modalOverlay').classList.add('active'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }
function handleModalClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}
function toggleServicePanel() {
  document.getElementById('servicePanel').classList.toggle('open');
}
function updateServiceCount() {
  const checked = document.querySelectorAll('input[name="service"]:checked').length;
  const badge = document.getElementById('serviceCount');
  badge.textContent = checked;
  if (checked > 0) {
    badge.style.animation = 'none';
    void badge.offsetWidth;
    badge.style.animation = 'badgePop 0.3s ease';
  }
}

async function submitBooking(e) {
  e.preventDefault();
  const name     = document.getElementById('fname').value.trim();
  const addr     = document.getElementById('faddr').value.trim();
  const phone    = document.getElementById('fphone').value.trim();
  const branchEl = document.querySelector('input[name="branch"]:checked');
  const branch   = branchEl ? branchEl.value : 'Chưa chọn cơ sở';
  const services = [...document.querySelectorAll('input[name="service"]:checked')]
    .map(c => c.value).join(', ') || 'Không chọn';

  const subject = encodeURIComponent(`📅 Đặt lịch khám – ${name}`);
  const bodyText = encodeURIComponent(
    `Họ tên: ${name}\nĐịa chỉ: ${addr}\nSĐT: ${phone}\nCơ sở khám: ${branch}\nDịch vụ: ${services}`
  );
  window.open(`mailto:nhakhoathelinh1@gmail.com?subject=${subject}&body=${bodyText}`, '_blank');
  showToast('✅ Đặt lịch thành công! Vui lòng gửi email để xác nhận.');

  closeModal();
  document.getElementById('bookingForm').reset();
  document.getElementById('serviceCount').textContent = '0';
  document.getElementById('servicePanel').classList.remove('open');
  document.querySelectorAll('.branch-opt').forEach(el => el.classList.remove('selected'));
}

// Branch radio highlight
document.addEventListener('change', (e) => {
  if (e.target.name === 'branch') {
    document.querySelectorAll('.branch-opt').forEach(el => el.classList.remove('selected'));
    e.target.closest('.branch-opt').classList.add('selected');
  }
});

// Map tab switch
function switchMap(index, btn) {
  document.querySelectorAll('.map-frame').forEach((f, i) => {
    f.style.display = i === index ? 'block' : 'none';
  });
  document.querySelectorAll('.map-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3800);
}
