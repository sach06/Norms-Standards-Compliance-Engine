import duckdb from "duckdb";
import path from "path";
import { ComplianceFinding, ExtractedDocument } from "./types";

const dbPath = path.resolve(process.cwd(), "compliance.duckdb");
const db = new duckdb.Database(dbPath);

function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, ...params, (err: Error | null) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err: Error | null, rows: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows as T[]);
    });
  });
}

export async function initDb(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR PRIMARY KEY,
      file_name VARCHAR,
      mime_type VARCHAR,
      full_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS standards (
      id VARCHAR,
      document_id VARCHAR,
      code VARCHAR,
      version VARCHAR,
      category VARCHAR,
      start_pos INTEGER,
      end_pos INTEGER,
      context TEXT,
      status VARCHAR,
      suggested_replacement VARCHAR,
      source_url VARCHAR,
      source_snippet TEXT,
      confidence DOUBLE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function storeAnalysis(documentId: string, doc: ExtractedDocument, findings: ComplianceFinding[]): Promise<void> {
  await run(
    `INSERT INTO documents (id, file_name, mime_type, full_text) VALUES (?, ?, ?, ?)`,
    [documentId, doc.fileName, doc.mimeType, doc.text]
  );

  for (const finding of findings) {
    await run(
      `
      INSERT INTO standards (
        id, document_id, code, version, category, start_pos, end_pos, context, status,
        suggested_replacement, source_url, source_snippet, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finding.id,
        documentId,
        finding.code,
        finding.version,
        finding.category,
        finding.start,
        finding.end,
        finding.context,
        finding.validation.status,
        finding.validation.suggestedReplacement,
        finding.validation.sourceUrl,
        finding.validation.sourceSnippet,
        finding.validation.confidence
      ]
    );
  }
}

export async function fetchStandardsLibrary(): Promise<
  Array<{ code: string; status: string; source_url: string; suggested_replacement: string; updated_at: string }>
> {
  return all(
    `
    SELECT code, status, source_url, suggested_replacement, MAX(created_at) AS updated_at
    FROM standards
    GROUP BY code, status, source_url, suggested_replacement
    ORDER BY updated_at DESC
    LIMIT 500
    `
  );
}

export async function lookupCachedValidation(code: string): Promise<
  | {
      status: "Up-to-date" | "Superseded" | "Unknown";
      suggested_replacement: string | null;
      source_url: string | null;
      source_snippet: string | null;
      confidence: number;
    }
  | null
> {
  const rows = await all<
    {
      status: "Up-to-date" | "Superseded" | "Unknown";
      suggested_replacement: string | null;
      source_url: string | null;
      source_snippet: string | null;
      confidence: number;
    }
  >(
    `
    SELECT status, suggested_replacement, source_url, source_snippet, confidence
    FROM standards
    WHERE code = ?
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [code]
  );

  return rows[0] ?? null;
}
