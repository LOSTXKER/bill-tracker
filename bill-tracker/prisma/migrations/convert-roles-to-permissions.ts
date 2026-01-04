/**
 * Data Migration Script: Convert CompanyRole to Custom Permissions
 * 
 * This script converts existing role-based access to custom permissions:
 * - OWNER → isOwner = true, permissions = []
 * - MANAGER → permissions = [all module:* except delete operations]
 * - ACCOUNTANT → permissions = [read-only permissions]
 * - VIEWER → permissions = [*:read permissions]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Permission mappings for each role
const ROLE_TO_PERMISSIONS = {
  OWNER: {
    isOwner: true,
    permissions: [], // OWNER doesn't need explicit permissions
  },
  MANAGER: {
    isOwner: false,
    permissions: [
      "expenses:*",
      "incomes:*",
      "vendors:*",
      "customers:*",
      "budgets:*",
      "reports:*",
      "settings:read",
      "settings:update",
      "audit:read",
    ],
  },
  ACCOUNTANT: {
    isOwner: false,
    permissions: [
      "expenses:read",
      "incomes:read",
      "vendors:read",
      "customers:read",
      "budgets:read",
      "reports:read",
      "reports:export",
      "audit:read",
    ],
  },
  VIEWER: {
    isOwner: false,
    permissions: [
      "expenses:read",
      "incomes:read",
      "vendors:read",
      "customers:read",
      "budgets:read",
      "reports:read",
    ],
  },
};

async function migrateRolesToPermissions() {
  console.log('🚀 Starting role to permissions migration...\n');

  try {
    // Get all company access records
    const allAccess = await prisma.$queryRaw<Array<{
      id: string;
      userId: string;
      companyId: string;
      role: string;
    }>>`
      SELECT id, "userId", "companyId", role 
      FROM "CompanyAccess"
    `;

    console.log(`Found ${allAccess.length} company access records to migrate\n`);

    let updated = 0;
    let errors = 0;

    // Update each record
    for (const access of allAccess) {
      try {
        const mapping = ROLE_TO_PERMISSIONS[access.role as keyof typeof ROLE_TO_PERMISSIONS];
        
        if (!mapping) {
          console.warn(`⚠️  Unknown role: ${access.role} for access ID: ${access.id}`);
          errors++;
          continue;
        }

        await prisma.$executeRaw`
          UPDATE "CompanyAccess"
          SET 
            "isOwner" = ${mapping.isOwner},
            permissions = ${JSON.stringify(mapping.permissions)}::jsonb
          WHERE id = ${access.id}
        `;

        console.log(`✅ Migrated ${access.role} → ${mapping.isOwner ? 'OWNER' : `${mapping.permissions.length} permissions`} (ID: ${access.id})`);
        updated++;
      } catch (error) {
        console.error(`❌ Error migrating access ID ${access.id}:`, error);
        errors++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total: ${allAccess.length}\n`);

    if (errors === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with errors. Please review the logs.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateRolesToPermissions()
  .catch((error) => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  });
