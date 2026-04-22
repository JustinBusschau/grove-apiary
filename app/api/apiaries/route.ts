import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiaries = await prisma.apiary.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(apiaries);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();
  
  const apiary = await prisma.apiary.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  });

  // After creating, update disease status for all apiaries
  await updateDiseaseStatus(session.user.id);

  return NextResponse.json(apiary);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, ...data } = await req.json();
  
  const apiary = await prisma.apiary.update({
    where: { id, userId: session.user.id },
    data,
  });

  // After updating, update disease status for all apiaries
  await updateDiseaseStatus(session.user.id);

  return NextResponse.json(apiary);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await prisma.apiary.delete({
    where: { id, userId: session.user.id },
  });

  // After deleting, update disease status for all apiaries
  await updateDiseaseStatus(session.user.id);

  return NextResponse.json({ success: true });
}

async function updateDiseaseStatus(userId: string) {
  const apiaries = await prisma.apiary.findMany({
    where: { userId },
  });

  // For each apiary, check if there's a diseased apiary within 3km
  for (const apiary of apiaries) {
    let hasDiseasedNearby = false;
    
    for (const other of apiaries) {
      if (other.id === apiary.id) continue;
      
      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        apiary.latitude,
        apiary.longitude,
        other.latitude,
        other.longitude
      );
      
      // If another apiary is diseased and within 3km
      if (distance <= 3) {
        hasDiseasedNearby = true;
        break;
      }
    }
    
    // Update the diseased flag
    if (apiary.diseased !== hasDiseasedNearby) {
      await prisma.apiary.update({
        where: { id: apiary.id },
        data: { diseased: hasDiseasedNearby },
      });
    }
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
