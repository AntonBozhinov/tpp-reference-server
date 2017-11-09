const { setupAccountRequest, clientCredentials } = require('./setup-account-request');
const { createClaims, createJsonWebSignature } = require('./authorise');
const error = require('debug')('error');
const debug = require('debug')('debug');

const registeredRedirectUrl = () => process.env.REGISTERED_REDIRECT_URL;

const statePayload = (authorisationServerId, sessionId) => {
  const state = {
    authorisationServerId,
    sessionId,
  };
  return Buffer.from(JSON.stringify(state)).toString('base64');
};

// Todo: lookup auth server via Directory and OpenIdEndpoint responses.
const authorisationServerEndpoint = async authServerId => (authServerId ? `${process.env.ASPSP_AUTH_SERVER}/authorize` : null);

const accountRequestAuthoriseConsent = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const sessionId = req.headers['authorization'];
    const { authorisationServerId } = req.body;
    const fapiFinancialId = req.headers['x-fapi-financial-id'];
    debug(`authorisationServerId: ${authorisationServerId}`);
    const accountRequestId = await setupAccountRequest(authorisationServerId, fapiFinancialId);
    const { clientId } = await clientCredentials(authorisationServerId);

    const state = statePayload(authorisationServerId, sessionId);
    const scope = 'openid accounts';
    const authServerEndpoint = await authorisationServerEndpoint(authorisationServerId);
    const payload = createClaims(
      scope, accountRequestId, clientId, authServerEndpoint,
      registeredRedirectUrl, state, createClaims,
    );
    const signature = createJsonWebSignature(payload);
    const uri =
      `${authServerEndpoint}?` +
      `redirect_url=${registeredRedirectUrl()}&` +
      `state=${state}&` +
      `clientId=${clientId}&` +
      'response_type=code&' +
      `request=${signature}&` +
      `scope=${scope}`;

    return res.redirect(302, uri);
  } catch (err) {
    error(err);
    const status = err.status ? err.status : 500;
    return res.status(status).send({ message: err.message });
  }
};

exports.statePayload = statePayload;
exports.accountRequestAuthoriseConsent = accountRequestAuthoriseConsent;
