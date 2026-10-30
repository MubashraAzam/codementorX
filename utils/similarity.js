// Module 4.4 — code similarity (plagiarism) check using the winnowing
// algorithm (Schleimer, Wilkerson & Aiken, 2003), the method behind MOSS.
//
// 1. Tokenize the code and normalise it: comments removed, every identifier
//    becomes "I", every number "N", every string "S". Renaming variables or
//    changing text in strings therefore does not hide copying.
// 2. Hash every run of K consecutive tokens (k-grams).
// 3. Keep the minimum hash in each window of W k-grams (the "fingerprints").
// 4. Similarity = shared fingerprints / fingerprints of the smaller program
//    (containment), so copying a whole program into a bigger file still shows.
const K = 5;
const W = 4;

const KEYWORDS = new Set((
  // Python
  "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print range len self " +
  // C / C++ / Java / JavaScript
  "auto bool case catch char const default delete do double enum extends final float friend function goto implements instanceof int interface let long namespace new null private protected public short signed sizeof static struct super switch template this throw throws typedef typename union unsigned using var virtual void volatile boolean byte include iostream std cout cin endl string vector map set main String System out println undefined typeof export default async await"
).split(" "));

function tokenize(code) {
  const src = String(code || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")          // /* block comments */
    .replace(/\/\/[^\n]*/g, " ")                 // // line comments
    .replace(/(^|\s)#(?!include)[^\n]*/g, " ")   // # python comments (keep #include)
    .replace(/("""|''')[\s\S]*?\1/g, " S ");     // python docstrings
  const re = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\d+(?:\.\d+)?|[A-Za-z_$][\w$]*|==|!=|<=|>=|&&|\|\||\+\+|--|->|::|[+\-*/%=<>!&|^~?:;,.(){}[\]]/g;
  const tokens = [];
  let m;
  while ((m = re.exec(src))) {
    const t = m[0];
    if (/^["'`]/.test(t)) tokens.push("S");
    else if (/^\d/.test(t)) tokens.push("N");
    else if (/^[A-Za-z_$]/.test(t)) tokens.push(KEYWORDS.has(t) ? t : "I");
    else tokens.push(t);
  }
  return tokens;
}

function hash(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function fingerprints(code) {
  const tokens = tokenize(code);
  if (tokens.length < K) return [];
  const grams = [];
  for (let i = 0; i + K <= tokens.length; i++) grams.push(hash(tokens.slice(i, i + K).join(" ")));
  if (grams.length <= W) return [...new Set(grams)];
  const picked = new Set();
  for (let i = 0; i + W <= grams.length; i++) {
    let min = grams[i];
    for (let j = i + 1; j < i + W; j++) if (grams[j] <= min) min = grams[j];
    picked.add(min);
  }
  return [...picked];
}

function similarity(a, b) {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b);
  let shared = 0;
  for (const x of new Set(a)) if (setB.has(x)) shared++;
  return shared / Math.min(new Set(a).size, setB.size);
}

module.exports = { tokenize, fingerprints, similarity, K, W };
