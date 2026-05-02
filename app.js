const sourceText = document.querySelector("#sourceText");
const analyzeButton = document.querySelector("#analyze");
const clearButton = document.querySelector("#clearAll");
const loadDemoButton = document.querySelector("#loadDemo");
const raceTitle = document.querySelector("#raceTitle");
const horseCount = document.querySelector("#horseCount");
const runCount = document.querySelector("#runCount");
const matchCount = document.querySelector("#matchCount");
const courseVenueInput = document.querySelector("#courseVenue");
const courseDistanceInput = document.querySelector("#courseDistance");
const courseSurfaceInput = document.querySelector("#courseSurface");
const guessCourseButton = document.querySelector("#guessCourse");
const courseHint = document.querySelector("#courseHint");

const panels = {
  summary: document.querySelector("#summary"),
  ranking: document.querySelector("#ranking"),
  matchups: document.querySelector("#matchups"),
  samecourse: document.querySelector("#samecourse"),
  followup: document.querySelector("#followup"),
  weights: document.querySelector("#weights"),
  runs: document.querySelector("#runs"),
  notes: document.querySelector("#notes"),
};

let currentData = null;
let lastAnalyzedText = "";

const demoText = `JRA 日本中央競馬会
2回東京3日 1R
基本
コウユーニポポニコ
竹内 正洋(美浦)
父：
タリスマニック
母：
トーセンラーク
(母の父：アルデバラン2)
牝3/鹿
52.0kg
▲石田 拓郎
2026年3月21日	中京
牝未勝利
13着	16頭 12番
9番人気
長岡 禎仁	55.0kg
1200ダ
1:15.2
良
454kg
8	103F 39.1
ヴェルジーネ(2.0)
2026年1月24日	京都
未勝利
5着	14頭 4番
7番人気
国分 優作	55.0kg
1200ダ
1:14.7
良
458kg
3	33F 37.2
リアルアルバ(0.6)
2025年12月6日	中山
未勝利
3着	15頭 13番
9番人気
木幡 初也	55.0kg
1200ダ
1:13.4
良
454kg
8	73F 37.8
ビップムーラン(1.2)
タマモチョコチップ
菊沢 隆徳(美浦)
牝3/鹿
55.0kg
原 優介
2026年2月21日	東京
牝未勝利
6着	16頭 10番
13番人気
原 優介	55.0kg
1400ダ
1:27.1
良
456kg
15	153F 36.7
スーパーガール(0.7)
ミエスタ
加藤 征弘(美浦)
牝3/栗
55.0kg
C.ルメール
2026年2月21日	東京
牝未勝利
3着	16頭 4番
10番人気
吉村 誠之助	55.0kg
1400ダ
1:26.8
良
484kg
2	23F 38.4
スーパーガール(0.4)
マーマレードスカイ
堀内 岳志(美浦)
牝3/芦
55.0kg
松岡 正海
2026年3月21日	中山
牝未勝利
2着	16頭 10番
4番人気
松岡 正海	55.0kg
1200ダ
1:13.1
良
404kg
2	23F 38.9
ペイトー(0.2)`;

