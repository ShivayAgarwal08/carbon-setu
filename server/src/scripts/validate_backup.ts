import fs from 'fs';
import path from 'path';

async function main() {
  const backupDir = path.join(__dirname, '../../prisma/backups');
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory not found: ${backupDir}`);
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('No JSON backup files found in backup directory');
  }

  const latestFile = files.sort().reverse()[0];
  const filePath = path.join(backupDir, latestFile);
  console.log(`Inspecting backup file: ${latestFile} (${(fs.statSync(filePath).size / 1024).toFixed(2)} KB)`);

  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  const expectedTables = [
    'GovernmentRecord',
    'EligibilityRule',
    'GovernmentDepartment',
    'OfficialContact',
    'SourceRegistry',
    'User',
  ];

  console.log('\n--- Backup Content Validation ---');
  let totalRecords = 0;
  for (const [table, rows] of Object.entries(data)) {
    if (Array.isArray(rows)) {
      console.log(`Table [${table}]: ${rows.length} records`);
      totalRecords += rows.length;
    }
  }

  for (const table of expectedTables) {
    if (!data[table]) {
      throw new Error(`Missing expected table ${table} in backup!`);
    }
  }

  console.log(`\nTotal verified records in backup: ${totalRecords}`);
  console.log('Structural JSON integrity: VALID');
}

main().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
