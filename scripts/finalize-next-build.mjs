import { readFile, unlink } from 'node:fs/promises';
// Next 14 emits this detail file while prerendering, even for a full-stack build.
// The Pages adapter's Vercel builder mistakes it for a user-requested static export.
const manifest = JSON.parse(await readFile('.next/required-server-files.json', 'utf8'));
if (manifest.config.output !== 'export') {
  await unlink('.next/export-detail.json').catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
}
