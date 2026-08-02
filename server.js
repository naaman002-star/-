// ניהול קמפוס — שרת עצמאי (Node.js + Express)
// לא תלוי ב-Claude או בכל שירות חיצוני אחר. כל הנתונים נשמרים בקובץ מקומי.

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const PASSWORD = process.env.CAMPUS_PASSWORD || ''; // אופציונלי, ראה README

app.use(express.json({ limit: '10mb' }));

// ===== הגנת סיסמה אופציונלית =====
function requireAuth(req, res, next) {
  if (!PASSWORD) return next();
  if (req.get('x-campus-password') === PASSWORD) return next();
  res.status(401).json({ error: 'unauthorized' });
}

// ===== API =====
app.get('/api/state', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) return res.json({});
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    res.type('application/json').send(raw || '{}');
  } catch (e) {
    console.error('Failed to read state:', e);
    res.status(500).json({ error: 'failed to read state' });
  }
});

app.post('/api/state', requireAuth, (req, res) => {
  try {
    const json = JSON.stringify(req.body ?? {}, null, 2);
    const tmpFile = DATA_FILE + '.tmp';
    fs.writeFileSync(tmpFile, json, 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
    writeDailyBackup(json);
    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to write state:', e);
    res.status(500).json({ error: 'failed to write state' });
  }
});

function writeDailyBackup(json) {
  try {
    const backupsDir = path.join(__dirname, 'data', 'backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    const today = new Date().toISOString().substring(0, 10);
    const backupFile = path.join(backupsDir, `state-${today}.json`);
    if (!fs.existsSync(backupFile)) {
      fs.writeFileSync(backupFile, json, 'utf-8');
    }
  } catch (e) {
    console.error('Backup failed (not fatal):', e);
  }
}

// ===== קבצים סטטיים =====
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'campus.html'));
});

// ===== הפעלה =====
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

app.listen(PORT, () => {
  console.log(`✅ ניהול קמפוס פועל על http://localhost:${PORT}`);
  if (PASSWORD) console.log('🔒 הגנת סיסמה פעילה (CAMPUS_PASSWORD מוגדר)');
  else console.log('⚠️  ללא הגנת סיסמה — מומלץ רק לשימוש ברשת ביתית או מאחורי VPN');
});
