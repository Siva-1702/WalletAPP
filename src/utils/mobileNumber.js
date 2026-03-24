const normalizeMobileNumber = (mobileNumber) => {
  if (typeof mobileNumber !== 'string') {
    return '';
  }

  const trimmed = mobileNumber.trim();
  if (!trimmed) {
    return '';
  }

  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasLeadingPlus ? `+${digits}` : digits;
};

module.exports = { normalizeMobileNumber };
