const fs = require('fs');
const csvParser = require('csv-parser');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

/**
 * Parses and validates CSV data for warmup accounts
 * CSV structure: email,appPassword,name
 * @param {string} filePath 
 * @returns {Promise<{validRows: Array, invalidRows: Array}>}
 */
function parseWarmupCsv(filePath) {
  return new Promise((resolve, reject) => {
    const validRows = [];
    const invalidRows = [];
    let rowNum = 1; // 1-indexed (header is usually 1, data starts at 2)

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        rowNum += 1;
        const keys = Object.keys(row);
        
        // Find fields by case-insensitive matching
        const emailKey = keys.find(k => k.trim().toLowerCase() === 'email');
        const passwordKey = keys.find(k => k.trim().toLowerCase() === 'apppassword' || k.trim().toLowerCase() === 'password');
        const nameKey = keys.find(k => k.trim().toLowerCase() === 'name');

        const email = emailKey ? String(row[emailKey]).trim() : '';
        const appPassword = passwordKey ? String(row[passwordKey]).trim() : '';
        const name = nameKey ? String(row[nameKey]).trim() : `Account ${rowNum - 1}`;

        if (!email && !appPassword) {
          // Empty row
          return;
        }

        const errors = [];
        if (!email) {
          errors.push('Missing email address');
        } else if (!isValidEmail(email)) {
          errors.push(`Invalid email format: "${email}"`);
        }

        if (!appPassword) {
          errors.push('Missing appPassword/password');
        }

        if (errors.length > 0) {
          invalidRows.push({
            row: rowNum,
            email: email || 'Unknown',
            name: name,
            errors: errors.join(', ')
          });
        } else {
          validRows.push({
            email,
            appPassword,
            name,
            status: 'Pending Verification'
          });
        }
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve({ validRows, invalidRows });
      });
  });
}

module.exports = {
  parseWarmupCsv,
  isValidEmail
};
