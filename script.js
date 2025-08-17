// === DOM (그대로) ===
const startBtn = document.getElementById("start-button");
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const endScreen = document.getElementById("ending-screen");
const endingVideo = document.getElementById("ending-video");

const character = document.getElementById("character");
const products = document.getElementById("products");
const hint = document.getElementById("hint");

// FX 레이어 추가 (애니메이션 전용)
let fxLayer = document.getElementById('fx-layer');
if (!fxLayer) {
    fxLayer = document.createElement('div');
    fxLayer.id = 'fx-layer';
    gameScreen.appendChild(fxLayer);
}

// === 상태 (그대로) ===
let stage = 1;
const STAGE_MAX = 4;
let applied = new Set();
let transitioning = false;

// === 배경 로더 (그대로 + 오류 토스트) ===
function setBG(url) {
    const img = new Image();
    img.onload = () => { gameScreen.style.backgroundImage = `url(${url})`; };
    img.onerror = () => alert(`배경을 찾을 수 없습니다:\n${url}\n(경로/대소문자/확장자 확인)`);
    img.src = url;
}

// === 스테이지 정의 (네 경로 유지; 필요 시 .jpg.jpeg) ===
const stages = {
    1: {
        bg: "./assets/images/backgrounds/bg_bedroom.jpeg",
        char: "./assets/images/character/character_step_1.png",
        items: [
            { id: "icon_sleepmist.png", label: "수면 미스트", effect: "mist" },
            { id: "icon_aroma_oil.png", label: "아로마 오일", effect: "spark" }
        ],
        nextChar: "./assets/images/character/character_step_2.png",
        hint: "미스트와 오일을 캐릭터로 드래그하세요",
    },
    2: {
        bg: "./assets/images/backgrounds/bg_dressingroom.jpeg",
        char: "./assets/images/character/character_step_2.png",
        items: [
            { id: "icon_massage_cream.png", label: "마사지 크림", effect: "glow" },
            { id: "icon_gua_sha.png", label: "괄사", effect: "stroke" }
        ],
        nextChar: "./assets/images/character/character_step_3.png",
        hint: "크림 먼저 → 그 다음 괄사!",
        order: ["icon_massage_cream.png", "icon_gua_sha.png"], // 순서 제약
    },
    3: {
        bg: "./assets/images/backgrounds/bg_livingroom.jpeg",
        char: "./assets/images/character/character_step_3.png",
        items: [{ id: "icon_diffuser.png", label: "디퓨저", effect: "petal" }],
        nextChar: "./assets/images/character/character_step_4.png",
        hint: "디퓨저를 드래그하여 향기가 퍼뜨리세요",
    },
    4: {
        bg: "./assets/images/backgrounds/bg_bathroom.jpeg",
        char: "./assets/images/character/character_step_4.png",
        items: [{ id: "icon_cleansing_soap.png", label: "클렌징 솝", effect: "bubbles" }],
        nextChar: null,
        hint: "클렌징 솝으로 마무리!",
    },
};

// === 시작 ===
startBtn.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameScreen.style.display = "flex";
    stage = 1; applied.clear(); transitioning = false;
    loadStage(stage);
});

// 공유 버튼 (그대로)
document.getElementById("share-btn")?.addEventListener("click", () => {
    alert("#SwayN #NightRitual 공유하기!");
});

// === 드래그 & 클릭 (그대로) ===
character.addEventListener("dragover", e => e.preventDefault());
character.addEventListener("drop", e => {
    e.preventDefault();
    const file = e.dataTransfer.getData("product");
    if (file) apply(file);
});
products.addEventListener("click", e => {
    const img = e.target.closest("img.product-icon");
    if (!img) return;
    apply(img.dataset.file);
});

// === 패럴랙스(부드럽게, 관성 보간) ===
let targetX = 0, targetY = 0, viewX = 0, viewY = 0;
gameScreen.addEventListener('pointermove', (e) => {
    const r = gameScreen.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width - .5) * 1.0;
    targetY = ((e.clientY - r.top) / r.height - .5) * 1.0;
}, { passive: true });
(function loop() {
    viewX += (targetX - viewX) * 0.08;
    viewY += (targetY - viewY) * 0.08;
    gameScreen.style.backgroundPosition = `${50 + viewX * 4}% ${50 + viewY * 4}%`;
    character.style.transform = `translateY(${-viewY * 6}px) rotateX(${-viewY * 2}deg) rotateY(${viewX * 2}deg)`;
    requestAnimationFrame(loop);
})();