function normalizeLines(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function firstMatch(text, regex) {
  const hit = String(text || "").match(regex);
  return hit ? hit[1] : "";
}

function toNumber(value) {
  const hit = String(value || "").match(/-?\d+(?:\.\d+)?/);
  return hit ? Number(hit[0]) : null;
}

function finishNo(value) {
  const hit = String(value || "").match(/(\d+)着/);
  return hit ? Number(hit[1]) : null;
}

function marginNo(value) {
  const hit = String(value || "").match(/\((-?\d+(?:\.\d+)?)\)/);
  return hit ? Number(hit[1]) : null;
}

function winnerName(value) {
  return String(value || "").replace(/\((-?\d+(?:\.\d+)?)\)/, "").trim();
}

function distanceMeters(distance) {
  return toNumber(distance);
}

function distanceCategory(distance) {
  const meters = distanceMeters(distance);
  if (!meters) return { name: "不明", threshold: null };
  if (meters <= 1200) return { name: "短距離", threshold: 0.3 };
  if (meters <= 1600) return { name: "マイル", threshold: 0.5 };
  if (meters <= 2200) return { name: "中距離", threshold: 0.7 };
  return { name: "長距離", threshold: 1.0 };
}

function parseCourseKey(value) {
  const text = String(value || "").trim();
  const venue = firstMatch(text, /(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)/);
  const distance = firstMatch(text, /(\d{3,4}[芝ダ障])/);
  return { venue, distance, label: [venue, distance].filter(Boolean).join(" ") };
}

function currentCourseKey() {
  const venue = courseVenueInput.value.trim();
  const meters = courseDistanceInput.value.trim();
  const surface = courseSurfaceInput.value.trim();
  const distance = meters && surface ? `${meters}${surface}` : "";
  return { venue, distance, label: [venue, distance].filter(Boolean).join(" ") };
}

function courseDistanceMeters(course) {
  return distanceMeters(course?.distance || "");
}

function setCourseFromKey(key) {
  const course = parseCourseKey(key);
  courseVenueInput.value = course.venue || "";
  courseDistanceInput.value = firstMatch(course.distance, /(\d{3,4})/) || "";
  courseSurfaceInput.value = firstMatch(course.distance, /(芝|ダ|障)/) || "";
}

function placeGoodLimit(fieldSize) {
  return fieldSize >= 16 ? 5 : 3;
}

function scoreRun(run) {
  let score = 0;
  if (run.finishNo === 1) score += 45;
  else if (run.finishNo && run.finishNo <= 3) score += 35;
  else if (run.finishNo && run.finishNo <= 5) score += 22;
  else if (run.finishNo && run.finishNo <= 9) score += 10;

  if (run.margin !== null && run.margin <= 0.3) score += 35;
  else if (run.margin !== null && run.margin <= 0.7) score += 25;
  else if (run.margin !== null && run.margin <= 1.2) score += 14;
  else if (run.margin !== null && run.margin <= 2.0) score += 6;

  if (run.popularity && run.finishNo) {
    if (run.finishNo < run.popularity) score += 12;
    else if (run.finishNo === run.popularity) score += 5;
    else if (run.finishNo > run.popularity + 4) score -= 8;
  }
  return Math.max(0, Math.min(100, score));
}

function levelLabel(score) {
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  if (score >= 35) return "C";
  return "D";
}

function extractRaceTitle(lines) {
  return lines.find((line) => /\d+回.+\d+日\s+\d+R/.test(line)) || "レース名未取得";
}

function isHorseNameCandidate(line) {
  const text = String(line || "").trim();
  if (!text) return false;
  if (/^\(?\d+\.\d+\.\d+\.\d+\)?/.test(text)) return false;
  if (/万円|^\d+$|^\d+番$|^\d+頭|^\d+着|^\d+kg$|^\d+\.\d+$/.test(text)) return false;
  if (/^(父|母)：|母の父|血統|調教師|騎手|馬主|生産者|単勝|馬体重|性齢|前走|前々走|3走前|4走前|メニュー|基本|拡大|縮小|リセット$/.test(text)) return false;
  if (/(Farm|ファーム|牧場|\(株\)|（株）|有限会社|合同会社|ホース|レーシング|クラブ|組合|HD$|Inc\.?)/i.test(text)) return false;
  if (/^20\d{2}年\d+月\d+日$/.test(text)) return false;
  if (/^(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)$/.test(text)) return false;
  return /[ァ-ヴー一-龠々]/.test(text);
}

function findHorseStarts(lines) {
  const starts = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/(美浦|栗東|地方)[)）]/.test(lines[i]) || lines[i].includes("母の父")) continue;
    for (let j = i - 1; j >= Math.max(0, i - 8); j -= 1) {
      if (isHorseNameCandidate(lines[j])) {
        starts.push(j);
        break;
      }
    }
  }
  return [...new Set(starts)];
}

