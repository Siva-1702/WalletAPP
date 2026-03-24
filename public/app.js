const state = {
  token: localStorage.getItem('wallet_token') || '',
  user: JSON.parse(localStorage.getItem('wallet_user') || 'null'),
  currentPurpose: 'REGISTER',
  devOtp: ''
};

const screens = {
  register: document.getElementById('screen-register'),
  otp: document.getElementById('screen-otp'),
  name: document.getElementById('screen-name'),
  account: document.getElementById('screen-account'),
  passbook: document.getElementById('screen-passbook'),
  addMoney: document.getElementById('screen-add-money'),
  withdraw: document.getElementById('screen-withdraw'),
  kyc: document.getElementById('screen-kyc')
};

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const showScreen = (name) => Object.entries(screens).forEach(([key, el]) => el.classList.toggle('active', key === name));
const toast = document.getElementById('toast');

const normalizeMobileNumber = (value) => {
  const trimmedValue = value.trim();
  const hasLeadingPlus = trimmedValue.startsWith('+');
  const digitsOnly = trimmedValue.replace(/\D/g, '');
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
};

const normalizeAadhaarNumber = (value) => value.replace(/\D/g, '');

const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 2500);
};

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || 'Request failed');
  }
  return body;
};

const persistAuth = (payload) => {
  state.token = payload.token;
  state.user = payload.user;
  localStorage.setItem('wallet_token', state.token);
  localStorage.setItem('wallet_user', JSON.stringify(state.user));
};

const renderAccount = async () => {
  const auth = await api('/api/v1/auth/me');
  persistAuth(auth.data);
  const wallet = auth.data.user.wallet || { balance: 0, lockedBalance: 0 };
  document.getElementById('profileName').textContent = auth.data.user.fullName || 'New Player';
  document.getElementById('profileMobile').textContent = auth.data.user.mobileNumber;
  document.getElementById('walletBalance').textContent = money(wallet.balance);
  document.getElementById('depositBalance').textContent = money(wallet.balance);
  document.getElementById('winningBalance').textContent = money(wallet.lockedBalance || 0);

  const kyc = await api('/api/v1/kyc').catch(() => ({ data: null }));
  document.getElementById('kycStatusBadge').textContent = kyc.data?.status || 'Pending';
  showScreen('account');
};

const renderPassbook = async () => {
  const payload = await api('/api/v1/wallet/passbook');
  document.getElementById('totalCredits').textContent = money(payload.data.summary.totalCredits);
  document.getElementById('totalDebits').textContent = money(payload.data.summary.totalDebits);
  const list = document.getElementById('transactionList');
  list.innerHTML = '';
  if (!payload.data.transactions.length) {
    list.innerHTML = '<div class="transaction-item">No transactions available yet.</div>';
  }
  payload.data.transactions.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'transaction-item';
    div.innerHTML = `
      <strong class="${item.type === 'CREDIT' ? 'positive' : 'negative'}">${item.type === 'CREDIT' ? '+' : '-'} ${money(item.amount)}</strong>
      <div>${item.narration}</div>
      <div class="transaction-meta">
        <span>${item.category}</span>
        <span>${new Date(item.createdAt).toLocaleString()}</span>
      </div>
    `;
    list.appendChild(div);
  });
  showScreen('passbook');
};

const requestOtp = async (purpose) => {
  const mobileInput = document.getElementById('mobileNumber');
  const mobileNumber = normalizeMobileNumber(mobileInput.value);
  mobileInput.value = mobileNumber;
  const consent = document.getElementById('adultConsent').checked;
  if (!consent) {
    showToast('Please confirm the age checkbox.');
    return;
  }
  try {
    const payload = await api('/api/v1/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber, purpose })
    });
    state.currentPurpose = purpose;
    if (purpose === 'REGISTER') {
      document.getElementById('nameInput').value = '';
    }
    state.devOtp = payload.data.otp || '';
    document.getElementById('devOtpPanel').hidden = !state.devOtp;
    document.getElementById('devOtpValue').textContent = state.devOtp;
    document.getElementById('otpInput').value = state.devOtp;
    showToast(payload.message);
    showScreen('otp');
  } catch (error) {
    showToast(error.message);
  }
};

const verifyOtp = async () => {
  const consent = document.getElementById('otpConsent').checked;
  if (!consent) {
    showToast('Please confirm the age checkbox.');
    return;
  }

  const mobileInput = document.getElementById('mobileNumber');
  const mobileNumber = normalizeMobileNumber(mobileInput.value);
  mobileInput.value = mobileNumber;
  const otp = document.getElementById('otpInput').value.trim();
  try {
    const payload = await api('/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber, purpose: state.currentPurpose, otp })
    });
    persistAuth(payload.data);
    document.getElementById('nameInput').value = payload.data.user.fullName || '';
    if (!payload.data.user.fullName) {
      showScreen('name');
      return;
    }
    await renderAccount();
  } catch (error) {
    showToast(error.message);
  }
};

const updateName = async () => {
  const fullName = document.getElementById('nameInput').value.trim();
  if (!fullName) {
    showToast('Please enter your name.');
    return;
  }
  await api('/api/v1/users/profile/me', {
    method: 'PUT',
    body: JSON.stringify({ fullName })
  });
  state.user.fullName = fullName;
  localStorage.setItem('wallet_user', JSON.stringify(state.user));
  await renderAccount();
};