// === 핵심 로직 (그대로 + 등장 애니메이션 클래스 토글) ===
function loadStage(n) {
    const s = stages[n];
    setBG(s.bg);
    character.src = s.char;
    hint.textContent = s.hint || "";
    applied.clear();

    // 제품 트레이 구성
    products.innerHTML = "";
    s.items.forEach(p => {
        const img = document.createElement("img");
        img.src = `./assets/images/products/${p.id}`;
        img.alt = p.label;
        img.title = p.label;
        img.draggable = true;
        img.className = "product-icon";
        img.dataset.file = p.id;
        img.addEventListener("dragstart", e => e.dataTransfer.setData("product", p.id));
        products.appendChild(img);
    });

    // 부드러운 등장
    products.classList.remove('is-in'); hint.classList.remove('is-in');
    requestAnimationFrame(() => { products.classList.add('is-in'); hint.classList.add('is-in'); });
}

function apply(file) {
    if (transitioning) return;
    const s = stages[stage];

    // 2단계 순서 제약
    if (s.order) {
        const idx = s.order.indexOf(file);
        for (let i = 0; i < idx; i++) {
            if (!applied.has(s.order[i])) {
                showHint(`먼저 ${labelOf(s.order[i])}을(를) 적용해주세요`);
                return;
            }
        }
    }

    if (applied.has(file)) return;
    applied.add(file);

    // 아이콘 피드백
    const icon = products.querySelector(`img[data-file="${file}"]`);
    if (icon) icon.style.opacity = 0.35;

    // 이펙트 추가
    const effectType = (s.items.find(p => p.id === file) || {}).effect;
    spawnEffect(effectType);

    // 완료 체크
    const need = s.items.map(p => p.id);
    if (need.every(id => applied.has(id))) advance();
}

function advance() {
    if (transitioning) return;
    transitioning = true;

    const s = stages[stage];
    if (s.nextChar) {
        fadeTo(s.nextChar, () => {
            stage = Math.min(stage + 1, STAGE_MAX);
            loadStage(stage);
            transitioning = false;
        });
    } else {
        // 마지막 → 엔딩
        gameScreen.style.display = "none";
        endScreen.style.display = "flex";

        // 안전한 자동재생 처리 (iOS/모바일 포함)
        const v = endingVideo;
        if (v) {
            v.muted = true;                 // iOS 자동재생 조건
            v.playsInline = true;           // iOS 사파리 인라인 재생
            v.removeAttribute('controls');  // 필요 시 보여줄 예정
            try {
                v.currentTime = 0;            // 처음부터
            } catch (e) { }

            // 소스 확실히 로드 후 재생
            const tryPlay = () => {
                v.play().catch(err => {
                    console.warn('ending video play blocked:', err);
                    // 사용자 제스처 필요할 때 컨트롤 노출
                    v.setAttribute('controls', 'controls');
                });
            };

            // 이미 로드되어 있으면 바로, 아니면 로드 후
            if (v.readyState >= 2) {
                tryPlay();
            } else {
                v.load();
                v.addEventListener('canplaythrough', tryPlay, { once: true });
                // 혹시 로드 이벤트가 안 오면 600ms 뒤 한번 더 시도
                setTimeout(tryPlay, 600);
            }
        }
        transitioning = false;
    }

}

function fadeTo(nextSrc, done) {
    character.style.opacity = "0";
    setTimeout(() => {
        character.src = nextSrc;
        const once = () => {
            character.removeEventListener("load", once);
            requestAnimationFrame(() => {
                character.style.opacity = "1";
                if (done) setTimeout(done, 240);
            });
        };
        character.addEventListener("load", once);
    }, 180);
}

function labelOf(file) {
    const s = stages[stage];
    const f = s.items.find(p => p.id === file);
    return f ? f.label : "";
}

function showHint(msg) {
    hint.textContent = msg;
    hint.style.opacity = "1";
    setTimeout(() => { hint.style.opacity = ".95"; }, 1500);
}

// === 비주얼 이펙트 (가벼운 연출만) ===
function spawnEffect(type) {
    switch (type) {
        case 'mist': fog(); break;
        case 'spark': sparkle(); break;
        case 'glow': faceGlow(); break;
        case 'stroke': massageStroke(); break;
        case 'petal': petals(); break;
        case 'bubbles': bubbles(); break;
        default: break;
    }
}

