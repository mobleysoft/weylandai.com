import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
export const root = path.dirname(fileURLToPath(import.meta.url));
export const now = () => execFileSync('date', ['-u', '+%Y-%m-%dT%H:%M:%SZ'], {encoding:'utf8'}).trim();
export const writeJSON = (name, data) => fs.writeFileSync(path.join(root,name), JSON.stringify(data,null,2)+'\n');
export const records = () => fs.existsSync(path.join(root,'manifest.jsonl')) ? fs.readFileSync(path.join(root,'manifest.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
export function pages(file) { try { return Number(execFileSync('pdfinfo',[file],{encoding:'utf8',timeout:60000}).match(/^Pages:\s+(\d+)/m)?.[1]) || null; } catch { return null; } }
