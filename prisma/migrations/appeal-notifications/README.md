# Appeal Notifications Migration

This migration adds the `ModerationAppealNotification` model to the database schema, enabling notifications for moderation appeal status updates.

## Changes

- Created a new `ModerationAppealNotification` table that stores notifications for users when their appeals are updated
- Added relationship between `ModerationAppeal` and `ModerationAppealNotification` models
- Added indexes for optimized querying and performance

## How to Apply This Migration

### Automatic Migration (Recommended)

Run the provided migration script:

```bash
# From the project root
npm run migrate-db
# or
yarn migrate-db
# or
pnpm migrate-db
```

### Manual Migration

If you prefer to apply the migration manually:

1. Run Prisma migration:
   ```bash
   npx prisma migrate deploy
   ```

2. Generate the updated Prisma client:
   ```bash
   npx prisma generate
   ```

## Verification

After applying the migration, you can verify it was successful by checking:

1. The `moderation_appeal_notifications` table exists in your database
2. The relationship between appeals and notifications is correctly established
3. The indexes are created for `appealId`, `userId`, and `read` columns

## Rollback

If you need to rollback this migration:

```sql
DROP TABLE IF EXISTS "moderation_appeal_notifications";
```

Note: Use rollback with caution as it will permanently delete all appeal notification data.
