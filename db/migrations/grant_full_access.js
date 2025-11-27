// Script to grant full access (enterprise tier) to a specific user
const { getDb } = require('../db');

async function grantFullAccess() {
  const db = await getDb();

  try {
    console.log('Granting full access to user: cody / codyemami@gmail.com\n');

    // First, check if user exists
    const user = await db.get(
      'SELECT id, username, email, subscription_tier, subscription_status FROM users WHERE username = ? OR email = ?',
      ['cody', 'codyemami@gmail.com']
    );

    if (!user) {
      console.log('❌ User not found with username "cody" or email "codyemami@gmail.com"');
      console.log('   Please ensure the user has registered first.');
      return;
    }

    console.log('Found user:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Tier: ${user.subscription_tier || 'free'}`);
    console.log(`   Current Status: ${user.subscription_status || 'inactive'}\n`);

    // Update to enterprise tier with full access
    await db.run(
      `UPDATE users 
       SET subscription_tier = 'enterprise',
           subscription_status = 'active',
           storage_limit_gb = 1000,
           storage_used_gb = COALESCE(storage_used_gb, 0)
       WHERE id = ?`,
      [user.id]
    );

    // Also update or create subscription record
    const existingSubscription = await db.get(
      'SELECT id FROM subscriptions WHERE user_id = ?',
      [user.id]
    );

    if (existingSubscription) {
      await db.run(
        `UPDATE subscriptions 
         SET tier = 'enterprise',
             status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [user.id]
      );
      console.log('✅ Updated existing subscription record');
    } else {
      await db.run(
        `INSERT INTO subscriptions (user_id, tier, status, created_at, updated_at)
         VALUES (?, 'enterprise', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [user.id]
      );
      console.log('✅ Created new subscription record');
    }

    // Record in subscription history
    await db.run(
      `INSERT INTO subscription_history (user_id, from_tier, to_tier, change_type, created_at)
       VALUES (?, ?, 'enterprise', 'admin_grant', CURRENT_TIMESTAMP)`,
      [user.id, user.subscription_tier || 'free']
    );

    // Verify the update
    const updated = await db.get(
      'SELECT id, username, email, subscription_tier, subscription_status, storage_limit_gb FROM users WHERE id = ?',
      [user.id]
    );

    console.log('\n✅ Successfully granted full access!');
    console.log('\nUpdated user details:');
    console.log(`   Username: ${updated.username}`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   Tier: ${updated.subscription_tier}`);
    console.log(`   Status: ${updated.subscription_status}`);
    console.log(`   Storage Limit: ${updated.storage_limit_gb} GB`);
    console.log('\n🎉 User now has full enterprise access with all features enabled!');

  } catch (error) {
    console.error('❌ Error granting full access:', error);
    throw error;
  }
}

if (require.main === module) {
  grantFullAccess()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { grantFullAccess };

