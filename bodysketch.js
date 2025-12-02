let bodySegmentation;
let video;
let segmentation;
let options = {
  maskType: "person",
};

// ─────────────────────────────
//  한글 실루엣 설정
// ─────────────────────────────
let sentenceMap = [];
let gridX = 10; // 한글 문장 시작 후보 간격
let gridY = 20; // 한글 줄 간격
let minGap = 1; // 같은 줄에서 문장 블록 간 최소 간격

let hangulChars = [
  "안녕하세요",
  "반갑습니다",
  "감사합니다",
  "또 만나요",
  "얼마인가요?",
  "한국에서 왔어요",
  "날씨가 좋아요",
  "맛있어요",
  "역까지 어떻게 가나요?",
  "네",
  "아니요",
  "괜찮습니다",
  "배고파요",
  "까르푸가 어디있나요?",
  "화장실 있나요?",
  "프랑스어 할 줄 몰라요",
  "프랑스어 못해요",
  "한국인입니다.",
  "남한이요",
  "영어 할 줄 아세요?",
];

// ─────────────────────────────
//  프랑스어 파티클 설정
// ─────────────────────────────
let frenchTexts = [
  "Bonjour",
  "Ravi de vous rencontrer",
  "Merci",
  "À bientôt",
  "Ça coûte combien ?",
  "Je viens de Corée",
  "Il fait beau",
  "C’est délicieux",
  "Comment aller à la gare ?",
  "Oui",
  "Non",
  "Ça va",
  "J’ai faim",
  "Où se trouve Carrefour ?",
  "Un croissant, s’il vous plaît.",
  "Un café, s’il vous plaît.",
  "L’addition, s’il vous plaît.",
  "Je voudrais ceci.",
  "Où est la gare ?",
  "Où est le métro ?",
  "Je suis perdu(e).",
  "C’est loin ?",
  "Bonsoir",
  "Ça va bien.",
  "Merci beaucoup",
  "Pardon",
  "Excusez-moi",
  "Je ne parle pas bien français",
  "Parlez-vous anglais ?",
  "Je suis étudiant(e).",
  "C’est très bon.",
  "J’ai froid.",
  "J’ai chaud.",
];

let frenchParticles = [];
let NUM_FRENCH = 200; // 프랑스어 텍스트 개수

// 카메라 / 씬 상태
let camReady = false;
let sceneReady = false; // 해상도/화면비에 맞춰 초기화 했는지 여부

function preload() {
  bodySegmentation = ml5.bodySegmentation("BodyPix", options);
}

// ─────────────────────────────
//  setup
// ─────────────────────────────
function setup() {
  // 일단 기본 캔버스 (임시). 나중에 카메라 비율에 맞게 리사이즈할 거라 값은 크게 중요 X
  createCanvas(640, 480);

  video = createCapture(VIDEO, () => {
    camReady = true;
  });
  video.hide();

  textFont("Gothic A1, sans-serif");
  textAlign(LEFT, CENTER);
  noStroke();
}

// ─────────────────────────────
//  카메라 화면비에 맞춰 씬 초기화
// ─────────────────────────────
function initScene() {
  // 이 시점에서 width, height는 이미 카메라 화면비에 맞는 타겟 해상도
  sentenceMap = [];
  frenchParticles = [];

  // ── 한글 sentenceMap: 그리드별 문장을 "한 번만" 랜덤 배치 + 문장별 랜덤 폰트 사이즈
  let cols = ceil(width / gridX);
  let rows = ceil(height / gridY);

  for (let gy = 0; gy < rows; gy++) {
    sentenceMap[gy] = [];
    for (let gx = 0; gx < cols; gx++) {
      sentenceMap[gy][gx] = {
        text: random(hangulChars),
        size: random(10, 20), // 문장별 랜덤 폰트 크기
      };
    }
  }

  // ── 프랑스어 파티클 초기화
  let frenchSize = 15;
  textSize(frenchSize);

  for (let i = 0; i < NUM_FRENCH; i++) {
    let x = random(width);
    let y = random(height);
    let sentence = random(frenchTexts);

    let w = textWidth(sentence);
    let h = textAscent() + textDescent(); // 실제 텍스트 높이

    frenchParticles.push({
      baseX: x,
      baseY: y,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      text: sentence,
      size: frenchSize,
      w: w,
      h: h,
    });
  }

  // 카메라/해상도 세팅 끝난 뒤 세그멘테이션 시작
  bodySegmentation.detectStart(video, gotResults);

  sceneReady = true;
}