function fog() {
    const fog = document.createElement('div');
    fog.style.position = 'absolute'; fog.style.inset = '0';
    fog.style.background = 'radial-gradient(ellipse at 50% 60%, rgba(255,255,255,.55), rgba(255,255,255,0) 60%)';
    fog.style.animation = 'mistfade 1300ms ease';
    fxLayer.appendChild(fog);
    setTimeout(() => fog.remove(), 1300);
}

function sparkle() {
    for (let i = 0; i < 8; i++) {
        const s = document.createElement('div');
        s.textContent = '✨';
        s.style.position = 'absolute';
        s.style.left = (50 + (Math.random() * 20 - 10)) + '%';
        s.style.top = (45 + (Math.random() * 20 - 10)) + '%';
        s.style.fontSize = (18 + Math.random() * 10) + 'px';
        s.style.opacity = '0';
        fxLayer.appendChild(s);
        s.animate([
            { transform: 'scale(.5)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1, offset: .5 },
            { transform: 'scale(.5)', opacity: 0 }
        ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
        setTimeout(() => s.remove(), 950);
    }
}

function faceGlow() {
    const g = document.createElement('div');
    g.style.position = 'absolute'; g.style.left = '50%'; g.style.top = '50%';
    g.style.transform = 'translate(-50%,-50%)'; g.style.width = '40vmin'; g.style.height = '40vmin';
    g.style.borderRadius = '50%'; g.style.boxShadow = '0 0 60px 20px rgba(255,255,255,.55)';
    g.style.animation = 'mistfade 1200ms ease';
    fxLayer.appendChild(g);
    setTimeout(() => g.remove(), 1200);
}

function massageStroke() {
    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.left = 'calc(50% - 120px)';
    line.style.top = 'calc(50% - 30px)';
    line.style.width = '240px'; line.style.height = '60px';
    line.style.borderRadius = '999px';
    line.style.border = '3px solid rgba(255,255,255,.7)';
    fxLayer.appendChild(line);
    line.animate([
        { transform: 'translateX(-6px)', opacity: .9 },
        { transform: 'translateX( 6px)', opacity: .9 }
    ], { duration: 900, iterations: 2, direction: 'alternate', easing: 'cubic-bezier(.16,1,.3,1)' });
    setTimeout(() => line.remove(), 1000);
}

function petals() {
    for (let i = 0; i < 10; i++) {
        const p = document.createElement('div');
        p.textContent = '🌸';
        p.style.position = 'absolute';
        p.style.left = (50 + (Math.random() * 28 - 14)) + '%';
        p.style.top = (60 + Math.random() * 10) + '%';
        p.style.fontSize = (18 + Math.random() * 12) + 'px';
        p.style.opacity = '0';
        fxLayer.appendChild(p);
        p.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 0 },
            { transform: 'translate(20px,-40px) rotate(12deg)', opacity: .9, offset: .6 },
            { transform: 'translate(40px,-80px) rotate(25deg)', opacity: 0 }
        ], { duration: 1800 + Math.random() * 400, easing: 'cubic-bezier(.16,1,.3,1)' });
        setTimeout(() => p.remove(), 2100);
    }
}

function bubbles() {
    for (let i = 0; i < 12; i++) {
        const b = document.createElement('div');
        const size = 8 + Math.random() * 14;
        b.style.cssText = `
      position:absolute; left:${50 + (Math.random() * 28 - 14)}%;
      top:${60 + Math.random() * 12}%;
      width:${size}px; height:${size}px; border-radius:50%;
      background:rgba(255,255,255,.95); box-shadow:0 0 6px rgba(255,255,255,.8); opacity:0;`;
        fxLayer.appendChild(b);

        b.animate([
            { transform: 'translateY(8px) scale(.7)', opacity: 0 },
            { transform: 'translateY(-10px) scale(1.1)', opacity: .95, offset: .5 },
            { transform: 'translateY(-24px) scale(1)', opacity: 0 }
        ], { duration: 1200 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.2,1)' });

        setTimeout(() => b.remove(), 1500);
    }
}

//다시하기버튼
document.getElementById('restart-btn')?.addEventListener('click', () => {
    window.location.reload();
});

// --- 타이틀: "게임 설명" 모달 ---
const howtoBtn = document.getElementById('howto-button');
const howtoModal = document.getElementById('howto-modal');
const howtoClose = document.getElementById('howto-close');

howtoBtn?.addEventListener('click', () => howtoModal.classList.add('show'));
howtoClose?.addEventListener('click', () => howtoModal.classList.remove('show'));
howtoModal?.addEventListener('click', (e) => { if (e.target === howtoModal) howtoModal.classList.remove('show'); });