function parseRun(segment) {
  const run = {
    date: segment[0] || "",
    venue: segment[1] || "",
    className: segment[2] || "",
    finish: segment.find((x) => /\d+着|除外|取消|中止/.test(x)) || "",
    fieldAndGate: segment.find((x) => /\d+頭/.test(x)) || "",
    popularityText: segment.find((x) => /\d+番人気/.test(x)) || "",
    jockey: "",
    carriedWeight: "",
    distance: segment.find((x) => /^\d{3,4}[芝ダ障]/.test(x)) || "",
    time: segment.find((x) => /^\d+:\d{2}\.\d$/.test(x)) || "",
    going: segment.find((x) => /^(良|稍重|重|不良)$/.test(x)) || "",
    bodyWeightText: segment.find((x) => /^\d{3}kg/.test(x)) || "",
    final3f: segment.find((x) => /3F\s*\d+\.\d/.test(x)) || "",
    winnerText: "",
  };

  const weightIndex = segment.findIndex((x) => /^\d{3}kg/.test(x));
  const distanceIndex = segment.findIndex((x) => /^\d{3,4}[芝ダ障]/.test(x));
  if (distanceIndex > 1) {
    const kgBeforeDistance = segment.slice(0, distanceIndex).findIndex((x) => /^\d{2}\.?\d?kg$/.test(x));
    if (kgBeforeDistance > 0) {
      run.carriedWeight = segment[kgBeforeDistance];
      run.jockey = segment[kgBeforeDistance - 1] || "";
    }
  }

  const winnerCandidates = segment.filter((x) => /.+\(-?\d+(?:\.\d+)?\)$/.test(x));
  run.winnerText = winnerCandidates[winnerCandidates.length - 1] || segment[segment.length - 1] || "";
  run.finishNo = finishNo(run.finish);
  run.fieldSize = toNumber(run.fieldAndGate);
  run.gateNo = Number(firstMatch(run.fieldAndGate, /頭\s*(\d+)番/)) || null;
  run.popularity = toNumber(run.popularityText);
  run.bodyWeight = toNumber(run.bodyWeightText);
  run.margin = marginNo(run.winnerText);
  run.winner = winnerName(run.winnerText);
  run.placeGoodLimit = placeGoodLimit(run.fieldSize || 0);
  run.placeGood = Boolean(run.finishNo && run.finishNo <= run.placeGoodLimit);
  run.distanceCategory = distanceCategory(run.distance);
  run.marginGood = Boolean(run.margin !== null && run.distanceCategory.threshold !== null && run.margin <= run.distanceCategory.threshold);
  run.good = run.placeGood || run.marginGood;
  run.score = scoreRun(run);
  run.level = levelLabel(run.score);
  run.raceKey = [run.date, run.venue, run.distance, run.winner].filter(Boolean).join(" / ");
  return run;
}

function parseHorse(block) {
  const trainerIndex = block.findIndex((x) => /(美浦|栗東|地方)[)）]/.test(x) && !x.includes("母の父"));
  const horse = {
    name: block[0] || "",
    trainer: (block[trainerIndex] || "").replace(/[（(].+[)）]/, "").trim(),
    stable: firstMatch(block[trainerIndex] || "", /[（(](.+)[)）]/),
    sexAgeColor: block.find((x) => /^[牡牝セ騙]\d+\/.+/.test(x)) || "",
    currentWeight: "",
    currentJockey: "",
    sire: "",
    dam: "",
    damsire: "",
    runs: [],
  };

  const fatherIndex = block.findIndex((x) => x === "父：" || x.startsWith("父："));
  const motherIndex = block.findIndex((x) => x === "母：" || x.startsWith("母："));
  if (fatherIndex >= 0) horse.sire = block[fatherIndex].replace("父：", "").trim() || block[fatherIndex + 1] || "";
  if (motherIndex >= 0) horse.dam = block[motherIndex].replace("母：", "").trim() || block[motherIndex + 1] || "";
  horse.damsire = firstMatch(block.find((x) => x.includes("母の父")) || "", /母の父：(.+)\)/);

  const dateStart = block.findIndex((x) => /^20\d{2}年\d+月\d+日$/.test(x));
  const profile = dateStart >= 0 ? block.slice(0, dateStart) : block;
  const currentWeightIndex = profile.findIndex((x) => /^\d{2}\.?\d?kg$/.test(x));
  if (currentWeightIndex >= 0) {
    horse.currentWeight = profile[currentWeightIndex];
    horse.currentJockey = profile[currentWeightIndex + 1] || "";
  }

  for (let i = 0; i < block.length; i += 1) {
    if (!/^20\d{2}年\d+月\d+日$/.test(block[i])) continue;
    let end = block.length;
    for (let j = i + 1; j < block.length; j += 1) {
      if (/^20\d{2}年\d+月\d+日$/.test(block[j])) {
        end = j;
        break;
      }
    }
    horse.runs.push(parseRun(block.slice(i, end)));
  }

  const scores = horse.runs.map((run) => run.score);
  horse.averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  horse.level = levelLabel(horse.averageScore);
  horse.placeGoodWeights = horse.runs.filter((run) => run.placeGood && run.bodyWeight).map((run) => run.bodyWeight);
  horse.marginGoodWeights = horse.runs.filter((run) => run.marginGood && run.bodyWeight).map((run) => run.bodyWeight);
  horse.goodWeights = horse.runs.filter((run) => run.good && run.bodyWeight).map((run) => run.bodyWeight);
  horse.placeWeightRange = horse.placeGoodWeights.length
    ? `${Math.min(...horse.placeGoodWeights)}-${Math.max(...horse.placeGoodWeights)}kg`
    : "該当なし";
  horse.marginWeightRange = horse.marginGoodWeights.length
    ? `${Math.min(...horse.marginGoodWeights)}-${Math.max(...horse.marginGoodWeights)}kg`
    : "好走なし";
  return horse;
}