// ─────────────────────────────
//  draw
// ─────────────────────────────
function draw() {
  background(0, 0, 145);

  // 카메라 준비 안 됐을 때
  if (!camReady || video.elt.videoWidth === 0 || video.elt.videoHeight === 0) {
    fill(225, 0, 15);
    textAlign(LEFT, TOP);
    text("camera loading...", 20, 20);
    return;
  }

  // 씬을 아직 카메라 화면비/축소 해상도로 세팅 안 했으면 여기서 1회만
  if (!sceneReady) {
    let camW = video.elt.videoWidth;
    let camH = video.elt.videoHeight;

    // 1) 카메라 화면비 계산
    let aspect = camW / camH;

    // 🔥 해상도는 줄이고, 화면비만 유지
    // 가로 기준: 640px
    let baseWidth = 640;
    let targetW = baseWidth;
    let targetH = round(baseWidth / aspect);

    // (원하면 세로 기준 480으로 하고 싶으면 이걸 대신 사용)
    // let baseHeight = 480;
    // let targetH = baseHeight;
    // let targetW = round(baseHeight * aspect);

    resizeCanvas(targetW, targetH);
    video.size(targetW, targetH);

    initScene();
  }

  if (!segmentation) {
    // 세그멘테이션 전에도 프랑스어 파티클은 보여주기
    drawFrenchParticles(null);
    fill(255);
    textAlign(LEFT, TOP);
    text("segmenting...", 20, 20);
    return;
  }

  // 1) segmentation.mask → 현재 캔버스 크기에 맞춘 사람 마스크
  let src = segmentation.mask;
  let maskImg = createImage(width, height);
  maskImg.copy(src, 0, 0, src.width, src.height, 0, 0, width, height);
  maskImg.loadPixels();

  // 네 환경 기준: alpha === 0 이 사람 영역
  for (let i = 0; i < maskImg.pixels.length; i += 4) {
    let a = maskImg.pixels[i + 3];
    let isPerson = a === 0;

    if (isPerson) {
      maskImg.pixels[i + 0] = 255;
      maskImg.pixels[i + 1] = 255;
      maskImg.pixels[i + 2] = 255;
      maskImg.pixels[i + 3] = 255;
    } else {
      maskImg.pixels[i + 0] = 0;
      maskImg.pixels[i + 1] = 0;
      maskImg.pixels[i + 2] = 0;
      maskImg.pixels[i + 3] = 255;
    }
  }

  maskImg.updatePixels();
  let personMask = maskImg;
  personMask.loadPixels();

  // 2) 프랑스어 파티클 업데이트 + 충돌 + 렌더
  drawFrenchParticles(personMask);

  // 3) 한글 실루엣 렌더
  drawHangulSilhouette(personMask);
}

// ─────────────────────────────
//  프랑스어 텍스트 박스가 실루엣(사람 마스크)과 겹치는지 검사
// ─────────────────────────────
function isFrenchInsideSilhouette(p, personMask, nearThreshold) {
  let halfW = p.w * 0.5;
  let halfH = p.h * 0.5;

  let samplePoints = [
    { x: p.x, y: p.y }, // center
    { x: p.x - halfW, y: p.y }, // left
    { x: p.x + halfW, y: p.y }, // right
    { x: p.x, y: p.y - halfH }, // top
    { x: p.x, y: p.y + halfH }, // bottom
  ];

  for (let s of samplePoints) {
    let sx = int(constrain(s.x, 0, width - 1));
    let sy = int(constrain(s.y, 0, height - 1));

    let flippedX = width - 1 - sx;
    if (flippedX < 0 || flippedX >= width) continue;

    let idx = (sy * width + flippedX) * 4;
    let r = personMask.pixels[idx];

    if (r > nearThreshold) {
      return true;
    }
  }

  return false;
}

