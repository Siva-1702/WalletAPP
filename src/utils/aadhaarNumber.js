const normalizeAadhaarNumber = (aadhaarNumber) => {
  if (typeof aadhaarNumber !== 'string') {
    return '';
  }

  return aadhaarNumber.replace(/\D/g, '');
};

module.exports = { normalizeAadhaarNumber };
