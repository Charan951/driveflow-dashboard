import jwt from 'jsonwebtoken';

const generateToken = (id, tokenVersion = 0) => {
  const payload = { id };
  if (tokenVersion) {
    payload.tokenVersion = tokenVersion;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

export default generateToken;