// ─────────────────────────────
//  프랑스어 파티클
// ─────────────────────────────
function drawFrenchParticles(personMask) {
  textFont("Gothic A1, sans-serif");
  textAlign(CENTER, CENTER);
  fill(255,0,0);

  let repelStrength = 30; // 사람(실루엣) 안에 있을 때 밀어내는 힘
  let friction = 0.9;     // 속도 감쇠
  let nearThreshold = 100;
  let homeForce = 0.01;   // 원래 자리(baseX, baseY)로 돌아가려는 힘

  // 1) 각 파티클 힘/위치 업데이트
  for (let p of frenchParticles) {
    let influenced = false;

    if (personMask) {
      let inside = isFrenchInsideSilhouette(p, personMask, nearThreshold);

      if (inside) {
        influenced = true;

        // 지금은 화면 중앙 기준으로 바깥으로 밀어냄
        let dirX = p.x - width / 2;
        let dirY = p.y - height / 2;
        let len = sqrt(dirX * dirX + dirY * dirY);
        if (len === 0) len = 1;
        dirX /= len;
        dirY /= len;

        p.vx += dirX * repelStrength;
        p.vy += dirY * repelStrength;
      }
    }

    if (!influenced) {
      // 자기 집(baseX, baseY)으로 돌아가려는 힘
      p.vx += (p.baseX - p.x) * homeForce;
      p.vy += (p.baseY - p.y) * homeForce;
    }

    p.vx *= friction;
    p.vy *= friction;
    p.x += p.vx;
    p.y += p.vy;
  }

  // 2) 프랑스어끼리 충돌 처리
  let iterations = 3;
  for (let k = 0; k < iterations; k++) {
    for (let i = 0; i < frenchParticles.length; i++) {
      for (let j = i + 1; j < frenchParticles.length; j++) {
        resolveFrenchCollision(frenchParticles[i], frenchParticles[j]);
      }
    }
  }

  // 3) 화면 밖 너무 멀리 나가지 않게 + 렌더
  for (let p of frenchParticles) {
    if (p.x < -200) p.x = -200;
    if (p.x > width + 200) p.x = width + 200;
    if (p.y < -200) p.y = -200;
    if (p.y > height + 200) p.y = height + 200;

    textSize(p.size);
    text(p.text, p.x, p.y);
  }
}

// ─────────────────────────────
//  프랑스어끼리 충돌 처리
// ─────────────────────────────
function resolveFrenchCollision(a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;

  let halfW = (a.w + b.w) * 0.5;
  let halfH = (a.h + b.h) * 0.5;

  if (abs(dx) < halfW && abs(dy) < halfH) {
    let overlapX = halfW - abs(dx);
    let overlapY = halfH - abs(dy);

    if (overlapX < overlapY) {
      if (dx > 0) {
        a.x -= overlapX * 0.5;
        b.x += overlapX * 0.5;
      } else {
        a.x += overlapX * 0.5;
        b.x -= overlapX * 0.5;
      }

      let bounce = 0.3;
      let tempVx = a.vx;
      a.vx = -b.vx * bounce;
      b.vx = -tempVx * bounce;
    } else {
      if (dy > 0) {
        a.y -= overlapY * 0.6;
        b.y += overlapY * 0.6;
      } else {
        a.y += overlapY * 0.6;
        b.y -= overlapY * 0.6;
      }

      let bounce = 0.3;
      let tempVy = a.vy;
      a.vy = -b.vy * bounce;
      b.vy = -tempVy * bounce;
    }
  }
}

// ─────────────────────────────
//  한글 실루엣
// ─────────────────────────────
function drawHangulSilhouette(personMask) {
  if (!personMask || sentenceMap.length === 0) return;

  textFont("Gothic A1, sans-serif");
  textAlign(LEFT, CENTER);
  fill(255);

  let threshold = 28;
  let rows = sentenceMap.length;
  let cols = sentenceMap[0].length;

  for (let y = 0; y < height; y += gridY) {
    let gy = int(y / gridY);
    if (gy < 0 || gy >= rows) continue;

    let lastEndX = -999;

    for (let x = 0; x < width; x += gridX) {
      let gx = int(x / gridX);
      if (gx < 0 || gx >= cols) continue;

      let sentenceObj = sentenceMap[gy][gx];
      let sentence = sentenceObj.text;
      let fontSize = sentenceObj.size;

      textSize(fontSize);

      if (x <= lastEndX + minGap) continue;

      let flippedX = width - 1 - x;
      if (flippedX < 0 || flippedX >= width) continue;

      let idx = (y * width + flippedX) * 4;
      let r = personMask.pixels[idx];

      if (r <= threshold) continue;

      let currentX = x;

      for (let i = 0; i < sentence.length; i++) {
        let ch = sentence[i];
        let w = textWidth(ch);

        let sampleX = currentX + w * 0.5;
        if (sampleX >= width) break;

        let checkFlippedX = width - 1 - int(sampleX);
        if (checkFlippedX < 0 || checkFlippedX >= width) break;

        let checkIdx = (y * width + checkFlippedX) * 4;
        let checkR = personMask.pixels[checkIdx];

        if (checkR <= threshold) break;

        text(ch, currentX, y);
        currentX += w;
      }

      lastEndX = currentX;
    }
  }
}

// ─────────────────────────────
//  BodyPix 콜백
// ─────────────────────────────
function gotResults(result) {
  segmentation = result;
}

function goFullscreen() {
  let elem = document.documentElement;
  if (elem.requestFullscreen) elem.requestFullscreen();
  else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
  else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
}