// Generates the served copy of the chat bot from its source document.
//
// `information bot/information bot.html` is the bot's source of record - the
// authored file, edited on its own, outside this app. Vite can only serve what
// sits under public/, so the bot has to exist in two places; this script makes
// the second one derived rather than a hand-kept duplicate, so the two cannot
// drift.
//
// It runs on `npm run build` (via prebuild) and can be run on its own with
// `npm run sync:bot` after editing the source. Never edit the generated file:
// the next build overwrites it.
//
// The only transformation is a document wrapper. The source is a fragment -
// it opens straight at <title> with no doctype - and a document without one
// renders in quirks mode, where the bot's `height:100dvh` body layout does not
// hold. Everything else is copied through byte for byte.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '../../information bot/information bot.html');
const OUT = resolve(here, '../public/chatbot/index.html');

// The bot's markup begins here; everything above it is head content.
const BODY_START = '<header class="bar">';

const fragment = await readFile(SOURCE, 'utf8');

const split = fragment.indexOf(BODY_START);
if (split === -1) {
  // Better to fail the build than to ship a bot that renders as a blank panel.
  throw new Error(
    `build-chatbot: could not find "${BODY_START}" in ${SOURCE}. ` +
      'If the bot\'s markup no longer opens with the header bar, update BODY_START.'
  );
}

const head = fragment.slice(0, split).trimEnd();
const body = fragment.slice(split).trimEnd();

// user-scalable stays on: this is a panel of text and prices, and pinching it
// is a reasonable thing to want to do on a phone.
const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
${head}
</head>
<body>
${body}
</body>
</html>
`;

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, doc, 'utf8');
console.log(`build-chatbot: wrote ${OUT} (${doc.length.toLocaleString()} bytes)`);
