const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const RAW_ROOT = path.join(ROOT, "amc8_raw");
const YEARS = Array.from({ length: 15 }, (_, i) => 2011 + i).filter((year) => year !== 2021);

const MODULE_RULES = [
  ["数论", ["number theory", "divisibility", "remainder", "prime", "digit", "integer", "factor", "multiple", "gcd", "lcm", "modular", "units digit"]],
  ["计数与概率", ["counting", "combinatorics", "probability", "arrangement", "permutation", "combination", "casework", "pigeonhole"]],
  ["几何", ["geometry", "triangle", "circle", "angle", "area", "perimeter", "polygon", "coordinate", "solid geometry", "measurement", "rectangle", "square", "grid", "volume"]],
  ["代数", ["algebra", "equation", "inequality", "ratio", "proportion", "sequence", "function", "expression", "system of equations", "linear"]],
  ["应用题与算术", ["arithmetic", "word problem", "rate", "work", "percent", "fraction", "decimal", "average", "unit conversion", "money", "mixture", "time"]],
  ["逻辑与综合", ["logic", "game", "pattern", "visualization", "recursion", "strategy", "miscellaneous"]],
];

const SUBMODULE_RULES = [
  ["整除与余数", ["divisibility", "remainder", "modular"]],
  ["质数与因数分解", ["prime", "factor", "gcd", "lcm"]],
  ["整数与位值", ["digit", "integer", "units digit"]],
  ["排列组合", ["permutation", "combination", "arrangement", "counting", "combinatorics"]],
  ["概率", ["probability"]],
  ["平面几何", ["triangle", "circle", "angle", "polygon", "rectangle", "square", "perimeter", "area"]],
  ["坐标与网格几何", ["coordinate", "grid"]],
  ["立体几何", ["solid geometry", "volume"]],
  ["方程与代数式", ["equation", "expression", "linear", "system of equations", "inequality"]],
  ["比率与比例", ["ratio", "proportion"]],
  ["数列与规律", ["sequence", "pattern", "recursion"]],
  ["行程与工程", ["rate", "work", "time"]],
  ["百分数与分数", ["percent", "fraction", "decimal", "average"]],
  ["单位换算与应用", ["unit conversion", "money", "mixture", "word problem"]],
  ["逻辑构造", ["logic", "game", "strategy", "visualization"]],
];

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeMathSpacing(text) {
  return text.replace(/\s+/g, " ").replace(/\s*([=+\-*/,:;()])\s*/g, "$1").trim();
}

function stripMarkup(text) {
  return normalize(
    text
      .replace(/<asy>[\s\S]*?<\/asy>/g, " [figure] ")
      .replace(/<(?:math|cmath|imath)>[\s\S]*?<\/(?:math|cmath|imath)>/g, " [math] ")
      .replace(/\[\[Category:(.*?)\]\]/g, "")
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
      .replace(/\{\{[\s\S]*?\}\}/g, " ")
      .replace(/==.*?==/g, " ")
  );
}

function extractProblemStatement(raw) {
  const match = raw.match(/==\s*Problem.*?==\s*([\s\S]*?)(?:==\s*Solution|$)/i);
  if (!match) return "";
  const statement = match[1].trim().split(/\n\s*\n/)[0];
  return normalize(stripMarkup(statement));
}

function extractCategories(raw) {
  return [...raw.matchAll(/\[\[Category:(.*?)\]\]/g)].map((m) => normalize(m[1]));
}

