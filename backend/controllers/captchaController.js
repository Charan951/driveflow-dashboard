import crypto from 'crypto';

const getSecret = () => process.env.CAPTCHA_SECRET || process.env.JWT_SECRET || 'fallback-captcha-secret-key';

/**
 * Generate a random captcha text
 */
const generateCaptchaText = (length = 6) => {
  // Avoid ambiguous characters like 0, O, 1, I
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
};

/**
 * Generate colored SVG for captcha
 */
const generateSvgCaptcha = (text) => {
  const width = 150;
  const height = 50;
  
  // Noise lines
  let noise = '';
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(100, 116, 139, 0.4)" stroke-width="2" />`;
  }
  
  // Noise dots
  for (let i = 0; i < 30; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = Math.floor(Math.random() * 3) + 1;
    noise += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(100, 116, 139, 0.3)" />`;
  }

  // Text elements
  let textElements = '';
  const charWidth = width / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = (i + 0.5) * charWidth + (Math.random() * 6 - 3);
    const y = 35 + (Math.random() * 10 - 5);
    const rotation = Math.floor(Math.random() * 40) - 20; // -20 to 20 degrees
    const fontSize = Math.floor(Math.random() * 8) + 24; // 24 to 32px
    const fontWeights = ['normal', 'bold', 'bolder'];
    const fontWeight = fontWeights[Math.floor(Math.random() * fontWeights.length)];
    // Random hue (0-360), medium saturation (60%), darker lightness (40%) to ensure visibility on light bg
    const color = `hsl(${Math.floor(Math.random() * 360)}, 60%, 40%)`;
    textElements += `<text x="${x}" y="${y}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" transform="rotate(${rotation}, ${x}, ${y})" font-family="monospace, sans-serif">${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; user-select: none;">
    ${noise}
    ${textElements}
  </svg>`;

  return svg;
};

/**
 * Controller endpoint to get a captcha
 */
export const getCaptcha = (req, res) => {
  try {
    const text = generateCaptchaText();
    // Expiry: 10 minutes from now
    const expiry = Date.now() + 10 * 60 * 1000;
    
    const secret = getSecret();
    const data = text.toLowerCase() + ':' + expiry;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    
    const svg = generateSvgCaptcha(text);
    
    return res.status(200).json({
      svg,
      signature,
      expiry,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate CAPTCHA' });
  }
};

/**
 * Utility to verify a captcha response
 */
export const verifyCaptchaResponse = (userInput, expiry, signature) => {
  if (!userInput || !expiry || !signature) {
    return false;
  }
  
  if (Date.now() > Number(expiry)) {
    return false; // Expired
  }
  
  const secret = getSecret();
  const data = String(userInput).trim().toLowerCase() + ':' + expiry;
  const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');
  
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
};
