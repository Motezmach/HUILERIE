/**
 * Emergency Data Export via API Endpoints
 * This tries to extract data through your running API
 */

import * as fs from 'fs';
import * as path from 'path';

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function emergencyExport() {
  console.log('🚨 EMERGENCY DATA EXPORT - Attempting to extract via API...\n');
  
  const baseUrl = 'http://localhost:3000';
  const data: any = {};
  const errors: string[] = [];

  // List of API endpoints to try
  const endpoints = [
    { name: 'farmers', url: '/api/farmers' },
    { name: 'boxes', url: '/api/boxes' },
    { name: 'sessions', url: '/api/sessions' },
    { name: 'purchases', url: '/api/stock/purchases' },
    { name: 'safes', url: '/api/stock/safes' },
    { name: 'sales', url: '/api/stock/sales' },
    { name: 'employees', url: '/api/employees' },
    { name: 'collectors', url: '/api/collectors' },
    { name: 'transactions', url: '/api/transactions' },
    { name: 'dashboard', url: '/api/dashboard' },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Fetching ${endpoint.name}...`);
      const result = await fetchWithRetry(`${baseUrl}${endpoint.url}`);
      data[endpoint.name] = result;
      console.log(`   ✅ ${endpoint.name}: Success`);
    } catch (error) {
      const errorMsg = `❌ ${endpoint.name}: Failed - ${error}`;
      console.log(`   ${errorMsg}`);
      errors.push(errorMsg);
      data[endpoint.name] = null;
    }
  }

  // Create backup directory
  const backupDir = path.join(process.cwd(), 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Save to JSON
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `emergency-backup-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXPORT SUMMARY:');
  console.log('='.repeat(60));
  
  Object.keys(data).forEach(key => {
    if (data[key]) {
      const count = Array.isArray(data[key]) ? data[key].length : 
                   (data[key].data && Array.isArray(data[key].data)) ? data[key].data.length : '?';
      console.log(`✅ ${key}: ${count} records`);
    } else {
      console.log(`❌ ${key}: Failed to export`);
    }
  });

  console.log('='.repeat(60));
  console.log(`\n💾 Backup saved to: ${filepath}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Some endpoints failed:');
    errors.forEach(err => console.log(`   ${err}`));
  }

  console.log('\n✨ Emergency export complete!');
  console.log('🔒 Keep this file safe - it contains all accessible data.\n');
  
  return filepath;
}

// Run the export
emergencyExport()
  .then((filepath) => {
    console.log('Success! Check the backup folder.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Emergency export failed:', error);
    process.exit(1);
  });
