// ============================================
// Text Chunking Strategies
// ============================================

export interface ChunkOptions {
  strategy: "fixed" | "semantic" | "paragraph" | "sentence";
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
  separators?: string[];
}

export interface TextChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
  metadata?: Record<string, any>;
}

const DEFAULT_SEPARATORS = [
  "\n\n\n", // Triple newline (major sections)
  "\n\n",   // Double newline (paragraphs)
  "\n",     // Single newline (lines)
  ". ",     // Sentence end
  "? ",     // Question
  "! ",     // Exclamation
  "; ",     // Semicolon
  ", ",     // Comma
  " ",      // Space (last resort)
];

// ============================================
// Fixed Size Chunking (word-based)
// ============================================

export function chunkByFixedSize(
  text: string,
  options: ChunkOptions
): TextChunk[] {
  const { chunkSize, chunkOverlap, minChunkSize } = options;
  const chunks: TextChunk[] = [];
  
  const words = text.split(/\s+/);
  let index = 0;
  let start = 0;
  
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunkWords = words.slice(start, end);
    const content = chunkWords.join(" ");
    
    // Calculate actual character positions
    const beforeText = words.slice(0, start).join(" ").length;
    const beforeSpaces = start; // Account for spaces between words
    
    chunks.push({
      content,
      index,
      startChar: beforeText + beforeSpaces,
      endChar: beforeText + beforeSpaces + content.length,
    });
    
    // Move with overlap
    if (end - start < chunkOverlap || end >= words.length) {
      break;
    }
    start += chunkSize - chunkOverlap;
    index++;
  }
  
  // Filter out small chunks and merge if needed
  return mergeSmallChunks(chunks, minChunkSize);
}

// ============================================
// Paragraph-based Chunking
// ============================================

export function chunkByParagraph(
  text: string,
  options: ChunkOptions
): TextChunk[] {
  const { chunkSize, chunkOverlap, minChunkSize, separators = DEFAULT_SEPARATORS } = options;
  const chunks: TextChunk[] = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = "";
  let currentStart = 0;
  let index = 0;
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    // If single paragraph exceeds chunkSize, use sub-chunking
    if (trimmed.length > chunkSize) {
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          index: index++,
          startChar: currentStart,
          endChar: currentStart + currentChunk.length,
        });
        currentChunk = "";
      }
      
      // Split large paragraph by sentences
      const subChunks = chunkBySentence(trimmed, {
        ...options,
        chunkSize: Math.floor(chunkSize / 2),
      });
      
      for (const sub of subChunks) {
        chunks.push({
          ...sub,
          index: index++,
          startChar: currentStart + sub.startChar,
          endChar: currentStart + sub.endChar,
        });
      }
      
      currentStart = chunks[chunks.length - 1]?.endChar || currentStart;
      continue;
    }
    
    // Check if adding this paragraph would exceed chunk size
    if (currentChunk.length + trimmed.length > chunkSize && currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: index++,
        startChar: currentStart,
        endChar: currentStart + currentChunk.length,
      });
      
      // Keep overlap from previous chunk
      const overlapText = currentChunk.slice(-chunkOverlap);
      currentChunk = overlapText + "\n\n" + trimmed;
      currentStart = currentStart + currentChunk.length - trimmed.length - overlapText.length;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: index,
      startChar: currentStart,
      endChar: currentStart + currentChunk.length,
    });
  }
  
  return mergeSmallChunks(chunks, minChunkSize);
}

// ============================================
// Sentence-based Chunking
// ============================================

export function chunkBySentence(
  text: string,
  options: ChunkOptions
): TextChunk[] {
  const { chunkSize, chunkOverlap, minChunkSize, separators = DEFAULT_SEPARATORS } = options;
  const chunks: TextChunk[] = [];
  
  // Use more granular separators for sentence splitting
  const sentenceSeparators = [". ", "? ", "! ", ".\n", "?\n", "!\n"];
  
  // Build regex for sentence splitting
  const sentenceRegex = /(?<=[.!?])\s+/;
  const sentences = text.split(sentenceRegex);
  
  let currentChunk = "";
  let currentStart = 0;
  let index = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;
    
    // If single sentence is too long, split further
    if (sentence.length > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          index: index++,
          startChar: currentStart,
          endChar: currentStart + currentChunk.length,
        });
      }
      
      // Split by smaller units (clauses)
      const subChunks = chunkByFixedSize(sentence, {
        ...options,
        chunkSize: Math.floor(chunkSize / 2),
      });
      
      for (const sub of subChunks) {
        chunks.push({
          ...sub,
          index: index++,
          startChar: currentStart + sub.startChar,
          endChar: currentStart + sub.endChar,
        });
      }
      
      currentStart = chunks[chunks.length - 1]?.endChar || currentStart;
      continue;
    }
    
    // Check if adding sentence exceeds limit
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: index++,
        startChar: currentStart,
        endChar: currentStart + currentChunk.length,
      });
      
      // Add overlap
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
      currentChunk = currentChunk.slice(overlapStart);
      currentStart += overlapStart > 0 ? chunkOverlap : 0;
    }
    
    currentChunk += (currentChunk ? ". " : "") + sentence;
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: index,
      startChar: currentStart,
      endChar: currentStart + currentChunk.length,
    });
  }
  
  return mergeSmallChunks(chunks, minChunkSize);
}

