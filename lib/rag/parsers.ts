// ============================================
// Document Parser - Multi-format support
// Optional parsers for PDF/DOCX require additional packages:
// npm install pdf-parse mammoth
// ============================================

import { Readable } from "stream";
import fs from "fs/promises";
import path from "path";

export interface ParsedDocument {
  content: string;
  metadata: DocumentMetadata;
  pages?: string[];
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  pageCount?: number;
  fileType: string;
  fileName: string;
  fileSize: number;
  encoding?: string;
  language?: string;
}

// ============================================
// Base Parser Interface
// ============================================

export interface DocumentParser {
  parse(filePath: string): Promise<ParsedDocument>;
  parseBuffer(buffer: Buffer, filename: string): Promise<ParsedDocument>;
  parseStream(stream: Readable, filename: string): Promise<ParsedDocument>;
  canParse(mimeType: string): boolean;
}

// ============================================
// Plain Text Parser
// ============================================

export class TextParser implements DocumentParser {
  private encodings = ["utf-8", "utf-16le", "utf-16be", "ascii", "iso-8859-1"];
  
  canParse(mimeType: string): boolean {
    return mimeType.startsWith("text/") || 
           mimeType === "application/json" ||
           mimeType === "application/xml";
  }
  
  async parse(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    return this.parseBuffer(buffer, path.basename(filePath));
  }
  
  async parseBuffer(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    // Try different encodings
    let content = "";
    let usedEncoding = "utf-8";
    
    for (const encoding of this.encodings) {
      try {
        content = buffer.toString(encoding as BufferEncoding);
        if (content && !content.includes("\uFFFD")) {
          usedEncoding = encoding;
          break;
        }
      } catch {
        continue;
      }
    }
    
    const lines = content.split("\n");
    let title: string | undefined;
    if (lines[0]?.startsWith("# ")) {
      title = lines[0].slice(2).trim();
    }
    
    return {
      content: content.trim(),
      metadata: {
        title,
        fileType: "text/plain",
        fileName: filename,
        fileSize: buffer.length,
        encoding: usedEncoding,
      },
    };
  }
  
  async parseStream(stream: Readable, filename: string): Promise<ParsedDocument> {
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    
    return this.parseBuffer(Buffer.concat(chunks), filename);
  }
}

// ============================================
// Markdown Parser
// ============================================

