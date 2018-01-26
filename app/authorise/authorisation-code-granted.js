const env = require('env-var');
const { setTokenPayload } = require('./access-tokens');
const { setConsent } = require('./consents');
const { postToken } = require('./obtain-access-token');
const { getClientCredentials } = require('../authorisation-servers');
const { session } = require('../session');
const debug = require('debug')('debug');

const redirectionUrl = env.get('SOFTWARE_STATEMENT_REDIRECT_URL').asString();

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    debug(`#authorisationCodeGrantedHandler request payload: ${JSON.stringify(req.body)}`);
    const {
      authorisationServerId,
      authorisationCode,
      scope,
      accountRequestId,
    } = req.body;
    const { clientId, clientSecret } = await getClientCredentials(authorisationServerId);
    const accessTokenRequest = {
      grant_type: 'authorization_code',
      redirect_uri: redirectionUrl,
      code: authorisationCode,
    };

    const tokenPayload = await postToken(
      authorisationServerId, clientId,
      clientSecret, accessTokenRequest,
    );
    const sessionId = req.headers.authorization;
    debug(`sessionId: ${sessionId}`);
    debug(`tokenPayload: ${JSON.stringify(tokenPayload)}`);

    const sessionData = JSON.parse(await session.getDataAsync(sessionId));
    const username = sessionData.username;
    debug(`sessionData.username: ${sessionData.username}`);
    await setTokenPayload(sessionData.username, tokenPayload);
    const consentPayload = {
      username,
      authorisationServerId,
      scope,
      accountRequestId,
      expirationDateTime: null,
      authorisationCode,
      accessToken: tokenPayload,
    };
    await setConsent({ username, authorisationServerId, scope }, consentPayload);
    return res.status(204).send();
  } catch (err) {
    debug(`err: [${JSON.stringify(err)}]`);
    const status = err.status ? err.status : 500;
    return res.status(status).send({ message: err.message });
  }
};

exports.authorisationCodeGrantedHandler = handler;
