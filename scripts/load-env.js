'use strict';

const fs = require('node:fs');

function parseEnv(source) {
  const values = {};
  for (const line of String(source).split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
    if (!match) continue;

    const [, key] = match;
    let value = (match[2] || '').trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      const end = value.lastIndexOf(quote);
      if (end > 0) {
        value = value.slice(1, end);
        if (quote === '"') {
          value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
      } else {
        value = value.slice(1);
      }
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    values[key] = value;
  }
  return values;
}

function loadEnv(filePath, target = process.env, { override = false } = {}) {
  const parsed = parseEnv(fs.readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (override || target[key] === undefined) target[key] = value;
  }
  return Object.keys(parsed);
}

module.exports = { parseEnv, loadEnv };
