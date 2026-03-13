import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { initDb, fetchStandardsLibrary, lookupCachedValidation, storeAnalysis } from "./db";
import { extractCustomerProfile } from "./customerProfile";
import { extractDocument } from "./extract";
import { detectNormMentions } from "./llm";
import { getReferenceProfile, scoreReferenceMatch, trainReferenceProfile } from "./referenceProfile";
import { searchApplicableStandardsOnline, validateNormOnline } from "./search";
import { ApplicableStandard, ComplianceFinding } from "./types";

const STRICT_NORM_PATTERN = /^(?:ISO|DIN|ANSI|IEC|EN|ASTM|BS|ASME|API|NFPA|IEEE)\b[\sA-Z0-9\-:.\/]*\d[\sA-Z0-9\-:.\/]*/i;

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function normalizeCode(code: string): string {
  return code.replace(/[.\s]+$/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

function matchFindingForCode(code: string, findings: ComplianceFinding[]): ComplianceFinding | null {
  const normalized = normalizeCode(code);
  return (
    findings.find((item) => normalizeCode(item.code) === normalized) ??
    findings.find((item) => normalizeCode(item.code).includes(normalized) || normalized.includes(normalizeCode(item.code))) ??
    null
  );
}

function findingFirstPage(finding: ComplianceFinding, spans: Array<{ start: number; end: number; page: number }>): number | null {
  const pages = spans
    .filter((span) => overlaps(span.start, span.end, finding.start, finding.end))
    .map((span) => span.page)
    .sort((a, b) => a - b);
  return pages[0] ?? null;
}

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

app.get("/api/compliance/reference-profile", (_req, res) => {
  res.json({ profile: getReferenceProfile() });
});

app.post("/api/compliance/train-reference", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No reference file uploaded." });
      return;
    }

    const profile = await trainReferenceProfile(file.originalname, file.buffer);
    res.json({
      ok: true,
      profile,
      summary: {
        normsLearned: profile.normCodes.length,
        keywordsLearned: profile.keywords.length,
        commentsLearned: profile.comments.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reference training failed";
    res.status(500).json({ error: message });
  }
});

app.post("/api/compliance/analyze", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const doc = await extractDocument(file.originalname, file.mimetype, file.buffer);
    const customerProfile = extractCustomerProfile(doc.text);
    const rawMentions = await detectNormMentions(doc.text);
    const mentions = rawMentions.filter((mention) => STRICT_NORM_PATTERN.test(mention.code.trim()));
    const profile = getReferenceProfile();

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

      const referenceScore = scoreReferenceMatch(mention.context, mention.code);
      const adjustedValidation = {
        ...validation,
        confidence: Math.min(0.99, validation.confidence + Math.min(0.2, referenceScore * 0.03))
      };

      findings.push({ ...mention, validation: adjustedValidation });
    }

    const documentId = randomUUID();
    await storeAnalysis(documentId, doc, findings);

    const internalStandards = (await fetchStandardsLibrary())
      .filter((item) => STRICT_NORM_PATTERN.test(item.code))
      .slice(0, 50)
      .map<ApplicableStandard>((item) => {
        const matched = matchFindingForCode(item.code, findings);
        return {
          code: item.code,
          title: item.code,
          sourceType: "internal-db",
          sourceUrl: item.source_url,
          relevanceReason: "Previously validated or extracted in internal SMS standards library",
          documentPage: matched ? findingFirstPage(matched, doc.spans) : null,
          matchedFindingId: matched?.id ?? null
        };
      });

    const onlineStandards = await searchApplicableStandardsOnline(customerProfile);
    const applicableStandardsMap = new Map<string, ApplicableStandard>();

    for (const std of [...internalStandards, ...onlineStandards]) {
      const matched = matchFindingForCode(std.code, findings);
      const enriched: ApplicableStandard = {
        ...std,
        documentPage: std.documentPage ?? (matched ? findingFirstPage(matched, doc.spans) : null),
        matchedFindingId: std.matchedFindingId ?? matched?.id ?? null
      };

      if (!applicableStandardsMap.has(std.code)) {
        applicableStandardsMap.set(std.code, enriched);
      }
    }

    const applicableStandards = [...applicableStandardsMap.values()].slice(0, 35);

    res.json({
      documentId,
      document: {
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        text: doc.text,
        spans: doc.spans
      },
      findings,
      referenceProfile: profile,
      customerProfile,
      applicableStandards
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
