import { prisma } from './db';

/** Link a student account to the tutor who invited them: create the tutor
 *  connection and mark the roster row active. Used by sign-up (new
 *  students) and by the join page (students who already have an account,
 *  who used to have no way to accept). Returns false if the invite is
 *  unknown or already used. */
export async function linkInvite(inviteToken: string, userId: string, name: string, email: string): Promise<boolean> {
  // Look up the roster row by token; must exist and not already active
  const rows: any[] = await prisma.$queryRaw`
    SELECT "id", "educatorId", "inviteStatus", "studentName", "studentEmail"
    FROM "educator_students"
    WHERE "inviteToken" = ${inviteToken}
  `;
  if (rows.length === 0) return false;
  const row = rows[0];
  if (row.inviteStatus === 'active') return false;

  // Create tutor connection (student → tutor) if one doesn't already exist
  const existing: any[] = await prisma.$queryRaw`
    SELECT "id" FROM "account_connections"
    WHERE "studentId" = ${userId} AND "connectedUserId" = ${row.educatorId}
  `;
  if (existing.length === 0) {
    const connId = `ac_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await prisma.$executeRaw`
      INSERT INTO "account_connections" ("id", "studentId", "connectedUserId", "role")
      VALUES (${connId}, ${userId}, ${row.educatorId}, ${'tutor'})
    `;
  }

  // Mark the roster row active and backfill missing name/email
  const newName = row.studentName && row.studentName.trim() ? row.studentName : name;
  const newEmail = row.studentEmail && row.studentEmail.trim() ? row.studentEmail : email;
  await prisma.$executeRaw`
    UPDATE "educator_students"
    SET "inviteStatus" = 'active', "linkedUserId" = ${userId},
        "studentName" = ${newName}, "studentEmail" = ${newEmail}
    WHERE "id" = ${row.id}
  `;
  return true;
}