export class MarkdownParser implements DocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "text/markdown" || 
           mimeType === "text/x-markdown" ||
           /\.md$/i.test(mimeType);
  }
  
  async parse(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    return this.parseBuffer(buffer, path.basename(filePath));
  }
  
  async parseBuffer(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    const content = buffer.toString("utf-8");
    
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const frontmatterMatch = content.match(frontmatterRegex);
    
    let metadata: Record<string, any> = {};
    let mainContent = content;
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      mainContent = content.slice(frontmatterMatch[0].length);
      
      frontmatter.split("\n").forEach(line => {
        const [key, ...valueParts] = line.split(":");
        if (key && valueParts.length) {
          const value = valueParts.join(":").trim();
          try {
            metadata[key.trim()] = JSON.parse(value);
          } catch {
            metadata[key.trim()] = value;
          }
        }
      });
    }
    
    const titleMatch = mainContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : undefined;
    
    const langMatch = mainContent.match(/^```(\w+)/m);
    const language = langMatch ? langMatch[1] : undefined;
    
    return {
      content: mainContent.trim(),
      metadata: {
        title: metadata.title || title,
        author: metadata.author,
        fileType: "text/markdown",
        fileName: filename,
        fileSize: buffer.length,
        language,
        ...metadata,
      },
    };
  }
  
  async parseStream(stream: Readable, filename: string): Promise<ParsedDocument> {
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    
    return this.parseBuffer(Buffer.concat(chunks), filename);
  }
}

// ============================================
// PDF Parser - Requires pdf-parse package
// Install: npm install pdf-parse
// ============================================

export class PDFParser implements DocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "application/pdf";
  }
  
  async parse(filePath: string): Promise<ParsedDocument> {
    throw new Error(
      "PDF parsing requires 'pdf-parse' package. " +
      "Install it with: npm install pdf-parse"
    );
  }
  
  async parseBuffer(_buffer: Buffer, filename: string): Promise<ParsedDocument> {
    throw new Error(
      "PDF parsing requires 'pdf-parse' package. " +
      "Install it with: npm install pdf-parse"
    );
  }
  
  async parseStream(_stream: Readable, filename: string): Promise<ParsedDocument> {
    throw new Error(
      "PDF parsing requires 'pdf-parse' package. " +
      "Install it with: npm install pdf-parse"
    );
  }
}

// ============================================
// DOCX Parser - Requires mammoth package
// Install: npm install mammoth
// ============================================

export class DocxParser implements DocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
           /\.docx$/i.test(mimeType);
  }
  
  async parse(_filePath: string): Promise<ParsedDocument> {
    throw new Error(
      "DOCX parsing requires 'mammoth' package. " +
      "Install it with: npm install mammoth"
    );
  }
  
  async parseBuffer(_buffer: Buffer, filename: string): Promise<ParsedDocument> {
    throw new Error(
      "DOCX parsing requires 'mammoth' package. " +
      "Install it with: npm install mammoth"
    );
  }
  
  async parseStream(_stream: Readable, filename: string): Promise<ParsedDocument> {
    throw new Error(
      "DOCX parsing requires 'mammoth' package. " +
      "Install it with: npm install mammoth"
    );
  }
}

// ============================================
// CSV Parser
// ============================================

export class CSVParser implements DocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "text/csv" || 
           mimeType === "application/csv" ||
           /\.csv$/i.test(mimeType);
  }
  
  async parse(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    return this.parseBuffer(buffer, path.basename(filePath));
  }
  
  async parseBuffer(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    const content = buffer.toString("utf-8");
    const lines = content.split("\n");
    
    if (lines.length === 0) {
      return {
        content: "",
        metadata: {
          fileType: "text/csv",
          fileName: filename,
          fileSize: buffer.length,
        },
      };
    }
    
    const header = this.parseCSVLine(lines[0]);
    
    const rows: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length > 0 && values.some(v => v.trim())) {
        rows.push(header.map((h, idx) => `${h}: ${values[idx] || ""}`).join(" | "));
      }
    }
    
    return {
      content: `CSV Data: ${filename}\n\nHeaders: ${header.join(", ")}\n\n${rows.join("\n")}`,
      metadata: {
        title: filename.replace(/\.csv$/i, ""),
        fileType: "text/csv",
        fileName: filename,
        fileSize: buffer.length,
      },
    };
  }
  
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  async parseStream(stream: Readable, filename: string): Promise<ParsedDocument> {
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    
    return this.parseBuffer(Buffer.concat(chunks), filename);
  }
}

// ============================================
// Factory
// ============================================

export function getParserForMimeType(mimeType: string): DocumentParser {
  // Check parsers in order of specificity
  if (mimeType === "application/pdf") {
    return new PDFParser();
  }
  
  if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) {
    return new DocxParser();
  }
  
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") {
    return new MarkdownParser();
  }
  
  if (mimeType === "text/csv" || mimeType.includes("csv")) {
    return new CSVParser();
  }
  
  return new TextParser();
}

export function getParserForFile(filename: string): DocumentParser {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
    ".html": "text/html",
    ".htm": "text/html",
  };
  
  const mimeType = mimeTypes[ext] || "text/plain";
  return getParserForMimeType(mimeType);
}

// ============================================
// Main Parse Function
// ============================================

export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  const parser = getParserForFile(filePath);
  return parser.parse(filePath);
}

export async function parseDocumentFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<ParsedDocument> {
  const parser = getParserForFile(filename);
  return parser.parseBuffer(buffer, filename);
}

export async function parseDocumentFromStream(
  stream: Readable,
  filename: string
): Promise<ParsedDocument> {
  const parser = getParserForFile(filename);
  return parser.parseStream(stream, filename);
}
