import { verifyCaptchaResponse } from '../controllers/captchaController.js';

export const verifyCaptcha = (req, res, next) => {
  const { captchaInput, captchaExpiry, captchaSignature } = req.body;

  if (!captchaInput || !captchaExpiry || !captchaSignature) {
    return res.status(400).json({
      message: 'CAPTCHA verification is required. Please solve the CAPTCHA.'
    });
  }

  const isValid = verifyCaptchaResponse(captchaInput, captchaExpiry, captchaSignature);
  if (!isValid) {
    return res.status(400).json({
      message: 'Invalid or expired CAPTCHA code. Please try again.'
    });
  }

  next();
};
