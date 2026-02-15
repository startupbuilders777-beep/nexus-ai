import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, config } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Validate data source type
    const validTypes = [
      "FILE_UPLOAD",
      "GOOGLE_DRIVE",
      "DROPBOX",
      "S3",
      "HUBSPOT",
      "SALESFORCE",
      "POSTGRESQL",
      "MONGODB",
      "WEBSITE",
      "API",
      "SLACK",
      "DISCORD",
      "NOTION",
      "CONFLUENCE",
      "EMAIL",
      "AUDIO",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid data source type" },
        { status: 400 }
      );
    }

    const dataSource = await prisma.dataSource.create({
      data: {
        name,
        type,
        config, // In production, encrypt this
        userId: session.user.id,
        status: "PENDING",
      },
    });

    return NextResponse.json(dataSource);
  } catch (error) {
    console.error("Create data source error:", error);
    return NextResponse.json(
      { error: "Failed to create data source" },
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
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const dataSources = await prisma.dataSource.findMany({
      where: {
        userId: session.user.id,
        ...(type && { type: type as any }),
        ...(status && { status: status as any }),
      },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(dataSources);
  } catch (error) {
    console.error("Get data sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data sources" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, config, status } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const dataSource = await prisma.dataSource.update({
      where: { id, userId: session.user.id },
      data: {
        ...(name && { name }),
        ...(config && { config }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(dataSource);
  } catch (error) {
    console.error("Update data source error:", error);
    return NextResponse.json(
      { error: "Failed to update data source" },
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Delete associated documents and chunks first
    const documents = await prisma.document.findMany({
      where: { sourceId: id },
      select: { id: true },
    });

    for (const doc of documents) {
      await prisma.chunk.deleteMany({
        where: { documentId: doc.id },
      });
    }

    await prisma.document.deleteMany({
      where: { sourceId: id },
    });

    await prisma.dataSource.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete data source error:", error);
    return NextResponse.json(
      { error: "Failed to delete data source" },
      { status: 500 }
    );
  }
}
