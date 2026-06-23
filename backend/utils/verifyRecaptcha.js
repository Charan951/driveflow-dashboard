const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export async function verifyRecaptcha(token, remoteip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CAPTCHA verification is not configured');
    }
    return { success: true, skipped: true };
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA token is required' };
  }

  const params = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteip) params.set('remoteip', remoteip);

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);

  if (!data.success) {
    return { success: false, error: 'CAPTCHA verification failed' };
  }

  if (data.score != null && data.score < minScore) {
    return { success: false, error: 'CAPTCHA score too low' };
  }

  return { success: true, score: data.score };
}

export const requireRecaptcha = (fieldName = 'recaptchaToken') => async (req, res, next) => {
  try {
    const result = await verifyRecaptcha(req.body?.[fieldName], req.ip);
    if (!result.success) {
      return res.status(400).json({ message: result.error || 'CAPTCHA verification failed' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message || 'CAPTCHA verification error' });
  }
};
