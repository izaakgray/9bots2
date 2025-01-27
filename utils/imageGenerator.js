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

  // Quote text
  tempCtx.font = '400 19px "Whitney"';
  const wrapWidth = CANVAS_WIDTH - NAME_OFFSET_LEFT - LEFT_PADDING;
  const wrappedText = wrapText(tempCtx, quote, wrapWidth);
  const messageHeight = wrappedText.length * LINE_HEIGHT;

  // -----------------------------
  // STEP 2) Compute final height
  // -----------------------------
  const avatarBottomY = TOP_PADDING + AVATAR_SIZE;
  // username baseline
  const usernameBaselineY = TOP_PADDING + USER_NAME_TOP_OFFSET + usernameLineHeight;
  // first message line
  const firstMessageLineY = usernameBaselineY + MESSAGE_LINE_GAP;
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
  drawWrappedText(ctx, wrappedText, userTextX, firstMessageLineY, LINE_HEIGHT);

  ctx.restore();

  // Done
  return canvas.toBuffer();
}

/* --------------------------------
 * HELPER: Wrap Text
 * -------------------------------- */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/* --------------------------------
 * HELPER: Draw Wrapped Lines
 * -------------------------------- */
function drawWrappedText(ctx, lines, x, startY, lineHeight) {
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

module.exports = { generateQuoteImage };