function extractAnswerKey(year) {
  const answerPath = path.join(RAW_ROOT, String(year), "Answer_Key.txt");
  const raw = fs.readFileSync(answerPath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^#[A-E]$/.test(line))
    .map((line) => line.slice(1));
}

function convertMathTags(text) {
  return text.replace(/<(?:math|cmath|imath)>([\s\S]*?)<\/(?:math|cmath|imath)>/g, (_, expr) => `\\(${normalizeMathSpacing(expr)}\\)`);
}

function cleanWikiText(text) {
  return normalize(
    convertMathTags(text)
      .replace(/<asy>[\s\S]*?<\/asy>/g, "[图形见原题链接]")
      .replace(/\[\[(?:Image|File):(.*?)(\|.*?)?\]\]/gi, "[图形见原题链接]")
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
      .replace(/\{\{[\s\S]*?\}\}/g, " ")
  );
}

function extractProblemParts(raw) {
  const match = raw.match(/==\s*Problem.*?==\s*([\s\S]*?)(?:==\s*Solution|$)/i);
  if (!match) {
    return { content: "", options: [], hasFigure: false };
  }

  const block = match[1].trim();
  const hasFigure = /\[\[(?:Image|File):/i.test(block) || /<asy>[\s\S]*?<\/asy>/i.test(block);
  const mathBlocks = [...block.matchAll(/<(?:math|cmath|imath)>([\s\S]*?)<\/(?:math|cmath|imath)>/g)];
  const optionBlocks = mathBlocks
    .map((matchItem) => matchItem[1])
    .filter((item) => /\(A\)|\(B\)|\(C\)|\(D\)|\(E\)|\\textbf\s*\{\([A-E]\)/.test(item));

  let promptBlock = block;
  for (const optionBlock of optionBlocks) {
    promptBlock = promptBlock
      .replace(new RegExp(`<math>${escapeRegExp(optionBlock)}<\\/math>`), "")
      .replace(new RegExp(`<cmath>${escapeRegExp(optionBlock)}<\\/cmath>`), "")
      .replace(new RegExp(`<imath>${escapeRegExp(optionBlock)}<\\/imath>`), "")
      .trim();
  }

  const content = cleanWikiText(promptBlock);
  const options = parseOptions(optionBlocks);
  return { content, options, hasFigure };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseOptions(optionBlocks) {
  if (!optionBlocks || optionBlocks.length === 0) return [];

  if (optionBlocks.length > 1) {
    return optionBlocks.map((block) => {
      const labelMatch = block.match(/\(([A-E])\)/);
      const label = labelMatch ? labelMatch[1] : "";
      let value = block
        .replace(/\\textbf\s*\{\(([A-E])\)\s*\}/g, "")
        .replace(/\\text\s*\{\s*\\textbf\s*\{\(([A-E])\)\s*\}\s*\}/g, "")
        .trim();
      value = normalizeMathSpacing(value);
      return {
        label,
        text: `(${label}) ${value ? `\\(${value}\\)` : ""}`.trim(),
      };
    }).filter((item) => item.label);
  }

  let raw = optionBlocks[0];
  raw = raw.replace(/\\qquad/g, " ");
  raw = raw.replace(/\\\\/g, " ");
  raw = raw.replace(/\\textbf\s*\{\(([A-E])\)\s*\}/g, "|||$1|||");
  raw = raw.replace(/\\textbf\s*\{\(([A-E])\)\s*\s*\}/g, "|||$1|||");
  raw = raw.replace(/\s+/g, " ").trim();

  const parts = raw.split("|||").map((part) => part.trim()).filter(Boolean);
  const seen = new Set();
  const results = [];
  for (let i = 0; i < parts.length - 1; i += 2) {
    const label = parts[i];
    const value = normalizeMathSpacing((parts[i + 1] || "").trim());
    if (/^[A-E]$/.test(label) && !seen.has(label)) {
      seen.add(label);
      results.push({
        label,
        text: `(${label}) ${value ? `\\(${value}\\)` : ""}`.trim(),
      });
    }
  }
  return results;
}

function normalizeOptions(options) {
  const byLabel = new Map();
  for (const option of options || []) {
    if (!option || !/^[A-E]$/.test(option.label || "")) continue;
    const current = byLabel.get(option.label);
    if (!current || (option.text || "").length > (current.text || "").length) {
      byLabel.set(option.label, option);
    }
  }
  const ordered = ["A", "B", "C", "D", "E"]
    .map((label) => byLabel.get(label))
    .filter(Boolean);
  return ordered;
}

function classify(categories, statement) {
  const haystack = [...categories, statement].join(" | ").toLowerCase();

  let module = "逻辑与综合";
  for (const [candidate, keywords] of MODULE_RULES) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      module = candidate;
      break;
    }
  }

  let submodule = "综合";
  for (const [candidate, keywords] of SUBMODULE_RULES) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      submodule = candidate;
      break;
    }
  }

  if (module === "几何" && submodule === "综合") submodule = "平面几何";
  if (module === "计数与概率" && submodule === "综合") submodule = "排列组合";
  if (module === "数论" && submodule === "综合") submodule = "整除与余数";
  if (module === "代数" && submodule === "综合") submodule = "方程与代数式";
  if (module === "应用题与算术" && submodule === "综合") submodule = "单位换算与应用";

  return { module, submodule };
}

function difficultyBand(num) {
  if (num <= 5) return "基础";
  if (num <= 10) return "基础-中档";
  if (num <= 15) return "中档";
  if (num <= 20) return "中高档";
  return "压轴";
}

function focusFromStatement(statement, categories, module, submodule) {
  const text = statement.toLowerCase();
  if (text.includes("probability")) return "概率计算";
  if (text.includes("percent") || statement.includes("%")) return "百分数转化";
  if (text.includes("average")) return "平均数关系";
  if (text.includes("prime")) return "质数性质";
  if (text.includes("digit")) return "数字位值";
  if (text.includes("remainder")) return "余数分析";
  if (text.includes("ratio")) return "比与比例";
  if (text.includes("sequence") || text.includes("pattern")) return "规律归纳";
  if (text.includes("circle")) return "圆与角度";
  if (text.includes("triangle")) return "三角形性质";
  if (text.includes("area")) return "面积计算";
  if (text.includes("perimeter")) return "周长计算";
  if (text.includes("volume")) return "体积计算";
  if (text.includes("grid") || text.includes("coordinate")) return "网格/坐标分析";
  if (text.includes("ways") || text.includes("how many")) return "分类计数";
  if (text.includes("least") || text.includes("greatest")) return "极值构造";
  if (categories.length > 0) return categories[0].replace(/problems?$/i, "").trim().slice(0, 30);
  return `${module}-${submodule}`;
}

function paraphrase(statement, submodule) {
  if (!statement) return `${submodule}练习`;
  let cleaned = statement.replace(/\[math\]/g, "").trim();
  if (cleaned.length > 80) cleaned = `${cleaned.slice(0, 77).trimEnd()}...`;
  return `${submodule}: ${cleaned}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildRows() {
  const rows = [];
  for (const year of YEARS) {
    const answers = extractAnswerKey(year);
    for (let num = 1; num <= 25; num += 1) {
      const problemPath = path.join(RAW_ROOT, String(year), `Problem_${num}.txt`);
      const raw = fs.readFileSync(problemPath, "utf8");
      const statement = extractProblemStatement(raw);
      const categories = extractCategories(raw);
      const quiz = extractProblemParts(raw);
      const { module, submodule } = classify(categories, statement);
      const normalizedOptions = normalizeOptions(quiz.options);
      rows.push({
        year: String(year),
        problem: String(num),
        contest: `${year} AMC 8`,
        module,
        submodule,
        difficulty: difficultyBand(num),
        focus: focusFromStatement(statement, categories, module, submodule),
        summary: paraphrase(statement, submodule),
        aops_categories: categories.join("; "),
        source_url: `https://artofproblemsolving.com/wiki/index.php?title=${year}_AMC_8_Problems/Problem_${num}`,
        content: quiz.content,
        options: normalizedOptions.length === 5 ? normalizedOptions : ["A", "B", "C", "D", "E"].map((label) => ({ label, text: `(${label})` })),
        answer: answers[num - 1] || "",
        has_figure: quiz.hasFigure,
      });
    }
  }
  return rows;
}

