const express = require("express");
const { askGroq, askGemini } = require("../utils/aiProviders");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
// Generic AI prompt route — used by LevelPage.jsx for all its prompt-based calls
router.post("/ask", protect, async (req, res) => {
  const { prompt } = req.body;
  try {
    const text = await askGroq(prompt);
    res.json({ text });
  } catch (error) {
    res.status(500).json({ message: "AI error", error: error.message });
  }
});

// Interview question generator
router.post("/interview-question", protect, async (req, res) => {
  const { language, index } = req.body;
  try {
    const prompt = `Generate ONE technical interview question (#${index + 1} of 5) for a student who just finished learning ${language === "python" ? "Python" : "C++"} fundamentals through OOP. One question only, no numbering, no extra text.`;
    const text = await askGroq(prompt);
    res.json({ question: text.trim() });
  } catch (error) {
    res.status(500).json({ message: "AI error", error: error.message });
  }
});

// Interview grading
router.post("/interview-grade", protect, async (req, res) => {
  const { language, qaPairs } = req.body;
  try {
    const transcript = qaPairs.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n\n");
    const prompt = `Grade this ${language === "python" ? "Python" : "C++"} technical interview:\n\n${transcript}\n\nEvaluate overall understanding and clarity. Return ONLY valid JSON: {"percentage": 0-100, "feedback": "2-3 sentence overall feedback"}. No markdown, no extra text.`;
    const text = await askGroq(prompt);
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "AI error", error: error.message });
  }
});

router.post("/lesson", protect, async (req, res) => {
  const { language, levelTitle, levelSub, uiLang } = req.body;
  try {
    const prompt = `You are an expert ${language} tutor. Create a comprehensive lesson on "${levelTitle}" covering: ${levelSub}. Include explanation, key concepts, code examples in code blocks, and a summary. ${uiLang === "Urdu" ? "Add brief Urdu explanations after key points." : ""}`;
    res.json({ text: await askGroq(prompt) });
  } catch (error) { res.status(500).json({ message: "AI error", error: error.message }); }
});

router.post("/practice", protect, async (req, res) => {
  const { language, levelTitle, levelSub, uiLang } = req.body;
  try {
    const prompt = `Create 3 practice exercises for ${language} "${levelTitle}" (${levelSub}). Number each, give description and expected output, no solutions. ${uiLang === "Urdu" ? "Add Urdu instructions." : ""}`;
    res.json({ text: await askGroq(prompt) });
  } catch (error) { res.status(500).json({ message: "AI error", error: error.message }); }
});

router.post("/quiz", protect, async (req, res) => {
  const { language, levelTitle, levelSub } = req.body;
  try {
    const prompt = `Create 5 MCQs for ${language} "${levelTitle}" (${levelSub}). Return ONLY JSON: [{"q":"...","opts":["A","B","C","D"],"ans":0,"exp":"..."}]. No markdown.`;
    const text = await askGroq(prompt);
    res.json({ questions: JSON.parse(text.replace(/```json|```/g, "").trim()) });
  } catch (error) { res.status(500).json({ message: "AI error", error: error.message }); }
});

router.post("/hint", protect, async (req, res) => {
  const { language, levelTitle, context } = req.body;
  try {
    const prompt = `Give a step-by-step hint for ${language} "${levelTitle}". Context: ${context || "general"}. Do NOT give the full solution.`;
    res.json({ text: await askGroq(prompt) });
  } catch (error) { res.status(500).json({ message: "AI error", error: error.message }); }
});

router.post("/example", protect, async (req, res) => {
  const { language, levelTitle, uiLang } = req.body;
  try {
    const prompt = `Give one additional real-world ${language} example for "${levelTitle}" in a code block. ${uiLang === "Urdu" ? "Add Urdu explanation." : ""}`;
    res.json({ text: await askGroq(prompt) });
  } catch (error) { res.status(500).json({ message: "AI error", error: error.message }); }
});

router.post("/voice", protect, async (req, res) => {
  const { spokenText, language, levelTitle } = req.body;
  try {
    const prompt = `A student learning ${language} asked: "${spokenText}". Topic: ${levelTitle}. Answer helpfully in 2-3 paragraphs.`;
    res.json({ text: await askGroq(prompt) });
  } catch (error) { res.status(500).json({ message: "AI error", error: error.message }); }
});

// Code review — Gemini tends to be strong at code analysis, using it here
router.post("/review-project", protect, async (req, res) => {
  const { code, fileName, language, projectTitle, projectDesc } = req.body;
  try {
    const prompt = `You are a strict code evaluator. Review this ${language} code for the project "${projectTitle}".
Project Requirements: ${projectDesc}
File Name: ${fileName}

User's Code:
${code}

CRITICAL: You must strictly check if the code satisfies the Project Requirements above. If the code is just generic or unrelated (e.g. 'print("hello world")'), you MUST fail it (0 stars).
Return ONLY valid JSON with exactly two keys: "stars" (integer 0-3) and "feedback" (string, 2-3 sentences). 3=excellent/meets all requirements, 2=good/passing but minor flaws, 0-1=fails requirements or completely unrelated. Do not return any other text or markdown.`;
    const text = await askGroq(prompt);
    res.json(JSON.parse(text.replace(/```json|```/g, "").trim()));
  } catch (error) { res.status(500).json({ message: "AI error", error: error.message }); }
});

module.exports = router;