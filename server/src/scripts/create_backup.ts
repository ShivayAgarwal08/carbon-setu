import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma';

async function main() {
  const backupDir = path.join(__dirname, '../../prisma/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `neon_backup_${timestamp}.json`);

  console.log('Starting pre-migration logical backup...');

  const backupData: Record<string, any[]> = {
    GovernmentRecord: await prisma.governmentRecord.findMany(),
    EligibilityRule: await prisma.eligibilityRule.findMany(),
    GovernmentDepartment: await prisma.governmentDepartment.findMany(),
    OfficialContact: await prisma.officialContact.findMany(),
    SourceRegistry: await prisma.sourceRegistry.findMany(),
    RecordSource: await prisma.recordSource.findMany(),
    User: await prisma.user.findMany(),
    UserProfile: await prisma.userProfile.findMany(),
    IntakeSession: await prisma.intakeSession.findMany(),
    IntakeMessage: await prisma.intakeMessage.findMany(),
    Recommendation: await prisma.recommendation.findMany(),
    SavedRecord: await prisma.savedRecord.findMany(),
    SavedActionPlan: await prisma.savedActionPlan.findMany(),
    FeedbackReport: await prisma.feedbackReport.findMany(),
    AdminAuditLog: await prisma.adminAuditLog.findMany(),
    RecordEditHistory: await prisma.recordEditHistory.findMany(),
  };

  const counts: Record<string, number> = {};
  for (const [table, rows] of Object.entries(backupData)) {
    counts[table] = rows.length;
  }

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`Backup successfully created at: ${backupPath}`);
  console.log('Record counts backed up:', JSON.stringify(counts, null, 2));
}

main()
  .catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