function writeCsv(rows) {
  const headers = ["year", "problem", "contest", "module", "submodule", "difficulty", "focus", "summary", "aops_categories", "source_url"];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  fs.writeFileSync(path.join(ROOT, "AMC8_2011_2025_Module_Bank.csv"), `\uFEFF${lines.join("\n")}`, "utf8");
}

function writeJson(rows) {
  fs.writeFileSync(path.join(ROOT, "AMC8_2011_2025_Module_Bank.json"), JSON.stringify(rows, null, 2), "utf8");
}

function writeQuizJson(rows) {
  const quizRows = rows.map((row) => ({
    year: row.year,
    problem: row.problem,
    contest: row.contest,
    module: row.module,
    submodule: row.submodule,
    difficulty: row.difficulty,
    focus: row.focus,
    content: row.content,
    options: row.options,
    answer: row.answer,
    has_figure: row.has_figure,
    source_url: row.source_url,
  }));
  fs.writeFileSync(path.join(ROOT, "amc8_quiz_data.json"), JSON.stringify(quizRows, null, 2), "utf8");
}

function writeMarkdown(rows) {
  const orderedModules = ["应用题与算术", "代数", "数论", "计数与概率", "几何", "逻辑与综合"];
  const moduleCounts = new Map();
  const submoduleCounts = new Map();
  const byModule = new Map();

  for (const row of rows) {
    moduleCounts.set(row.module, (moduleCounts.get(row.module) || 0) + 1);
    const key = `${row.module}|||${row.submodule}`;
    submoduleCounts.set(key, (submoduleCounts.get(key) || 0) + 1);
    if (!byModule.has(row.module)) byModule.set(row.module, []);
    byModule.get(row.module).push(row);
  }

  const lines = [];
  lines.push("# AMC 8 2011-2025 按模块题库", "");
  lines.push("说明：本题库覆盖 2011-2025 年间已列入 AoPS AMC 8 总目录的试题，共 14 套、350 题。");
  lines.push("说明：AoPS 总目录包含 2026 AMC 8，但该年份不属于“近 10-15 年”的已完成历史卷范围，因此未纳入。");
  lines.push("说明：AoPS 总目录未列出 2021 AMC 8，因此本题库不含 2021。");
  lines.push("说明：题目分类以 AoPS 题目页分类标签为主，并做了适合训练使用的模块映射。", "");
  lines.push("## 模块分布", "");

  for (const module of orderedModules) {
    if (!moduleCounts.has(module)) continue;
    lines.push(`- ${module}：${moduleCounts.get(module)} 题`);
    const related = [...submoduleCounts.entries()]
      .filter(([key]) => key.startsWith(`${module}|||`))
      .map(([key, count]) => [key.split("|||")[1], count])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
    const detail = related.slice(0, 5).map(([sub, count]) => `${sub} ${count}题`).join("，");
    if (detail) lines.push(`  细分：${detail}`);
  }

  lines.push("", "## 使用建议", "");
  lines.push("- 刷题顺序建议：应用题与算术 -> 代数 -> 数论 -> 计数与概率 -> 几何 -> 逻辑与综合。");
  lines.push("- 难度分层按 AMC 8 常见出题顺序粗分：1-5 基础，6-10 基础-中档，11-15 中档，16-20 中高档，21-25 压轴。");
  lines.push("- 若要继续扩展，可在 CSV/JSON 中按模块、年份、难度进行筛选后二次组卷。", "");

  for (const module of orderedModules) {
    const moduleRows = byModule.get(module) || [];
    moduleRows.sort((a, b) => a.submodule.localeCompare(b.submodule, "zh-CN") || Number(a.year) - Number(b.year) || Number(a.problem) - Number(b.problem));
    if (moduleRows.length === 0) continue;

    lines.push(`## ${module}`, "");
    let currentSubmodule = "";
    for (const row of moduleRows) {
      if (row.submodule !== currentSubmodule) {
        currentSubmodule = row.submodule;
        lines.push(`### ${currentSubmodule}`, "");
      }
      lines.push(`- ${row.year} P${row.problem}｜${row.difficulty}｜${row.focus}｜[${row.contest} Problem ${row.problem}](${row.source_url})`);
    }
    lines.push("");
  }

  fs.writeFileSync(path.join(ROOT, "AMC8_2011_2025_按模块题库.md"), `\uFEFF${lines.join("\n")}`, "utf8");
}

function main() {
  const rows = buildRows();
  writeCsv(rows);
  writeJson(rows);
  writeQuizJson(rows);
  writeMarkdown(rows);
}

main();
