import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { writeFile, unlink } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sourceId = formData.get("sourceId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/markdown",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not supported" },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Max 100MB allowed" },
        { status: 400 }
      );
    }

    // Get or create default data source
    let dataSource;
    if (sourceId) {
      dataSource = await prisma.dataSource.findFirst({
        where: { id: sourceId, userId: session.user.id },
      });
    }

    if (!dataSource) {
      dataSource = await prisma.dataSource.create({
        data: {
          name: "File Uploads",
          type: "FILE_UPLOAD",
          userId: session.user.id,
          status: "CONNECTED",
        },
      });
    }

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${uuidv4()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), "uploads");
    
    try {
      await writeFile(path.join(uploadDir, filename), buffer);
    } catch (error) {
      // Create uploads directory if it doesn't exist
      await writeFile(path.join(uploadDir, filename), buffer);
    }

    // Extract text content (simplified - in production, use proper PDF/DOCX parsers)
    let content = "";
    if (file.type === "text/plain" || file.type === "text/markdown") {
      content = buffer.toString("utf-8");
    } else {
      // For other file types, we'd need proper parsers
      // For demo, we'll just store the filename
      content = `[File: ${file.name}]`;
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        name: file.name,
        type: file.type,
        size: file.size,
        content,
        status: "PENDING",
        embeddingStatus: "PENDING",
        userId: session.user.id,
        sourceId: dataSource.id,
        metadata: {
          filename,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Queue a job for processing
    await prisma.job.create({
      data: {
        type: "FILE_PROCESSING",
        status: "QUEUED",
        payload: {
          documentId: document.id,
          filename,
        },
      },
    });

    return NextResponse.json({
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        size: document.size,
        status: document.status,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");

    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        ...(sourceId && { sourceId }),
      },
      include: {
        source: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Delete document and associated chunks
    await prisma.chunk.deleteMany({
      where: { documentId },
    });

    await prisma.document.delete({
      where: { id: documentId, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
