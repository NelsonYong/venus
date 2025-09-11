import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/billing';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const billingInfo = await billingService.getUserBillingInfo(userId);
    const usageStats = await billingService.getUserUsageStats(userId, 30);

    return NextResponse.json({
      billing: billingInfo,
      usage: usageStats,
    });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}