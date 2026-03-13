import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { initDb, fetchStandardsLibrary, lookupCachedValidation, storeAnalysis } from "./db";
import { extractDocument } from "./extract";
import { detectNormMentions } from "./llm";
import { validateNormOnline } from "./search";
import { ComplianceFinding } from "./types";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const port = Number(process.env.PORT || 8080);

app.use(cors());
app.use(express.json({ limit: "3mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "norms-compliance-engine" });
});

app.get("/api/standards", async (_req, res) => {
  const standards = await fetchStandardsLibrary();
  res.json({ standards });
});

app.post("/api/compliance/analyze", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const doc = await extractDocument(file.originalname, file.mimetype, file.buffer);
    const mentions = await detectNormMentions(doc.text);

    const findings: ComplianceFinding[] = [];

    for (const mention of mentions) {
      const cached = await lookupCachedValidation(mention.code);
      const validation = cached
        ? {
            normCode: mention.code,
            status: cached.status,
            suggestedReplacement: cached.suggested_replacement,
            sourceUrl: cached.source_url,
            sourceSnippet: cached.source_snippet,
            confidence: Math.max(cached.confidence, 0.75)
          }
        : await validateNormOnline(mention.code);

      findings.push({ ...mention, validation });
    }

    const documentId = randomUUID();
    await storeAnalysis(documentId, doc, findings);

    res.json({
      documentId,
      document: {
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        text: doc.text,
        spans: doc.spans
      },
      findings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    res.status(500).json({ error: message });
  }
});

initDb()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize DB", error);
    process.exit(1);
  });
