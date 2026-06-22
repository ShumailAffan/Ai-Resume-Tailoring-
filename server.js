import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

import { extractResumeText } from "./fileParser.js";
import { tailorResume } from "./tailorResume.js";
import { generateResumeDocx } from "./generateDocx.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "2mb" }));

// In-memory store mapping a download token -> generated docx buffer.
// Fine for a prototype; swap for S3/disk storage if traffic grows or you scale horizontally.
const generatedFiles = new Map();
const FILE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function storeFile(buffer, filename) {
  const id = uuidv4();
  generatedFiles.set(id, { buffer, filename, createdAt: Date.now() });
  setTimeout(() => generatedFiles.delete(id), FILE_TTL_MS);
  return id;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB cap
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/tailor", upload.single("resume"), async (req, res) => {
  try {
    const { jobDescription } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No resume file was uploaded." });
    }
    if (!jobDescription || jobDescription.trim().length < 20) {
      return res
        .status(400)
        .json({ error: "Please provide a job description (at least a few sentences)." });
    }

    // 1. Extract text from the uploaded resume
    const resumeText = await extractResumeText(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    // 2. Ask Claude to parse + tailor it against the JD
    const tailored = await tailorResume(resumeText, jobDescription);

    // 3. Generate a clean DOCX from the structured result
    const docxBuffer = await generateResumeDocx(tailored);

    const safeName = (tailored.contact?.name || "resume")
      .replace(/[^a-z0-9]+/gi, "_")
      .toLowerCase();
    const filename = `${safeName}_tailored_resume.docx`;

    const fileId = storeFile(docxBuffer, filename);

    res.json({
      changesSummary: tailored.changesSummary || [],
      preview: tailored, // structured data, so frontend can render a preview if desired
      downloadUrl: `/api/download/${fileId}`,
    });
  } catch (err) {
    console.error("Error in /api/tailor:", err);
    res.status(500).json({
      error: err.message || "Something went wrong while tailoring your resume.",
    });
  }
});

app.get("/api/download/:id", (req, res) => {
  const entry = generatedFiles.get(req.params.id);
  if (!entry) {
    return res
      .status(404)
      .json({ error: "This download link has expired. Please regenerate your resume." });
  }

  res.set({
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename="${entry.filename}"`,
  });
  res.send(entry.buffer);
});

app.listen(PORT, () => {
  console.log(`Resume tailor backend running on http://localhost:${PORT}`);
});
