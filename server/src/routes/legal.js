import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legalDir = path.resolve(__dirname, '..', '..', '..', 'docs', 'legal');

function sendDoc(res, file) {
  try {
    const text = fs.readFileSync(path.join(legalDir, file), 'utf8');
    res.type('text/plain; charset=utf-8').send(text);
  } catch (err) {
    res.status(404).send('document not found');
  }
}

router.get('/legal/privacy', (req, res) => sendDoc(res, 'privacy-policy.md'));
router.get('/legal/terms', (req, res) => sendDoc(res, 'terms-of-service.md'));

export default router;