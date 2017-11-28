const { setupPayment } = require('./setup-payment');
const { generateRedirectUri } = require('../setup-account-request');
const error = require('debug')('error');
const debug = require('debug')('debug');

const paymentAuthoriseConsent = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const sessionId = req.headers['authorization'];
    const { authorisationServerId } = req.body;
    const fapiFinancialId = req.headers['x-fapi-financial-id'];
    debug(`authorisationServerId: ${authorisationServerId}`);
    const requestId = await setupPayment(authorisationServerId, fapiFinancialId);

    const uri = await generateRedirectUri(authorisationServerId, requestId, 'openid accounts', sessionId);

    debug(`authorize URL is: ${uri}`);
    return res.send(200, { uri }); // We can't intercept a 302 !
  } catch (err) {
    error(err);
    const status = err.status ? err.status : 500;
    return res.status(status).send({ message: err.message });
  }
};

exports.paymentAuthoriseConsent = paymentAuthoriseConsent;
