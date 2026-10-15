// utils/imageGenerator.js
const path = require('path');
const {
  createCanvas,
  loadImage,
  registerFont,
} = require('canvas');

/* --------------------------------
 * 1) Register Whitney Fonts
 * -------------------------------- */
registerFont(path.join(__dirname, '..', 'fonts', 'whitneybook.otf'), {
  family: 'Whitney',
  weight: '400',
  style: 'normal',
});
registerFont(path.join(__dirname, '..', 'fonts', 'whitneymedium.otf'), {
  family: 'Whitney',
  weight: '500',
  style: 'normal',
});
registerFont(path.join(__dirname, '..', 'fonts', 'whitneysemibold.otf'), {
  family: 'Whitney',
  weight: '600',
  style: 'normal',
});
registerFont(path.join(__dirname, '..', 'fonts', 'whitneybold.otf'), {
  family: 'Whitney',
  weight: '700',
  style: 'normal',
});

/* --------------------------------
 * 2) Generate a Discord-Style Image (Avatar + Text Shadow)
 * -------------------------------- */
async function generateQuoteImage({
  avatarURL,
  nickname,
  roleColor,
  quote,
}) {
  // Typical Discord-ish colors
  const BG_COLOR = '#313338';
  const USER_TEXT_COLOR = roleColor || '#FFFFFF';
  const MESSAGE_TEXT_COLOR = '#FAFAFA';
  const TIMESTAMP_COLOR = '#CEDBEA';

  // Layout constants
  const CANVAS_WIDTH = 700;
  const AVATAR_SIZE = 56;
  const TOP_PADDING = 16;
  const LEFT_PADDING = 16;
  const BOTTOM_PADDING = 8; // minimal space at the bottom
  const NAME_OFFSET_LEFT = LEFT_PADDING + AVATAR_SIZE + 8;

  // Vertical offsets
  const USER_NAME_TOP_OFFSET = 2;
  const MESSAGE_LINE_GAP = 24;
  // If your message text is 19px, pick an appropriate line height:
  const LINE_HEIGHT = 26;

  // Fake timestamp
  const timestampText = 'Today at H8:00 PM';

  // -----------------------------
  // STEP 1) Measure text
  // -----------------------------
  const tempCanvas = createCanvas(CANVAS_WIDTH, 2000);
  const tempCtx = tempCanvas.getContext('2d');

  // Username line
  tempCtx.font = '500 20px "Whitney"';
  const usernameLineHeight = 20;

  // Timestamp measure
  tempCtx.font = '400 14px "Whitney"';
  tempCtx.measureText(timestampText);

  // Quote text (emoji-only quotes get big "jumbo" emojis, like Discord)
  tempCtx.font = '400 19px "Whitney"';
  const wrapWidth = CANVAS_WIDTH - NAME_OFFSET_LEFT - LEFT_PADDING;
  const emojiImages = await loadEmojiImages(parseQuote(quote));
  // Emojis whose image failed to load fall back to plain text
  const segments = parseQuote(quote).map(seg =>
    seg.type === 'emoji' && !emojiImages.get(seg.url) ? { type: 'text', value: seg.value } : seg
  );
  const jumbo = isJumbo(segments);
  const emojiSize = jumbo ? JUMBO_EMOJI_SIZE : EMOJI_SIZE;
  const lineHeight = jumbo ? JUMBO_EMOJI_SIZE + 4 : LINE_HEIGHT;
  const wrappedText = layoutText(tempCtx, segments, wrapWidth, emojiSize);
  // Taller jumbo lines only add space between lines, not below the last one
  const messageHeight = (wrappedText.length - 1) * lineHeight + LINE_HEIGHT;

  // -----------------------------
  // STEP 2) Compute final height
  // -----------------------------
  const avatarBottomY = TOP_PADDING + AVATAR_SIZE;
  // username baseline
  const usernameBaselineY = TOP_PADDING + USER_NAME_TOP_OFFSET + usernameLineHeight;
  // first message line (jumbo lines are taller, so push the baseline down)
  const firstMessageLineY = usernameBaselineY + MESSAGE_LINE_GAP + (lineHeight - LINE_HEIGHT);
  // last line of text
  const lastLineY = firstMessageLineY + messageHeight;
  // whichever is lower: bottom of avatar or last line
  const contentBottomY = Math.max(avatarBottomY, lastLineY);
  const totalHeight = contentBottomY + BOTTOM_PADDING;

  // -----------------------------
  // STEP 3) Create the final canvas
  // -----------------------------
  const canvas = createCanvas(CANVAS_WIDTH, totalHeight);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // -----------------------------
  // STEP 4) Draw avatar with a subtle shadow
  // -----------------------------
  const avatarX = LEFT_PADDING;
  const avatarY = TOP_PADDING;

  ctx.save();

  // 4a) Enable shadow for the circular shape
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'; // 10% black
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 2;

  // 4b) Draw a filled circle so the shadow is visible
  ctx.beginPath();
  ctx.arc(
    avatarX + AVATAR_SIZE / 2,
    avatarY + AVATAR_SIZE / 2,
    AVATAR_SIZE / 2,
    0,
    Math.PI * 2,
    true
  );
  ctx.closePath();

  // Fill with a neutral color (white or something) so the shadow is drawn
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // 4c) Now clip the same circle region and draw the avatar
  ctx.clip();

  try {
    const avatarImg = await loadImage(avatarURL);
    ctx.drawImage(avatarImg, avatarX, avatarY, AVATAR_SIZE, AVATAR_SIZE);
  } catch (err) {
    // If avatar fails, skip it
  }

  ctx.restore();

  // -----------------------------
  // STEP 5) Draw text (username, timestamp, quote) with its own shadow
  // -----------------------------
  ctx.save();

  // 5a) Subtle text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'; // 10% black
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 0;

  // Username
  ctx.font = '500 20px "Whitney"';
  ctx.fillStyle = USER_TEXT_COLOR;
  const userTextX = NAME_OFFSET_LEFT;
  const userTextY = usernameBaselineY;
  ctx.fillText(nickname, userTextX, userTextY);

  // measure width for timestamp
  const userNameWidth = ctx.measureText(nickname).width;

  // Timestamp
  ctx.font = '400 14px "Whitney"';
  ctx.fillStyle = TIMESTAMP_COLOR;
  // ~3px above baseline
  ctx.fillText(timestampText, userTextX + userNameWidth + 8, userTextY - 3);

  // Message text
  ctx.font = '400 19px "Whitney"';
  ctx.fillStyle = MESSAGE_TEXT_COLOR;
  drawWrappedText(ctx, wrappedText, userTextX, firstMessageLineY, lineHeight, emojiSize, emojiImages);

  ctx.restore();

  // Done
  return canvas.toBuffer();
}