// ============================================
// Semantic Chunking (using embeddings for boundaries)
// ============================================

export async function chunkBySemantic(
  text: string,
  options: ChunkOptions,
  getEmbedding: (text: string) => Promise<number[]>
): Promise<TextChunk[]> {
  const { chunkSize, minChunkSize } = options;
  const chunks: TextChunk[] = [];
  
  // First, get paragraph-level chunks
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return chunkByFixedSize(text, options);
  }
  
  // Get embeddings for each paragraph
  const embeddings = await Promise.all(
    paragraphs.map(p => getEmbedding(p.trim()))
  );
  
  // Calculate semantic boundaries based on embedding similarity
  const boundaries = [0];
  
  for (let i = 1; i < embeddings.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);
    
    // Low similarity indicates a semantic boundary
    if (similarity < 0.5) {
      boundaries.push(i);
    }
  }
  boundaries.push(paragraphs.length);
  
  // Combine paragraphs into chunks
  let currentChunk = "";
  let currentStart = 0;
  let index = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        index: index++,
        startChar: currentStart,
        endChar: currentStart + currentChunk.length,
      });
      
      currentChunk = "";
      currentStart = 0;
    }
    
    currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    if (currentStart === 0) {
      currentStart = paragraphs.slice(0, i).join("\n\n").length + (i > 0 ? 2 : 0);
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: index,
      startChar: currentStart,
      endChar: currentStart + currentChunk.length,
    });
  }
  
  return mergeSmallChunks(chunks, minChunkSize);
}

// ============================================
// Helper Functions
// ============================================

function mergeSmallChunks(chunks: TextChunk[], minSize: number): TextChunk[] {
  if (chunks.length <= 1) return chunks;
  
  const merged: TextChunk[] = [];
  let current = chunks[0];
  
  for (let i = 1; i < chunks.length; i++) {
    const next = chunks[i];
    
    // Merge if current chunk is too small
    if (current.content.length < minSize) {
      current = {
        ...current,
        content: current.content + "\n\n" + next.content,
        endChar: next.endChar,
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  
  merged.push(current);
  return merged;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magA === 0 || magB === 0) return 0;
  
  return dotProduct / (magA * magB);
}

// ============================================
// Main Chunking Function
// ============================================

export function chunkText(
  text: string,
  options: Partial<ChunkOptions> = {}
): TextChunk[] {
  const config: ChunkOptions = {
    strategy: options.strategy || "paragraph",
    chunkSize: options.chunkSize || 1000,
    chunkOverlap: options.chunkOverlap || 200,
    minChunkSize: options.minChunkSize || 100,
    separators: options.separators || DEFAULT_SEPARATORS,
  };
  
  switch (config.strategy) {
    case "fixed":
      return chunkByFixedSize(text, config);
    case "paragraph":
      return chunkByParagraph(text, config);
    case "sentence":
      return chunkBySentence(text, config);
    case "semantic":
      // Semantic requires embeddings, handled separately
      return chunkByParagraph(text, config);
    default:
      return chunkByParagraph(text, config);
  }
}

// ============================================
// Language-specific chunking
// ============================================

export function chunkByLanguage(
  text: string,
  language: "en" | "zh" | "ja" | "ko" | "code",
  options: Partial<ChunkOptions> = {}
): TextChunk[] {
  const languageConfigs: Record<string, Partial<ChunkOptions>> = {
    en: { strategy: "paragraph", chunkSize: 1000 },
    zh: { strategy: "fixed", chunkSize: 500 }, // Character-based for CJK
    ja: { strategy: "fixed", chunkSize: 500 },
    ko: { strategy: "fixed", chunkSize: 500 },
    code: { 
      strategy: "fixed", 
      chunkSize: 500,
      separators: ["\n\n", "\n", ";", " function ", " class ", " def "],
    },
  };
  
  return chunkText(text, {
    ...languageConfigs[language],
    ...options,
  });
}
