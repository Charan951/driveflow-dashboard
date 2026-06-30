import api from './api';

export interface CaptchaData {
  svg: string;
  signature: string;
  expiry: number;
}

export const captchaService = {
  getCaptcha: async (): Promise<CaptchaData> => {
    const response = await api.get('/captcha/generate');
    return response.data;
  },
};
