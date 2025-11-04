/**
 * Message Order Verification Script
 * 
 * This script verifies that messages in conversations are properly ordered
 * and checks for common issues like:
 * - Duplicate messages
 * - Incorrect ordering (timestamps)
 * - Missing user-assistant pairs
 */

import { prisma } from '../lib/prisma';

interface MessageOrderIssue {
  conversationId: string;
  issueType: 'duplicate' | 'wrong_order' | 'missing_pair' | 'time_gap';
  details: string;
  messages?: any[];
}

async function verifyMessageOrder() {
  console.log('🔍 Starting message order verification...\n');

  const issues: MessageOrderIssue[] = [];

  // Get all active conversations
  const conversations = await prisma.conversation.findMany({
    where: { isDeleted: false },
    include: {
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  console.log(`Found ${conversations.length} conversations to check\n`);

  for (const conversation of conversations) {
    const { id, title, messages, user } = conversation;
    
    if (messages.length === 0) continue;

    console.log(`\n📝 Checking conversation: ${title} (${id})`);
    console.log(`   User: ${user.email}`);
    console.log(`   Messages: ${messages.length}`);

    // Check 1: Verify timestamp ordering
    let previousTimestamp = new Date(0);
    let orderingCorrect = true;
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const currentTimestamp = new Date(message.createdAt);
      
      if (currentTimestamp < previousTimestamp) {
        orderingCorrect = false;
        issues.push({
          conversationId: id,
          issueType: 'wrong_order',
          details: `Message ${i} (${message.id}) has timestamp ${currentTimestamp.toISOString()} which is before previous message ${previousTimestamp.toISOString()}`,
          messages: [messages[i - 1], message],
        });
        console.log(`   ❌ Order issue at message ${i}`);
      }
      
      previousTimestamp = currentTimestamp;
    }

    if (orderingCorrect) {
      console.log(`   ✅ Timestamps are properly ordered`);
    }

    // Check 2: Detect duplicates
    const contentMap = new Map<string, number[]>();
    
    messages.forEach((msg, idx) => {
      const key = `${msg.role}:${msg.content}`;
      if (!contentMap.has(key)) {
        contentMap.set(key, []);
      }
      contentMap.get(key)!.push(idx);
    });

    const duplicates = Array.from(contentMap.entries()).filter(
      ([_, indices]) => indices.length > 1
    );

    if (duplicates.length > 0) {
      duplicates.forEach(([key, indices]) => {
        issues.push({
          conversationId: id,
          issueType: 'duplicate',
          details: `Found ${indices.length} duplicate messages at indices: ${indices.join(', ')}`,
        });
        console.log(`   ❌ Duplicate messages found at indices: ${indices.join(', ')}`);
      });
    } else {
      console.log(`   ✅ No duplicate messages`);
    }

    // Check 3: Verify user-assistant pairing
    let pairingCorrect = true;
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      // User messages should be followed by assistant messages (with some exceptions)
      if (message.role === 'user' && i < messages.length - 1) {
        const nextMessage = messages[i + 1];
        
        if (nextMessage.role !== 'assistant') {
          pairingCorrect = false;
          issues.push({
            conversationId: id,
            issueType: 'missing_pair',
            details: `User message at index ${i} is not followed by an assistant message`,
            messages: [message, nextMessage],
          });
          console.log(`   ⚠️  User message ${i} not followed by assistant message`);
        }
      }
    }

    if (pairingCorrect && messages.length > 0) {
      console.log(`   ✅ User-assistant pairing is correct`);
    }

    // Check 4: Look for unusual time gaps
    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i - 1].createdAt).getTime();
      const currTime = new Date(messages[i].createdAt).getTime();
      const gap = currTime - prevTime;

      // If gap is less than 10ms, might indicate timestamp collision
      if (gap < 10 && gap !== 0) {
        issues.push({
          conversationId: id,
          issueType: 'time_gap',
          details: `Very small time gap (${gap}ms) between messages ${i - 1} and ${i}`,
        });
        console.log(`   ⚠️  Small time gap (${gap}ms) between messages ${i - 1} and ${i}`);
      }

      // If gap is more than 1 hour for consecutive messages, might be unusual
      if (gap > 3600000) {
        console.log(`   ℹ️  Large time gap (${Math.round(gap / 60000)}min) between messages ${i - 1} and ${i}`);
      }
    }

    // Print message sequence
    console.log(`   📋 Message sequence:`);
    messages.slice(0, 10).forEach((msg, idx) => {
      const preview = msg.content.substring(0, 50).replace(/\n/g, ' ');
      const time = new Date(msg.createdAt).toISOString();
      console.log(`      ${idx}. [${msg.role.padEnd(9)}] ${time} - ${preview}...`);
    });

    if (messages.length > 10) {
      console.log(`      ... and ${messages.length - 10} more messages`);
    }
  }

  // Summary
  console.log('\n\n📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  if (issues.length === 0) {
    console.log('✅ No issues found! All conversations have proper message ordering.');
  } else {
    console.log(`⚠️  Found ${issues.length} issue(s):\n`);
    
    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(issuesByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    console.log('\n📋 Detailed Issues:');
    issues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. [${issue.issueType}] Conversation ${issue.conversationId}`);
      console.log(`   ${issue.details}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

// Run verification
verifyMessageOrder()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

