// DOM
const startBtn = document.getElementById("start-button");
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const endScreen = document.getElementById("ending-screen");
const endingVideo = document.getElementById("ending-video");

const character = document.getElementById("character");
const products = document.getElementById("products");
const hint = document.getElementById("hint");

// 상태
let stage = 1;
const STAGE_MAX = 4;
let applied = new Set();
let transitioning = false; // 중복 전환 방지

// 스테이지 정의 (반드시 ./assets/… 상대경로 유지)
const stages = {
    1: {
        bg: "./assets/images/backgrounds/bg_bedroom.jpeg",
        char: "./assets/images/character/character_step_1.png",
        items: [
            { id: "icon_sleepmist.png", label: "수면 미스트" },
            { id: "icon_aroma_oil.png", label: "아로마 오일" },
        ],
        nextChar: "./assets/images/character/character_step_2.png",
        hint: "미스트와 오일을 캐릭터로 드래그하세요",
    },
    2: {
        bg: "./assets/images/backgrounds/bg_dressingroom.jpeg",
        char: "./assets/images/character/character_step_2.png",
        items: [
            { id: "icon_massage_cream.png", label: "마사지 크림" },
            { id: "icon_gua_sha.png", label: "괄사" },
        ],
        nextChar: "./assets/images/character/character_step_3.png",
        hint: "크림 먼저 → 그 다음 괄사!",
        order: ["icon_massage_cream.png", "icon_gua_sha.png"], // 순서 제약
    },
    3: {
        bg: "./assets/images/backgrounds/bg_livingroom.jpeg",
        char: "./assets/images/character/character_step_3.png",
        items: [{ id: "icon_diffuser.png", label: "디퓨저" }],
        nextChar: "./assets/images/character/character_step_4.png",
        hint: "디퓨저를 드래그하여 향기를 퍼뜨리세요",
    },
    4: {
        bg: "./assets/images/backgrounds/bg_bathroom.jpeg",
        char: "./assets/images/character/character_step_4.png",
        items: [{ id: "icon_cleansing_soap.png", label: "클렌징 솝" }],
        nextChar: null,
        hint: "클렌징 솝으로 마무리!",
    },
};

// 시작
startBtn.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameScreen.style.display = "flex";
    stage = 1;
    applied.clear();
    transitioning = false;
    loadStage(stage);
});

// 공유(옵션)
document.getElementById("share-btn")?.addEventListener("click", () => {
    alert("#SwayN #NightRitual 공유하기!");
});

// 드래그&드롭 + 클릭 대체
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

// 함수들
function loadStage(n) {
    const s = stages[n];
    gameScreen.style.backgroundImage = `url(${s.bg})`;
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
}

function apply(file) {
    if (transitioning) return;
    const s = stages[stage];

    // 2단계 순서 제약 확인
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

    const icon = products.querySelector(`img[data-file="${file}"]`);
    if (icon) icon.style.opacity = 0.35;

    const need = s.items.map(p => p.id);
    if (need.every(id => applied.has(id))) advance();
}

function advance() {
    if (transitioning) return;
    transitioning = true;

    const s = stages[stage];
    if (s.nextChar) {
        fadeTo(s.nextChar, () => {
            stage = Math.min(stage + 1, STAGE_MAX); // 딱 1단계만 증가
            loadStage(stage);
            transitioning = false;
        });
    } else {
        // 마지막 단계 → 엔딩
        gameScreen.style.display = "none";
        endScreen.style.display = "flex";
        try { endingVideo.play(); } catch (e) { }
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
                if (done) setTimeout(done, 250);
            });
        };
        character.addEventListener("load", once);
    }, 200);
}

function labelOf(file) {
    const s = stages[stage];
    const f = s.items.find(p => p.id === file);
    return f ? f.label : "";
}

function showHint(msg) {
    hint.textContent = msg;
    hint.style.opacity = "1";
    setTimeout(() => { hint.style.opacity = ".95"; }, 1600);
}
