import mammoth from "mammoth";
import { createRequire } from "module";

// pdf-parse has a CommonJS export quirk under ESM, so we require it directly.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

/**
 * Extracts raw text from an uploaded resume file buffer.
 * Supports .pdf and .docx. Throws a descriptive error for anything else.
 */
export async function extractResumeText(buffer, mimetype, originalName) {
  const lowerName = (originalName || "").toLowerCase();

  const isPdf = mimetype === "application/pdf" || lowerName.endsWith(".pdf");
  const isDocx =
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx");

  if (isPdf) {
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length < 20) {
      throw new Error(
        "Could not extract readable text from this PDF. It may be a scanned image — please upload a text-based PDF or a .docx file instead."
      );
    }
    return data.text;
  }

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value || result.value.trim().length < 20) {
      throw new Error("Could not extract readable text from this .docx file.");
    }
    return result.value;
  }

  throw new Error(
    "Unsupported file type. Please upload a .pdf or .docx resume."
  );
}
