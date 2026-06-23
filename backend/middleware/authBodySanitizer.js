const PRIVILEGED_FIELDS = ['role', 'subRole', 'isApproved', 'permissions', 'status', 'tokenVersion'];

export const rejectPrivilegedAuthFields = (req, res, next) => {
  const body = req.body || {};
  const found = PRIVILEGED_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(body, field));

  if (found.length > 0) {
    return res.status(400).json({
      message: 'Request contains disallowed fields',
      fields: found,
    });
  }

  next();
};

export const blockLegacyAuthInProduction = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LEGACY_AUTH !== 'true') {
    return res.status(410).json({
      message: 'This authentication endpoint is no longer available. Use the OTP-based flow.',
    });
  }
  next();
};
