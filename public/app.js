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
  kyc: document.getElementById('screen-kyc')
};

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const showScreen = (name) => Object.entries(screens).forEach(([key, el]) => el.classList.toggle('active', key === name));
const toast = document.getElementById('toast');

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
  const mobileNumber = document.getElementById('mobileNumber').value.trim();
  const consent = document.getElementById('adultConsent').checked;
  if (!consent) {
    showToast('Please confirm the age checkbox.');
    return;
  }
  const payload = await api('/api/v1/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, purpose })
  });
  state.currentPurpose = purpose;
  state.devOtp = payload.data.otp || '';
  document.getElementById('devOtpPanel').hidden = !state.devOtp;
  document.getElementById('devOtpValue').textContent = state.devOtp;
  document.getElementById('otpInput').value = state.devOtp;
  showToast(payload.message);
  showScreen('otp');
};

const verifyOtp = async () => {
  const mobileNumber = document.getElementById('mobileNumber').value.trim();
  const otp = document.getElementById('otpInput').value.trim();
  const consent = document.getElementById('otpConsent').checked;
  if (!consent) {
    showToast('Please confirm the age checkbox.');
    return;
  }
  const fullName = document.getElementById('nameInput').value.trim();
  const payload = await api('/api/v1/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, purpose: state.currentPurpose, otp, fullName: fullName || undefined })
  });
  persistAuth(payload.data);
  document.getElementById('nameInput').value = payload.data.user.fullName || '';
  if (!payload.data.user.fullName) {
    showScreen('name');
    return;
  }
  await renderAccount();
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

const walletAction = async (endpoint, action) => {
  const amount = window.prompt(`Enter amount to ${action}`, action === 'add' ? '500' : '100');
  if (!amount) {
    return;
  }
  await api(`/api/v1/wallet/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify({ amount: Number(amount), narration: action === 'add' ? 'Wallet top-up from UI' : 'Withdrawal from UI' })
  });
  await renderAccount();
  showToast(`Wallet ${action === 'add' ? 'credited' : 'debited'} successfully.`);
};

const submitKyc = async () => {
  const aadhaarNumber = document.getElementById('aadhaarInput').value.trim();
  const payload = await api('/api/v1/kyc', {
    method: 'POST',
    body: JSON.stringify({ aadhaarNumber })
  });
  const result = document.getElementById('kycResult');
  result.hidden = false;
  result.innerHTML = `<strong>Status:</strong> ${payload.data.record.status}<br/><strong>Reference:</strong> ${payload.data.record.verificationReference}<br/><strong>Document:</strong> ${payload.data.record.aadhaarNumberMasked}`;
  await renderAccount();
  showScreen('kyc');
};

const logout = () => {
  state.token = '';
  state.user = null;
  localStorage.removeItem('wallet_token');
  localStorage.removeItem('wallet_user');
  showScreen('register');
};

document.getElementById('registerBtn').addEventListener('click', () => requestOtp('REGISTER'));
document.getElementById('loginBtn').addEventListener('click', () => requestOtp('LOGIN'));
document.getElementById('submitOtpBtn').addEventListener('click', verifyOtp);
document.getElementById('saveNameBtn').addEventListener('click', updateName);
document.getElementById('editNameBtn').addEventListener('click', () => {
  document.getElementById('nameInput').value = state.user?.fullName || '';
  showScreen('name');
});
document.getElementById('addMoneyBtn').addEventListener('click', () => walletAction('add-money', 'add'));
document.getElementById('withdrawBtn').addEventListener('click', () => walletAction('withdraw', 'withdraw'));
document.getElementById('openPassbookBtn').addEventListener('click', renderPassbook);
document.getElementById('openKycBtn').addEventListener('click', async () => {
  const kyc = await api('/api/v1/kyc').catch(() => ({ data: null }));
  if (kyc.data?.aadhaarNumberMasked) {
    const result = document.getElementById('kycResult');
    result.hidden = false;
    result.innerHTML = `<strong>Status:</strong> ${kyc.data.status}<br/><strong>Document:</strong> ${kyc.data.aadhaarNumberMasked}`;
  }
  showScreen('kyc');
});
document.getElementById('submitKycBtn').addEventListener('click', submitKyc);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('logoutTextBtn').addEventListener('click', logout);
Array.from(document.querySelectorAll('[data-back="account"]')).forEach((button) => button.addEventListener('click', renderAccount));

if (state.token) {
  renderAccount().catch(() => logout());
} else {
  showScreen('register');
}