function parseJraText(text) {
  const lines = normalizeLines(text);
  const starts = findHorseStarts(lines);
  const horses = starts.map((start, index) => {
    const end = starts[index + 1] || lines.length;
    return parseHorse(lines.slice(start, end));
  }).filter((horse) => horse.name && horse.runs.length);

  const runs = horses.flatMap((horse) => horse.runs.map((run) => ({ ...run, horse: horse.name })));
  const groups = new Map();
  runs.forEach((run) => {
    if (!run.raceKey) return;
    if (!groups.has(run.raceKey)) groups.set(run.raceKey, []);
    groups.get(run.raceKey).push(run);
  });

  const sameRaceGroups = [...groups.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([key, items]) => ({
      key,
      items: [...items].sort((a, b) => (a.finishNo || 999) - (b.finishNo || 999)),
    }));

  return {
    title: extractRaceTitle(lines),
    horses: horses.sort((a, b) => b.averageScore - a.averageScore),
    runs,
    sameRaceGroups,
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function renderSummary(data) {
  const course = currentCourseKey();
  panels.summary.innerHTML = `<div class="cards">${data.horses.map((horse) => `
    <article class="horse-card">
      <strong>${escapeHtml(horse.name)}</strong>
      <div class="meta">${escapeHtml(horse.currentJockey)} ${escapeHtml(horse.currentWeight)} / ${escapeHtml(horse.trainer)} ${escapeHtml(horse.stable)}</div>
      <div class="badges">
        <span class="badge">総合 ${totalScore(horse, course).score}</span>
        <span class="badge ${horse.level === "D" ? "bad" : ""}">近走 ${horse.level} / ${horse.averageScore}</span>
        <span class="badge ${horse.placeGoodWeights.length ? "" : "warn"}">着順好走 ${escapeHtml(horse.placeWeightRange)}</span>
        <span class="badge ${horse.marginGoodWeights.length ? "" : "warn"}">着差好走 ${escapeHtml(horse.marginWeightRange)}</span>
        <span class="badge ${venueRuns(horse, course).length ? "" : "warn"}">同場 ${venueRuns(horse, course).length}走</span>
        <span class="badge ${exactDistanceRuns(horse, course).length ? "" : "warn"}">同距離 ${exactDistanceRuns(horse, course).length}走</span>
        <span class="badge ${nearDistanceRuns(horse, course).length ? "" : "warn"}">±200m ${nearDistanceRuns(horse, course).length}走</span>
        <span class="badge">近走 ${horse.runs.length}走</span>
      </div>
      <div class="run-line">${horse.runs.slice(0, 2).map((run) => `${run.date} ${run.distance} ${run.finish} ${run.winnerText}`).join("<br>")}</div>
    </article>
  `).join("")}</div>`;
}

function renderMatchups(data) {
  if (!data.sameRaceGroups.length) {
    panels.matchups.innerHTML = `<div class="empty">今回出走馬同士の同走は見つかりませんでした。</div>`;
    return;
  }
  panels.matchups.innerHTML = data.sameRaceGroups.map((group) => `
    <table>
      <thead><tr><th colspan="7">${escapeHtml(group.key)}</th></tr>
      <tr><th>馬名</th><th>着順</th><th>人気</th><th>馬体重</th><th>着差</th><th>上がり</th><th>メモ</th></tr></thead>
      <tbody>${group.items.map((run, index) => `
        <tr>
          <td>${escapeHtml(run.horse)}</td>
          <td>${escapeHtml(run.finish)}</td>
          <td>${escapeHtml(run.popularityText)}</td>
          <td>${escapeHtml(run.bodyWeightText)}</td>
          <td>${escapeHtml(run.winnerText)}</td>
          <td>${escapeHtml(run.final3f)}</td>
          <td>${index === 0 ? "同走内で最先着" : ""}</td>
        </tr>
      `).join("")}</tbody>
    </table><br>
  `).join("");
}

function renderRanking(data) {
  const course = currentCourseKey();
  const ranked = [...data.horses].sort((a, b) => {
    const bTotal = totalScore(b, course).score;
    const aTotal = totalScore(a, course).score;
    if (bTotal !== aTotal) return bTotal - aTotal;
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    const bGood = b.runs.filter((run) => run.placeGood || run.marginGood).length;
    const aGood = a.runs.filter((run) => run.placeGood || run.marginGood).length;
    return bGood - aGood;
  });

  panels.ranking.innerHTML = `<table>
    <thead><tr><th>順位</th><th>馬名</th><th>総合</th><th>近走評価</th><th>着順好走</th><th>着差好走</th><th>同場</th><th>同距離</th><th>±200m</th><th>完全同条件</th><th>加点内訳</th><th>主な材料</th></tr></thead>
    <tbody>${ranked.map((horse, index) => {
      const total = totalScore(horse, course);
      const placeGood = horse.runs.filter((run) => run.placeGood);
      const marginGood = horse.runs.filter((run) => run.marginGood);
      const same = sameCourseRuns(horse, course);
      const venue = venueRuns(horse, course);
      const exactDistance = exactDistanceRuns(horse, course);
      const nearDistance = nearDistanceRuns(horse, course);
      const bestRun = [...horse.runs].sort((a, b) => b.score - a.score)[0];
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(horse.name)}</td>
        <td><strong>${total.score}</strong></td>
        <td><strong>${horse.level} / ${horse.averageScore}</strong></td>
        <td>${placeGood.length}走</td>
        <td>${marginGood.length}走</td>
        <td>${venue.length}走</td>
        <td>${exactDistance.length}走</td>
        <td>${nearDistance.length}走</td>
        <td>${same.length}走</td>
        <td>同場+${Math.min(total.venueCount, 3) * 3} / 同距離+${Math.min(total.exactDistanceCount, 3) * 5} / ±200m+${Math.min(total.nearDistanceCount, 3) * 3} / 完全+${Math.min(total.sameCount, 3) * 8} / 同好走+${total.samePlaceGood * 18 + total.sameMarginGood * 15} / 他好走+${total.otherGoodBonus}</td>
        <td>${bestRun ? `${bestRun.date} ${bestRun.distance} ${bestRun.finish} ${bestRun.winnerText} 評価${bestRun.level}/${bestRun.score}` : "-"}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}

function renderWeights(data) {
  panels.weights.innerHTML = `<table>
    <thead><tr><th>馬名</th><th>着順好走体重</th><th>着差好走体重</th><th>着順好走</th><th>着差好走</th></tr></thead>
    <tbody>${data.horses.map((horse) => {
      const placeGoodRuns = horse.runs.filter((run) => run.placeGood);
      const marginGoodRuns = horse.runs.filter((run) => run.marginGood);
      return `<tr>
        <td>${escapeHtml(horse.name)}</td>
        <td>${escapeHtml(horse.placeWeightRange)}</td>
        <td>${escapeHtml(horse.marginWeightRange)}</td>
        <td>${placeGoodRuns.map((run) => `${run.date} ${run.finish} ${run.fieldSize || "-"}頭 ${run.bodyWeightText} ${run.winnerText}`).join("<br>") || "該当なし"}</td>
        <td>${marginGoodRuns.map((run) => `${run.date} ${run.distanceCategory.name} ${run.margin ?? "-"}秒差 ${run.bodyWeightText} ${run.winnerText}`).join("<br>") || "該当なし"}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}

function inferCourse(data) {
  const counts = new Map();
  data.runs.forEach((run) => {
    const key = [run.venue, run.distance].filter(Boolean).join(" ");
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function sameCourseRuns(horse, course) {
  if (!course.venue || !course.distance) return [];
  return horse.runs.filter((run) => run.venue === course.venue && run.distance === course.distance);
}

function venueRuns(horse, course) {
  if (!course.venue) return [];
  return horse.runs.filter((run) => run.venue === course.venue);
}

function exactDistanceRuns(horse, course) {
  const target = courseDistanceMeters(course);
  const surface = firstMatch(course?.distance || "", /(芝|ダ|障)/);
  if (!target || !surface) return [];
  return horse.runs.filter((run) => distanceMeters(run.distance) === target && run.distance.includes(surface));
}

function nearDistanceRuns(horse, course) {
  const target = courseDistanceMeters(course);
  const surface = firstMatch(course?.distance || "", /(芝|ダ|障)/);
  if (!target || !surface) return [];
  return horse.runs.filter((run) => {
    const meters = distanceMeters(run.distance);
    return meters && meters !== target && Math.abs(meters - target) <= 200 && run.distance.includes(surface);
  });
}

function totalScore(horse, course) {
  const same = sameCourseRuns(horse, course);
  const venue = venueRuns(horse, course);
  const exactDistance = exactDistanceRuns(horse, course);
  const nearDistance = nearDistanceRuns(horse, course);
  const samePlaceGood = same.filter((run) => run.placeGood).length;
  const sameMarginGood = same.filter((run) => run.marginGood).length;
  const allPlaceGood = horse.runs.filter((run) => run.placeGood).length;
  const allMarginGood = horse.runs.filter((run) => run.marginGood).length;
  const sameBonus = Math.min(same.length, 3) * 8;
  const venueBonus = Math.min(venue.length, 3) * 3;
  const exactDistanceBonus = Math.min(exactDistance.length, 3) * 5;
  const nearDistanceBonus = Math.min(nearDistance.length, 3) * 3;
  const samePlaceBonus = samePlaceGood * 18;
  const sameMarginBonus = sameMarginGood * 15;
  const otherGoodBonus = allPlaceGood * 4 + allMarginGood * 3;
  const bonus = sameBonus + venueBonus + exactDistanceBonus + nearDistanceBonus + samePlaceBonus + sameMarginBonus + otherGoodBonus;
  return {
    score: Math.min(100, Math.round(horse.averageScore + bonus)),
    bonus,
    sameCount: same.length,
    venueCount: venue.length,
    exactDistanceCount: exactDistance.length,
    nearDistanceCount: nearDistance.length,
    samePlaceGood,
    sameMarginGood,
    allPlaceGood,
    allMarginGood,
    otherGoodBonus,
  };
}

function renderSameCourse(data) {
  const course = currentCourseKey();
  if (!course.venue || !course.distance) {
    panels.samecourse.innerHTML = `<div class="empty">今回コースを「東京 1400ダ」のように入力すると、同競馬場・同コース経験を判定できます。</div>`;
    return;
  }

  panels.samecourse.innerHTML = `<table>
    <thead><tr><th>馬名</th><th>同競馬場</th><th>同距離</th><th>近似距離</th><th>完全同条件</th><th>同条件好走</th><th>対象レース</th></tr></thead>
    <tbody>${data.horses.map((horse) => {
      const runs = sameCourseRuns(horse, course);
      const venue = venueRuns(horse, course);
      const exactDistance = exactDistanceRuns(horse, course);
      const nearDistance = nearDistanceRuns(horse, course);
      const goodRuns = runs.filter((run) => run.placeGood || run.marginGood);
      return `<tr>
        <td>${escapeHtml(horse.name)}</td>
        <td>${venue.length ? `${venue.length}走` : "なし"}</td>
        <td>${exactDistance.length ? `${exactDistance.length}走` : "なし"}</td>
        <td>${nearDistance.length ? `${nearDistance.length}走` : "なし"}</td>
        <td>${runs.length ? `${runs.length}走` : "なし"}</td>
        <td>${goodRuns.length ? `${goodRuns.length}走` : "なし"}</td>
        <td>${[...new Set([...runs, ...nearDistance, ...exactDistance, ...venue])].map((run) => `${run.date} ${run.venue} ${run.distance} ${run.finish} ${run.winnerText} ${run.placeGood ? "着順好走" : ""} ${run.marginGood ? "着差好走" : ""}`).join("<br>") || "該当なし"}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}

function followupCandidates(data) {
  const course = currentCourseKey();
  const map = new Map();
  data.horses.forEach((horse) => {
    horse.runs.forEach((run) => {
      if (!run.winner || run.winner === horse.name) return;
      const same = sameCourseRuns(horse, course).includes(run);
      const reasons = [];
      let priority = 0;
      if (run.marginGood) {
        reasons.push(`着差好走 ${run.margin}秒差`);
        priority += 18;
      }
      if (run.placeGood) {
        reasons.push(`着順好走 ${run.finish}`);
        priority += 14;
      }
      if (same) {
        reasons.push("今回と完全同条件");
        priority += 12;
      } else if (run.venue === course.venue) {
        reasons.push("同競馬場");
        priority += 4;
      }
      if (run.score >= 55) {
        reasons.push(`高評価走 ${run.level}/${run.score}`);
        priority += 10;
      }
      if (run.raceKey && data.sameRaceGroups.some((group) => group.key === run.raceKey)) {
        reasons.push("今回出走馬の同走あり");
        priority += 8;
      }
      if (!reasons.length && run.finishNo && run.finishNo <= 5) {
        reasons.push(`${run.finish}時の勝ち馬`);
        priority += 5;
      }
      if (!reasons.length) return;

      const key = `${run.winner}|${run.date}|${run.venue}|${run.distance}`;
      const item = map.get(key) || {
        horseToCheck: run.winner,
        date: run.date,
        venue: run.venue,
        distance: run.distance,
        sourceHorses: new Set(),
        reasons: new Set(),
        priority: 0,
      };
      item.sourceHorses.add(horse.name);
      reasons.forEach((reason) => item.reasons.add(reason));
      item.priority += priority;
      map.set(key, item);
    });
  });
  return [...map.values()]
    .map((item) => ({
      ...item,
      sourceHorses: [...item.sourceHorses],
      reasons: [...item.reasons],
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);
}

function renderFollowup(data) {
  const candidates = followupCandidates(data);
  if (!candidates.length) {
    panels.followup.innerHTML = `<div class="empty">確認候補を出せる近走がまだ見つかりませんでした。着差好走や同条件経験があるレースが増えると候補が出ます。</div>`;
    return;
  }
  panels.followup.innerHTML = `
    <div class="empty">レースレベルを見るときは、今回出走馬と一緒に走った馬、特に勝ち馬や僅差の相手がその後に好走しているかを確認すると判断しやすくなります。</div>
    <br>
    <table>
      <thead><tr><th>優先</th><th>確認したい馬</th><th>対象レース</th><th>今回出走馬</th><th>見る理由</th><th>見るポイント</th></tr></thead>
      <tbody>${candidates.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(item.horseToCheck)}</strong></td>
          <td>${escapeHtml(item.date)} ${escapeHtml(item.venue)} ${escapeHtml(item.distance)}</td>
          <td>${escapeHtml(item.sourceHorses.join("、"))}</td>
          <td>${escapeHtml(item.reasons.join(" / "))}</td>
          <td>次走以降で3着以内、または着差好走していれば、その近走のレースレベルを上方評価</td>
        </tr>
      `).join("")}</tbody>
    </table>`;
}

function renderRuns(data) {
  const rows = data.horses.flatMap((horse) => horse.runs.map((run) => ({ horse: horse.name, ...run })));
  panels.runs.innerHTML = `<table>
    <thead><tr><th>馬名</th><th>日付</th><th>場</th><th>条件</th><th>着順</th><th>人気</th><th>距離</th><th>馬場</th><th>馬体重</th><th>勝ち馬/着差</th><th>評価</th></tr></thead>
    <tbody>${rows.map((run) => `
      <tr>
        <td>${escapeHtml(run.horse)}</td>
        <td>${escapeHtml(run.date)}</td>
        <td>${escapeHtml(run.venue)}</td>
        <td>${escapeHtml(run.className)}</td>
        <td>${escapeHtml(run.finish)}</td>
        <td>${escapeHtml(run.popularityText)}</td>
        <td>${escapeHtml(run.distance)}</td>
        <td>${escapeHtml(run.going)}</td>
        <td>${escapeHtml(run.bodyWeightText)}</td>
        <td>${escapeHtml(run.winnerText)}</td>
        <td>${run.level} / ${run.score}<br>${run.placeGood ? `着順好走(${run.placeGoodLimit}着内)` : ""} ${run.marginGood ? `着差好走(${run.distanceCategory.name})` : ""}</td>
      </tr>
    `).join("")}</tbody>
  </table>`;
}

function renderNotes(data) {
  const saved = JSON.parse(localStorage.getItem(`jra-notes:${data.title}`) || "{}");
  panels.notes.innerHTML = `
    <p class="hint">印とメモはこのブラウザに自動保存されます。</p>
    ${data.horses.map((horse) => `
    <div class="note-row">
      <select data-horse="${escapeHtml(horse.name)}" aria-label="${escapeHtml(horse.name)}の印">
        ${["", "◎", "○", "▲", "△", "消"].map((mark) => `<option ${saved[horse.name]?.mark === mark ? "selected" : ""}>${mark}</option>`).join("")}
      </select>
      <strong>${escapeHtml(horse.name)}</strong>
      <input data-horse="${escapeHtml(horse.name)}" type="text" placeholder="メモ" value="${escapeHtml(saved[horse.name]?.memo || "")}">
    </div>
  `).join("")}`;

  panels.notes.querySelectorAll("select, input").forEach((field) => {
    field.addEventListener("input", () => {
      const next = JSON.parse(localStorage.getItem(`jra-notes:${data.title}`) || "{}");
      const horse = field.dataset.horse;
      next[horse] = next[horse] || {};
      if (field.tagName === "SELECT") next[horse].mark = field.value;
      if (field.tagName === "INPUT") next[horse].memo = field.value;
      localStorage.setItem(`jra-notes:${data.title}`, JSON.stringify(next));
    });
  });
}

function render(data) {
  currentData = data;
  const course = currentCourseKey();
  const courseMeta = distanceCategory(course.distance);
  courseHint.textContent = courseMeta.threshold === null
    ? "今回条件を入れると同条件経験を判定します。"
    : `${courseMeta.name}扱い。着差好走の目安は${courseMeta.threshold}秒以内です。`;
  raceTitle.textContent = data.title;
  horseCount.textContent = data.horses.length;
  runCount.textContent = data.runs.length;
  matchCount.textContent = data.sameRaceGroups.length;
  renderSummary(data);
  renderRanking(data);
  renderMatchups(data);
  renderSameCourse(data);
  renderFollowup(data);
  renderWeights(data);
  renderRuns(data);
  renderNotes(data);
}

function analyze() {
  const newText = sourceText.value;
  const textChanged = newText !== lastAnalyzedText;
  if (textChanged) {
    lastAnalyzedText = newText;
  }
  const data = parseJraText(sourceText.value);
  if (!data.horses.length) {
    raceTitle.textContent = "解析できませんでした";
    horseCount.textContent = "0";
    runCount.textContent = "0";
    matchCount.textContent = "0";
    Object.values(panels).forEach((panel) => {
      panel.innerHTML = `<div class="empty">貼り付け内容から馬の詳細ブロックを見つけられませんでした。JRA出馬表の「基本」以降も含めて貼ってください。</div>`;
    });
    return;
  }
  if (textChanged && !currentCourseKey().label) {
    setCourseFromKey(inferCourse(data));
  }
  render(data);
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}`).classList.add("active");
  });
});

analyzeButton.addEventListener("click", analyze);
clearButton.addEventListener("click", () => {
  sourceText.value = "";
  analyze();
});
loadDemoButton.addEventListener("click", () => {
  sourceText.value = demoText;
  courseVenueInput.value = "";
  courseDistanceInput.value = "";
  courseSurfaceInput.value = "";
  analyze();
});

guessCourseButton.addEventListener("click", () => {
  if (!currentData) return;
  setCourseFromKey(inferCourse(currentData));
  render(currentData);
});

[courseVenueInput, courseDistanceInput, courseSurfaceInput].forEach((field) => field.addEventListener("input", () => {
  if (currentData) render(currentData);
}));

analyze();