const walletAction = async (endpoint, amount, narration, successMessage) => {
  const parsedAmount = Number(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    showToast('Please enter a valid amount.');
    return;
  }

  await api(`/api/v1/wallet/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify({ amount: parsedAmount, narration })
  });
  await renderAccount();
  showToast(successMessage);
};

const openAddMoney = async () => {
  try {
    const auth = await api('/api/v1/auth/me');
    const wallet = auth.data.user.wallet || { balance: 0 };
    document.getElementById('addMoneyCurrentBalance').textContent = money(wallet.balance);
    document.getElementById('addMoneyAmountInput').value = '';
    showScreen('addMoney');
  } catch (error) {
    showToast(error.message);
    logout();
  }
};

const submitAddMoney = async () => {
  try {
    const amount = document.getElementById('addMoneyAmountInput').value.trim();
    await walletAction('add-money', amount, 'Wallet top-up from UI', 'Wallet credited successfully.');
  } catch (error) {
    showToast(error.message);
  }
};

const openWithdraw = async () => {
  try {
    const auth = await api('/api/v1/auth/me');
    const wallet = auth.data.user.wallet || { lockedBalance: 0 };
    document.getElementById('withdrawCurrentBalance').textContent = money(wallet.lockedBalance || 0);
    document.getElementById('withdrawAmountInput').value = '';
    showScreen('withdraw');
  } catch (error) {
    showToast(error.message);
    logout();
  }
};

const submitWithdraw = async () => {
  try {
    const amount = Number(document.getElementById('withdrawAmountInput').value.trim());
    if (amount < 100) {
      showToast('Minimum withdrawal amount is ₹100.');
      return;
    }
    await walletAction('withdraw', amount, 'Withdrawal from UI', 'Wallet debited successfully.');
  } catch (error) {
    showToast(error.message);
  }
};

const submitKyc = async () => {
  const aadhaarInput = document.getElementById('aadhaarInput');
  const aadhaarNumber = normalizeAadhaarNumber(aadhaarInput.value);
  aadhaarInput.value = aadhaarNumber;
  try {
    const payload = await api('/api/v1/kyc', {
      method: 'POST',
      body: JSON.stringify({ aadhaarNumber })
    });
    const result = document.getElementById('kycResult');
    result.hidden = false;
    result.innerHTML = `<strong>Status:</strong> ${payload.data.record.status}<br/><strong>Reference:</strong> ${payload.data.record.verificationReference}<br/><strong>Document:</strong> ${payload.data.record.aadhaarNumberMasked}`;
    await renderAccount();
    showScreen('kyc');
  } catch (error) {
    showToast(error.message);
  }
};

const logout = () => {
  state.token = '';
  state.user = null;
  localStorage.removeItem('wallet_token');
  localStorage.removeItem('wallet_user');
  showScreen('register');
};

const enforceTokenSync = () => {
  const tokenInStorage = localStorage.getItem('wallet_token') || '';
  if (state.token && state.token !== tokenInStorage) {
    showToast('Session expired. Please login again.');
    logout();
  }
};

document.getElementById('registerBtn').addEventListener('click', () => requestOtp('REGISTER'));
document.getElementById('loginBtn').addEventListener('click', () => requestOtp('LOGIN'));
document.getElementById('submitOtpBtn').addEventListener('click', verifyOtp);
document.getElementById('saveNameBtn').addEventListener('click', updateName);
document.getElementById('editNameBtn').addEventListener('click', () => {
  document.getElementById('nameInput').value = state.user?.fullName || '';
  showScreen('name');
});
document.getElementById('addMoneyBtn').addEventListener('click', openAddMoney);
document.getElementById('withdrawBtn').addEventListener('click', openWithdraw);
document.getElementById('submitAddMoneyBtn').addEventListener('click', submitAddMoney);
document.getElementById('submitWithdrawBtn').addEventListener('click', submitWithdraw);
document.getElementById('openPassbookBtn').addEventListener('click', renderPassbook);
document.getElementById('openKycBtn').addEventListener('click', async () => {
  const kyc = await api('/api/v1/kyc').catch(() => ({ data: null }));
  document.getElementById('aadhaarInput').value = '';
  if (kyc.data?.aadhaarNumberMasked) {
    const result = document.getElementById('kycResult');
    result.hidden = false;
    result.innerHTML = `<strong>Status:</strong> ${kyc.data.status}<br/><strong>Document:</strong> ${kyc.data.aadhaarNumberMasked}`;
  } else {
    document.getElementById('kycResult').hidden = true;
  }
  showScreen('kyc');
});
document.getElementById('submitKycBtn').addEventListener('click', submitKyc);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('logoutTextBtn').addEventListener('click', logout);
Array.from(document.querySelectorAll('[data-back="account"]')).forEach((button) => button.addEventListener('click', renderAccount));
window.addEventListener('storage', enforceTokenSync);
setInterval(enforceTokenSync, 1000);

if (state.token) {
  renderAccount().catch(() => logout());
} else {
  showScreen('register');
}
