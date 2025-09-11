import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/billing';
import { Decimal } from '@/lib/generated/prisma/runtime/library';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { amount, description } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    await billingService.addCredits(
      userId, 
      new Decimal(amount), 
      description || 'Credits purchase'
    );

    const updatedBilling = await billingService.getUserBillingInfo(userId);

    return NextResponse.json({
      message: 'Credits added successfully',
      billing: updatedBilling
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}