/* --------------------------------
 * HELPER: Parse quote into text + emoji segments
 * -------------------------------- */
// Discord renders emojis with Twemoji, so we draw the same images
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/';
const EMOJI_SIZE = 26; // ~1.375em at 19px, same ratio Discord uses
const JUMBO_EMOJI_SIZE = 57; // 3em at 19px, Discord's size for emoji-only messages
const JUMBO_EMOJI_MAX = 30; // Discord stops jumbo-ing past this many emojis

// Custom Discord emojis (<:name:id>, <a:name:id>) and Unicode emojis,
// including skin tones, ZWJ sequences, flags, keycaps and tag flags.
const EMOJI_REGEX =
  /<(a?):(\w+):(\d+)>|\p{Regional_Indicator}{2}|[#*0-9]️?⃣|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})*(?:[\u{E0020}-\u{E007E}]+\u{E007F})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})*)*/gu;

function parseQuote(text) {
  const segments = [];
  let lastIndex = 0;

  for (const match of text.matchAll(EMOJI_REGEX)) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[3]) {
      segments.push({
        type: 'emoji',
        value: `:${match[2]}:`, // fallback text if the image fails
        url: `https://cdn.discordapp.com/emojis/${match[3]}.png`,
      });
    } else {
      segments.push({ type: 'emoji', value: match[0], url: twemojiURL(match[0]) });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}

function twemojiURL(emoji) {
  // Twemoji file names drop the FE0F variation selector unless it's a ZWJ sequence
  const raw = emoji.includes('‍') ? emoji : emoji.replace(/️/g, '');
  const codepoints = Array.from(raw, char => char.codePointAt(0).toString(16));
  return `${TWEMOJI_BASE}${codepoints.join('-')}.png`;
}

function isJumbo(segments) {
  const emojiCount = segments.filter(seg => seg.type === 'emoji').length;
  const onlyEmojis = segments.every(seg => seg.type === 'emoji' || !seg.value.trim());
  return onlyEmojis && emojiCount > 0 && emojiCount <= JUMBO_EMOJI_MAX;
}

/* --------------------------------
 * HELPER: Load emoji images (cached across calls)
 * -------------------------------- */
const emojiCache = new Map();

async function loadEmojiImages(segments) {
  const urls = [...new Set(segments.filter(seg => seg.type === 'emoji').map(seg => seg.url))];
  const images = new Map();

  await Promise.all(
    urls.map(async url => {
      if (!emojiCache.has(url)) {
        emojiCache.set(url, loadImage(url).catch(() => null));
      }
      const image = await emojiCache.get(url);
      // Don't keep failures cached, so a temporary network blip can recover
      if (!image) emojiCache.delete(url);
      images.set(url, image);
    })
  );
  return images;
}

/* --------------------------------
 * HELPER: Lay out text + emojis into lines
 * -------------------------------- */
// Each line is a list of runs: { type: 'text' | 'emoji', value, url, width }
function layoutText(ctx, segments, maxWidth, emojiSize) {
  const lines = [];
  const emojiWidth = emojiSize + 2; // small gap either side, like Discord
  const spaceWidth = ctx.measureText(' ').width;

  // Split into paragraphs (on \n), then into words. A "word" is every run
  // between spaces, so "hater💯." stays together like it does in Discord.
  const paragraphs = [[[]]];
  for (const seg of segments) {
    if (seg.type === 'emoji') {
      const words = paragraphs[paragraphs.length - 1];
      words[words.length - 1].push({ ...seg, width: emojiWidth });
      continue;
    }

    seg.value.split(/(\n|[^\S\n]+)/).forEach(part => {
      const words = paragraphs[paragraphs.length - 1];
      if (part === '\n') {
        paragraphs.push([[]]);
      } else if (/^\s+$/.test(part)) {
        words.push([]);
      } else if (part) {
        words[words.length - 1].push({ type: 'text', value: part, width: ctx.measureText(part).width });
      }
    });
  }

  for (const words of paragraphs) {
    let line = [];
    let lineWidth = 0;

    for (const word of words) {
      if (word.length === 0) continue;
      const wordWidth = word.reduce((sum, run) => sum + run.width, 0);
      const gap = line.length ? spaceWidth : 0;

      if (lineWidth + gap + wordWidth <= maxWidth) {
        if (gap) line.push({ type: 'text', value: ' ', width: spaceWidth });
        line.push(...word);
        lineWidth += gap + wordWidth;
        continue;
      }

      // Doesn't fit: start a new line
      if (line.length) {
        lines.push(line);
        line = [];
        lineWidth = 0;
      }

      if (wordWidth <= maxWidth) {
        line.push(...word);
        lineWidth = wordWidth;
        continue;
      }

      // Word is wider than a whole line (e.g. a long link): break it by character
      for (const run of word) {
        const pieces = run.type === 'emoji' ? [run] : Array.from(run.value, char => ({
          type: 'text',
          value: char,
          width: ctx.measureText(char).width,
        }));

        for (const piece of pieces) {
          if (lineWidth + piece.width > maxWidth && line.length) {
            lines.push(line);
            line = [];
            lineWidth = 0;
          }
          line.push(piece);
          lineWidth += piece.width;
        }
      }
    }

    // Keep empty lines from blank lines in the quote
    lines.push(line);
  }

  return lines;
}

/* --------------------------------
 * HELPER: Draw Wrapped Lines
 * -------------------------------- */
function drawWrappedText(ctx, lines, x, startY, lineHeight, emojiSize, emojiImages) {
  for (let i = 0; i < lines.length; i++) {
    const baselineY = startY + i * lineHeight;
    let cursorX = x;

    for (const run of lines[i]) {
      if (run.type === 'emoji') {
        // Sit the emoji slightly below the baseline so it centres on the text
        const emojiY = baselineY - emojiSize + Math.round(emojiSize * 0.22);
        ctx.drawImage(emojiImages.get(run.url), cursorX + 1, emojiY, emojiSize, emojiSize);
      } else {
        ctx.fillText(run.value, cursorX, baselineY);
      }
      cursorX += run.width;
    }
  }
}

module.exports = { generateQuoteImage };
