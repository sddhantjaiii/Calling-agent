#!/usr/bin/env ts-node

/**
 * Test script to debug credit transaction creation
 */

import { UserModel } from '../models/User';
import { CreditTransactionModel } from '../models/CreditTransaction';

async function testCreditTransaction(): Promise<void> {
  try {
    console.log('🧪 Testing credit transaction creation...');

    const userModel = new UserModel();
    const creditTransactionModel = new CreditTransactionModel();

    // Get a test user
    const testUserId = 'd48f98ae-2f82-4b04-bf0c-0dbde8065939';
    const user = await userModel.findById(testUserId);

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('✅ Found test user:', user.email, 'Credits:', user.credits);

    // Test updating credits
    console.log('🔄 Testing credit update...');
    const newBalance = user.credits + 10;
    const updatedUser = await userModel.updateCredits(testUserId, newBalance);

    if (!updatedUser) {
      console.log('❌ Failed to update user credits');
      return;
    }

    console.log('✅ Credits updated successfully. New balance:', updatedUser.credits);

    // Test creating credit transaction
    console.log('🔄 Testing credit transaction creation...');
    
    try {
      const transaction = await creditTransactionModel.create({
        user_id: testUserId,
        type: 'admin_adjustment',
        amount: 10,
        balance_after: newBalance,
        description: 'Test adjustment',
        created_by: undefined // Test with undefined instead of null
      });

      console.log('✅ Credit transaction created successfully:', transaction.id);
    } catch (transactionError: any) {
      console.error('❌ Credit transaction creation failed:', transactionError);
      
      // Try with a valid admin user ID
      console.log('🔄 Trying with admin user ID...');
      const adminUserId = 'ceca3eaf-09e8-42ff-a289-2a81305f11af';
      
      try {
        const transaction2 = await creditTransactionModel.create({
          user_id: testUserId,
          type: 'admin_adjustment',
          amount: 5,
          balance_after: newBalance + 5,
          description: 'Test adjustment with admin',
          created_by: adminUserId
        });

        console.log('✅ Credit transaction with admin created successfully:', transaction2.id);
      } catch (adminTransactionError) {
        console.error('❌ Credit transaction with admin also failed:', adminTransactionError);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testCreditTransaction()
    .then(() => {
      console.log('🎉 Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error.message);
      process.exit(1);
    });
}