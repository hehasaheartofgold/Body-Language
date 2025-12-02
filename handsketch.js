// ─────────────────────────────
//  Handpose + Floating Text Particles with Collision & Home Return
//  (카메라 화면비 유지 + 해상도 다운스케일 버전)
// ─────────────────────────────

let handPose;
let video;
let hands = [];
let connections;

// 화면비 대응용 상태
let camReady = false;
let sceneReady = false;

// ★ 로컬 loadFont() 제거 → 대신 이름만 문자열로 사용
let fontName = "Gothic A1, sans-serif";

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

let frenchChars = [
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

let letters = [];

// ─────────────────────────────
//  preload
// ─────────────────────────────
function preload() {
  handPose = ml5.handPose({ flipped: true });
  connections = handPose.getConnections();
}

// ─────────────────────────────
//  setup
// ─────────────────────────────
function setup() {
  // 임시 캔버스, 나중에 카메라 화면비에 맞춰서 변경
  createCanvas(640, 480);

  // flipped: true 옵션은 그대로 두되, 콜백으로 camReady 세팅
  video = createCapture(
    { video: true, audio: false }, 
    () => {
      camReady = true;
    }
  );
  // 위 constraints가 마음에 안 들면 그냥 VIDEO만 써도 됨:
  // video = createCapture(VIDEO, () => { camReady = true; });

  video.hide();

  textFont(fontName);
  textAlign(CENTER, CENTER);
}

// ─────────────────────────────
//  카메라 화면비 기반으로 씬 초기화
// ─────────────────────────────
function initScene() {
  letters = [];

  // 글자들 생성 (이 시점에서 width/height는 targetW/targetH)
  spawnLetters();

  // 캔버스/영상 해상도 세팅이 끝난 뒤에 handpose 시작
  handPose.detectStart(video, gotHands);

  sceneReady = true;
}

// ─────────────────────────────
//  draw
// ─────────────────────────────
function draw() {
  background(0,255,0);

  // 카메라 준비 안 됐거나 메타데이터(해상도) 아직 없으면 대기
  if (!camReady || video.elt.videoWidth === 0 || video.elt.videoHeight === 0) {
    fill(255);
    textAlign(LEFT, TOP);
    text("camera loading...", 20, 20);
    return;
  }

  // 아직 화면비 / 해상도에 맞춘 초기화 전이라면 → 여기서 한 번만 설정
  if (!sceneReady) {
    let camW = video.elt.videoWidth;
    let camH = video.elt.videoHeight;

    // 카메라 화면비
    let aspect = camW / camH;

    // 🔥 가로 기준: 640px에 맞추되, 화면비 유지
    let baseWidth = 640;
    let targetW = baseWidth;
    let targetH = round(baseWidth / aspect);

    // (또는 세로 기준)
    // let baseHeight = 480;
    // let targetH = baseHeight;
    // let targetW = round(baseHeight * aspect);

    resizeCanvas(targetW, targetH);
    video.size(targetW, targetH);

    initScene();
  }

  // 여기부터는 sceneReady가 true라고 가정
  drawSkeleton();
  drawKeypoints();
  updateAndDrawLetters();
}

// ─────────────────────────────
//  Skeleton
// ─────────────────────────────
function drawSkeleton() {
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];

    // 기본 스켈레톤
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = hand.keypoints[pointAIndex];
      let pointB = hand.keypoints[pointBIndex];

      stroke(255, 255, 0);
      strokeWeight(2);
      line(pointA.x, pointA.y, pointB.x, pointB.y);
    }

    // MCP 라인
    let thumbMCP = hand.keypoints[2];
    let indexMCP = hand.keypoints[5];
    let middleMCP = hand.keypoints[9];
    let ringMCP = hand.keypoints[13];
    let pinkyMCP = hand.keypoints[17];

    stroke(255, 200, 0);
    strokeWeight(3);
    line(thumbMCP.x, thumbMCP.y, indexMCP.x, indexMCP.y);
    line(indexMCP.x, indexMCP.y, middleMCP.x, middleMCP.y);
    line(middleMCP.x, middleMCP.y, ringMCP.x, ringMCP.y);
    line(ringMCP.x, ringMCP.y, pinkyMCP.x, pinkyMCP.y);
  }
}

function getPalmCenter(hand) {
  let p2 = hand.keypoints[2];
  let p5 = hand.keypoints[5];
  let p9 = hand.keypoints[9];
  let p13 = hand.keypoints[13];
  let p17 = hand.keypoints[17];

  let cx = (p2.x + p5.x + p9.x + p13.x + p17.x) / 5;
  let cy = (p2.y + p5.y + p9.y + p13.y + p17.y) / 5;
  return { x: cx, y: cy };
}

// ─────────────────────────────
//  Keypoints
// ─────────────────────────────
function drawKeypoints() {
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];

    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];
      noStroke();
      fill(255,200,0)
      circle(keypoint.x, keypoint.y, 5);
    }
  }
}

// ─────────────────────────────
//  Letter 클래스
// ─────────────────────────────
class Letter {
  constructor(x, y, ch, type) {
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.char = ch;
    this.type = type;

    this.size = random(8, 16);
    this.vx = random(-5, 5);
    this.vy = random(-5, 5);

    if (type === "hangul") {
      this.friction = 0.98;
      this.baseAlpha = 255;
      this.orbitRadius = random(60, 120);
      this.orbitAngle = random(TWO_PI);
    } else {
      this.friction = 0.995;
      this.baseAlpha = 255;
    }

    this.alpha = this.baseAlpha;
    this.tension = 0;

    textSize(this.size);
    this.w = textWidth(this.char);
    this.h = this.size * 1.2;
  }

