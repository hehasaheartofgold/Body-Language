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
let gridY = 14; // 한글 줄 간격
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
let NUM_FRENCH = 300; // 🔥 프랑스어 텍스트 개수

function preload() {
  bodySegmentation = ml5.bodySegmentation("BodyPix", options);
}

// ─────────────────────────────
//  setup
// ─────────────────────────────
function setup() {
  createCanvas(640, 480);

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  bodySegmentation.detectStart(video, gotResults);

  // 🔥 여기서 폰트 이름을 문자열로 사용
  // Gothic A1이 로드되면 그걸 쓰고, 실패하면 뒤의 sans-serif로 자동 fallback
  textAlign(LEFT, CENTER);
  textFont("Gothic A1, sans-serif");
  textSize(14);
  noStroke();

  // 🔥 한글 sentenceMap: 그리드별 문장을 "한 번만" 랜덤 배치
  let cols = ceil(width / gridX);
  let rows = ceil(height / gridY);
  for (let gy = 0; gy < rows; gy++) {
    sentenceMap[gy] = [];
    for (let gx = 0; gx < cols; gx++) {
      sentenceMap[gy][gx] = random(hangulChars);
    }
  }

  // 🔥 프랑스어 파티클: 랜덤 위치 + 자기 "집" 위치 기록 + bbox 계산
  let frenchSize = 15; // 프랑스 텍스트 크기
  textSize(frenchSize); // textWidth가 정확한 폭 계산하도록 설정

  for (let i = 0; i < NUM_FRENCH; i++) {
    let x = random(width);
    let y = random(height);
    let sentence = random(frenchTexts);

    // 웹폰트 / 기본폰트 상관없이 textWidth로 폭 계산
    let w = textWidth(sentence);
    let h = frenchSize * 1.5; // 대략적인 높이

    frenchParticles.push({
      baseX: x, // 집 위치(센터)
      baseY: y,
      x: x, // 현재 위치(센터)
      y: y,
      vx: 0,
      vy: 0,
      text: sentence,
      size: frenchSize,
      w: w,
      h: h,
    });
  }
}

// ─────────────────────────────
//  draw
// ─────────────────────────────
function draw() {
  background(0);

  if (!segmentation) {
    drawFrenchParticles(null); // 세그먼트 안 됐을 때도 배경 보여줌
    fill(255);
    textAlign(LEFT, TOP);
    text("loading...", 20, 20);
    return;
  }

  // 1) segmentation.mask → 흑백 사람 마스크
  let src = segmentation.mask;
  let maskImg = createImage(src.width, src.height);
  maskImg.copy(src, 0, 0, src.width, src.height, 0, 0, src.width, src.height);
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
//  프랑스어 텍스트 박스가 실루엣과 겹치는지 검사
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
  fill(30, 144, 255);

  let repelStrength = 8;
  let friction = 0.9;
  let nearThreshold = 100;
  let homeForce = 0.01;

  // 1) 각 파티클 힘/위치 업데이트
  for (let p of frenchParticles) {
    let influenced = false;

    if (personMask) {
      let inside = isFrenchInsideSilhouette(p, personMask, nearThreshold);

      if (inside) {
        influenced = true;

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
  textFont("Gothic A1, sans-serif");
  textAlign(LEFT, CENTER);
  textSize(14);
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

      let sentence = sentenceMap[gy][gx];

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

        if (currentX >= width) break;

        let sampleX = currentX + w * 0.5;
        if (sampleX >= width) break;

        let checkFlippedX = width - 1 - int(sampleX);
        if (checkFlippedX < 0 || checkFlippedX >= width) break;

        let checkIdx = (y * width + checkFlippedX) * 4;
        let checkR = personMask.pixels[checkIdx];

        if (checkR <= threshold) {
          break;
        }

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