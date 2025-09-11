import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const skip = (page - 1) * limit;

    const [usageRecords, totalCount] = await Promise.all([
      prisma.usageRecord.findMany({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.usageRecord.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      })
    ]);

    const summary = await prisma.usageRecord.aggregate({
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        totalCost: true,
      },
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      usage: usageRecords,
      summary,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching usage records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}