  update() {
    this.vx += random(-0.05, 0.05);
    this.vy += random(-0.05, 0.05);

    this.vx *= this.friction;
    this.vy *= this.friction;

    let halfW = this.w * 0.5;
    let halfH = this.h * 0.5;

    if (this.x - halfW < 0) {
      this.x = halfW; this.vx *= -0.6;
    }
    if (this.x + halfW > width) {
      this.x = width - halfW; this.vx *= -0.6;
    }
    if (this.y - halfH < 0) {
      this.y = halfH; this.vy *= -0.6;
    }
    if (this.y + halfH > height) {
      this.y = height - halfH; this.vy *= -0.6;
    }
  }

  interactWithHand() {
    let influenced = false;

    for (let h = 0; h < hands.length; h++) {
      let hand = hands[h];
      let palm = getPalmCenter(hand);

      // ---- 한글: 손가락 → 손바닥으로 전환하는 궤도 ----
      if (this.type === "hangul") {
        let tip = hand.keypoints[8];
        let dxTip = tip.x - this.x;
        let dyTip = tip.y - this.y;
        let dTip = sqrt(dxTip * dxTip + dyTip * dyTip);

        let range = 130;
        let switchDist = 120;

        if (dTip < range) {
          influenced = true;

          let cx, cy;
          if (dTip > switchDist) {
            cx = tip.x; cy = tip.y;
          } else {
            cx = palm.x; cy = palm.y;
          }

          this.orbitAngle += 0.02;
          let targetX = cx + cos(this.orbitAngle) * this.orbitRadius;
          let targetY = cy + sin(this.orbitAngle) * this.orbitRadius;

          this.x = lerp(this.x, targetX, 0.08);
          this.y = lerp(this.y, targetY, 0.08);

          this.tension = lerp(this.tension, 1, 0.2);
          this.alpha = lerp(this.alpha, 255, 0.2);
        }
      }

      // ---- 프랑스어: 손을 피해 멀어짐 ----
      if (this.type === "french") {
        for (let j = 0; j < hand.keypoints.length; j++) {
          let kp = hand.keypoints[j];
          let dx = kp.x - this.x;
          let dy = kp.y - this.y;
          let d = sqrt(dx * dx + dy * dy);

          let range = 190;
          if (d < range && d > 0.0001) {
            influenced = true;
            let t = 1 - d / range;
            let force = 0.05 * t;
            this.x -= dx * force;
            this.y -= dy * force;
            this.alpha = lerp(this.alpha, 200, 0.2);
          }
        }
      }
    }

    // ---- 손 영향 안 받을 때 원래 곳으로 복귀 ----
    if (!influenced) {
      let backForce = this.type === "hangul" ? 0.015 : 0.02;
      this.x += (this.homeX - this.x) * backForce;
      this.y += (this.homeY - this.y) * backForce;
      this.tension = lerp(this.tension, 0, 0.05);
    }

    this.alpha = lerp(this.alpha, this.baseAlpha, 0.02);
  }

  draw() {
    textFont(fontName);
    textSize(this.size);

    const baseR = 0;
    const baseG = 0;
    const baseB = 255;

    let r = baseR, g = baseG, b = baseB;

    if (this.type === "hangul") {
      const hotR = 255, hotG = 0, hotB = 0;
      r = lerp(baseR, hotR, this.tension);
      g = lerp(baseG, hotG, this.tension);
      b = lerp(baseB, hotB, this.tension);
    }

    fill(r, g, b, this.alpha);
    text(this.char, this.x, this.y);
  }
}

// ─────────────────────────────
//  글자 생성
// ─────────────────────────────
function spawnLetters() {
  for (let i = 0; i < 50; i++) {
    letters.push(
      new Letter(random(width), random(height), random(hangulChars), "hangul")
    );
  }
  for (let i = 0; i < 100; i++) {
    letters.push(
      new Letter(random(width), random(height), random(frenchChars), "french")
    );
  }
}

// ─────────────────────────────
//  업데이트 + 충돌 + 렌더
// ─────────────────────────────
function updateAndDrawLetters() {
  for (let p of letters) {
    p.update();
    p.interactWithHand();
  }

  let iterations = 6;
  for (let k = 0; k < iterations; k++) {
    for (let i = 0; i < letters.length; i++) {
      for (let j = i + 1; j < letters.length; j++) {
        resolveLetterCollision(letters[i], letters[j]);
      }
    }
  }

  for (let p of letters) {
    p.draw();
  }
}

// ─────────────────────────────
//  텍스트 충돌
// ─────────────────────────────
function resolveLetterCollision(a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;

  let halfW = (a.w + b.w) * 0.5 * 0.9;
  let halfH = (a.h + b.h) * 0.5 * 0.9;

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
      let temp = a.vx;
      a.vx = -b.vx * 0.3;
      b.vx = -temp * 0.3;
    } else {
      if (dy > 0) {
        a.y -= overlapY * 0.5;
        b.y += overlapY * 0.5;
      } else {
        a.y += overlapY * 0.5;
        b.y -= overlapY * 0.5;
      }
      let temp = a.vy;
      a.vy = -b.vy * 0.3;
      b.vy = -temp * 0.3;
    }
  }
}

// ─────────────────────────────
//  Handpose callback
// ─────────────────────────────
function gotHands(results) {
  hands = results;
}

// 클릭 이벤트
function mousePressed() {
  letters.push(new Letter(mouseX, mouseY, random(hangulChars), "hangul"));
  letters.push(new Letter(mouseX, mouseY - 40, random(frenchChars), "french"));
}

function goFullscreen() {
  let elem = document.documentElement;
  if (elem.requestFullscreen) elem.requestFullscreen();
  else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
  else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
}