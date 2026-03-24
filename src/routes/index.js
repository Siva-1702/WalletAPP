const { URL } = require('url');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const walletController = require('../controllers/walletController');
const kycController = require('../controllers/kycController');
const { serveUi } = require('../controllers/uiController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { readJsonBody, sendJson } = require('../utils/json');
const ApiError = require('../utils/apiError');
const env = require('../config/env');

const notFound = (res) => sendJson(res, 404, { success: false, message: 'Route not found.' });

const routeRequest = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  try {
    if (serveUi(req, res, path)) {
      return;
    }

    if (req.method === 'GET' && path === '/api/v1/health') {
      return sendJson(res, 200, {
        success: true,
        message: 'WalletAPP API is healthy.',
        diagnostics: {
          oauth: env.envDiagnostics
        }
      });
    }

    if (req.method === 'POST' && path === '/api/v1/auth/otp/request') {
      const payload = authController.requestOtp(await readJsonBody(req));
      return sendJson(res, payload.statusCode, payload.body);
    }

    if (req.method === 'POST' && path === '/api/v1/auth/otp/verify') {
      const payload = authController.verifyMobileOtp(await readJsonBody(req));
      return sendJson(res, payload.statusCode, payload.body);
    }

    if (req.method === 'GET' && path === '/api/v1/auth/me') {
      requireAuth(req);
      const payload = authController.currentUser(req.user);
      return sendJson(res, payload.statusCode, payload.body);
    }

    if (req.method === 'GET' && path === '/api/v1/auth/google') {
      const payload = authController.googleStart(url.searchParams.get('mode') || 'login');
      res.writeHead(302, { Location: payload.redirect });
      res.end();
      return;
    }

    if (req.method === 'GET' && path === '/api/v1/auth/google/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code) {
        throw new ApiError(400, 'Missing Google authorization code.');
      }
      try {
        const authPayload = await authController.googleCallback({ code, state });
        res.writeHead(302, { Location: authPayload.redirect });
      } catch (error) {
        const fallbackRedirect = `/#${new URLSearchParams({ error: error.message }).toString()}`;
        res.writeHead(302, { Location: fallbackRedirect });
      }
      res.end();
      return;
    }

    if (path.startsWith('/api/v1/users')) {
      requireAuth(req);
      if (req.method === 'GET' && path === '/api/v1/users') {
        const payload = userController.listUsers();
        return sendJson(res, payload.statusCode, payload.body);
      }
      if (req.method === 'PUT' && path === '/api/v1/users/profile/me') {
        const payload = userController.updateProfile({ userId: req.user.id, ...(await readJsonBody(req)) });
        return sendJson(res, payload.statusCode, payload.body);
      }
      const userIdMatch = path.match(/^\/api\/v1\/users\/(\d+)$/);
      if (req.method === 'GET' && userIdMatch) {
        const payload = userController.getUser(userIdMatch[1]);
        return sendJson(res, payload.statusCode, payload.body);
      }
    }

    if (path.startsWith('/api/v1/wallet')) {
      requireAuth(req);
      if (req.method === 'GET' && path === '/api/v1/wallet') {
        const payload = walletController.getWallet(req.user.id);
        return sendJson(res, payload.statusCode, payload.body);
      }
      if (req.method === 'POST' && path === '/api/v1/wallet/add-money') {
        const payload = walletController.addMoney({ userId: req.user.id, ...(await readJsonBody(req)) });
        return sendJson(res, payload.statusCode, payload.body);
      }
      if (req.method === 'POST' && path === '/api/v1/wallet/withdraw') {
        const payload = walletController.withdrawMoney({ userId: req.user.id, ...(await readJsonBody(req)) });
        return sendJson(res, payload.statusCode, payload.body);
      }
      if (req.method === 'GET' && path === '/api/v1/wallet/passbook') {
        const payload = walletController.passbook(req.user.id);
        return sendJson(res, payload.statusCode, payload.body);
      }
    }

    if (path.startsWith('/api/v1/kyc')) {
      requireAuth(req);
      if (req.method === 'GET' && path === '/api/v1/kyc') {
        const payload = kycController.getStatus(req.user.id);
        return sendJson(res, payload.statusCode, payload.body);
      }
      if (req.method === 'POST' && path === '/api/v1/kyc') {
        const payload = await kycController.submitKyc({ user: req.user, ...(await readJsonBody(req)) });
        return sendJson(res, payload.statusCode, payload.body);
      }
    }

    return notFound(res);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendJson(res, statusCode, { success: false, message: error.message || 'Internal server error.' });
  }
};

module.exports = { routeRequest };
