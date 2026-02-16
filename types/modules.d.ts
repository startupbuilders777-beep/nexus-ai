// Type declarations for modules without types

declare module "pdf-parse" {
  interface PDFInfo {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    Trapped?: string;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: unknown;
    text: string;
    version: string;
  }

  interface PDFParseOptions {
    max?: number;
    min?: number;
    normalize?: boolean;
    lineprinter?: boolean;
    layout?: boolean;
    rotatable?: boolean;
    scale?: number;
    greyscale?: boolean;
    monose?: boolean;
    field层次?: boolean;
    defer_text_processing?: boolean;
    replace_newlines?: boolean;
    replace_whitespace?: boolean;
    verbosity?: number;
    width?: number;
    height?: number;
    weight?: number;
    javascript?: boolean;
    css?: boolean;
    iframes?: boolean;
    only2d?: boolean;
    correct_links?: boolean;
    remove_invalid?: boolean;
    rendertext?: boolean;
  }

  function pdf(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFData>;
  export default pdf;
}

declare module "mammoth" {
  interface RawTextOptions {
    stripEmptyLines?: boolean;
  }

  interface RawTextResult {
    value: string;
  }

  interface ExtractResult<T> {
    value: T;
  }

  interface DocumentProperties {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    category?: string;
    lastModifiedBy?: string;
    revision?: string;
    created?: Date;
    lastModified?: Date;
  }

  function extractRawText(options: { buffer: Buffer }): Promise<RawTextResult>;
  function extractMetadata(options: { buffer: Buffer }): Promise<ExtractResult<DocumentProperties>>;
  function convertToHtml(options: { buffer: Buffer }): Promise<ExtractResult<string>>;
  function convertToMarkdown(options: { buffer: Buffer }): Promise<ExtractResult<string>>;
}

declare module "@xenova/transformers" {
  export interface PipelineOptions {
    pooling?: "mean" | "cls" | "max";
    normalize?: boolean;
    quantize?: boolean;
  }

  export interface PipelineOutput {
    data: Float32Array;
    dataSync(): Float32Array;
  }

  export interface EnvConfig {
    allowLocalModels?: boolean;
    useBrowserCache?: boolean;
    cacheFolder?: string;
  }

  export function pipeline(
    task: string,
    model?: string,
    options?: PipelineOptions
  ): Promise<any>;

  export const env: EnvConfig;
}

declare module "@pinecone-database/pinecone" {
  interface PineconeConfiguration {
    apiKey: string;
    environment: string;
    projectName?: string;
  }

  interface IndexOptions {
    name: string;
    dimension: number;
    metric?: "cosine" | "euclidean" | "dotproduct";
    pods?: number;
    replicas?: number;
    podType?: string;
  }

  interface UpsertOptions {
    vectors: {
      id: string;
      values: number[];
      metadata?: Record<string, any>;
    }[];
    namespace?: string;
  }

  interface QueryOptions {
    vector: number[];
    topK: number;
    includeMetadata?: boolean;
    includeValues?: boolean;
    filter?: Record<string, any>;
    namespace?: string;
  }

  interface QueryMatch {
    id: string;
    score: number;
    values?: number[];
    metadata?: Record<string, any>;
  }

  interface QueryResponse {
    matches: QueryMatch[];
    namespace: string;
  }

  interface IndexDescription {
    name: string;
    dimension: number;
    metric: string;
    status: {
      ready: boolean;
      state: string;
    };
  }

  interface IndexStats {
    namespaces: Record<string, { vectorCount: number }>;
    dimension: number;
    indexFullness: number;
    totalVectorCount: number;
  }

  interface Index {
    upsert(options: UpsertOptions): Promise<{ upsertedCount: number }>;
    query(options: QueryOptions): Promise<QueryResponse>;
    describeIndexStats(): Promise<IndexStats>;
    deleteOne(id: string): Promise<void>;
    deleteMany(filter: Record<string, any>): Promise<void>;
  }

  class Pinecone {
    constructor(config: PineconeConfiguration);
    Index(name: string): Index;
    listIndexes(): Promise<IndexDescription[]>;
    createIndex(options: IndexOptions): Promise<void>;
    deleteIndex(name: string): Promise<void>;
  }

  export { Pinecone, Index, IndexDescription, IndexStats };
}

declare module "@qdrant/js-client-rest" {
  interface QdrantConfig {
    url: string;
    apiKey?: string;
    port?: number | string;
  }

  interface SearchParams {
    vector: number[];
    limit: number;
    offset?: number;
    filter?: Record<string, any>;
    withPayload?: boolean;
    withVector?: boolean;
    scoreThreshold?: number;
  }

  interface SearchResult {
    id: string | number;
    version: number;
    score: number;
    payload?: Record<string, any>;
    vector?: number[];
  }

  interface CollectionInfo {
    name: string;
    vectors_count: number;
    points_count: number;
    status: string;
  }

  class QdrantClient {
    constructor(config: QdrantConfig);
    getCollection(name: string): Promise<CollectionInfo>;
    search(collectionName: string, params: SearchParams): Promise<SearchResult[]>;
    upsert(collectionName: string, params: { points: any[] }): Promise<{ operation_id: number }>;
    delete(collectionName: string, params: any): Promise<{ operation_id: number }>;
  }

  export { QdrantClient };
}

declare module "weaviate-client" {
  interface WeaviateConfig {
    url: string;
    headers?: Record<string, string>;
  }

  interface ConnectResponse {
    collections: Collections;
  }

  interface Collections {
    get(name: string): Collection;
    create(options: any): Promise<void>;
  }

  interface Collection {
    name: string;
    data: DataAPI;
    aggregate: AggregateAPI;
    query: QueryAPI;
  }

  interface DataAPI {
    insert(properties: Record<string, any>): Promise<any>;
    insertMany(objects: any[]): Promise<any>;
    deleteByID(id: string): Promise<void>;
    deleteMany(filter: any): Promise<void>;
  }

  interface AggregateAPI {
    overAll(): { totalCount: () => Promise<number> };
  }

  interface QueryAPI {
    nearVector(vector: number[], options?: any): { objects: any[] };
    nearText(text: string[], options?: any): { objects: any[] };
    get(limit?: number): { objects: any[] };
  }

  function connectToCustom(config: WeaviateConfig): Promise<ConnectResponse>;
  
  export default { connectToCustom };
}
