const { postToken } = require('../obtain-access-token');
const { postAccountRequests } = require('./account-requests');
const { getClientCredentials } = require('../authorisation-servers');
const env = require('env-var');
const debug = require('debug')('debug');

const authServer = env.get('ASPSP_AUTH_SERVER').asString();

// Todo: lookup auth server via Directory and OpenIdEndpoint responses.
const authorisationServerHost = async authServerId => (authServerId ? authServer : null);

// Todo: lookup resource server via Directory and OpenIdEndpoint responses.
const resourceServerPath = async (authorisationServerId) => {
  if (authorisationServerId) {
    // todo store and retrieve host and apiVersion in config keyed by authorisationServerId
    const host = env.get('ASPSP_RESOURCE_SERVER').asString();
    const apiVersion = 'v1.1';
    return `${host}/open-banking/${apiVersion}`;
  }
  return null;
};

const validateParameters = (authorisationServerId, fapiFinancialId) => {
  let error;
  if (!fapiFinancialId) {
    error = new Error('fapiFinancialId missing from request payload');
    error.status = 400;
  }
  if (!authorisationServerId) {
    error = new Error('authorisationServerId missing from request payload');
    error.status = 400;
  }
  if (error) {
    throw error;
  }
};

// Returns access-token when request successful
const createAccessToken = async (authorisationServerId) => {
  const authorisationServer = await authorisationServerHost(authorisationServerId);
  const { clientId, clientSecret } = await getClientCredentials(authorisationServerId);
  const accessTokenPayload = {
    scope: 'accounts',
    grant_type: 'client_credentials',
  };

  const response = await postToken(
    authorisationServer,
    clientId,
    clientSecret,
    accessTokenPayload,
  );
  return response.access_token;
};

// Returns accountRequestId when request successful
const createAccountRequest = async (authorisationServerId, accessToken, fapiFinancialId) => {
  const resourcePath = await resourceServerPath(authorisationServerId);
  const response = postAccountRequests(resourcePath, accessToken, fapiFinancialId);
  debug(`account-requests response: ${response.body}`);
  if (response.Data && response.Data.Status === 'AwaitingAuthorisation') {
    return response.Data.AccountRequestId;
  }
  return null;
};

const setupAccountRequest = async (authorisationServerId, fapiFinancialId) => {
  validateParameters(authorisationServerId, fapiFinancialId);
  const accessToken = await createAccessToken(authorisationServerId);
  const accountRequestId = await createAccountRequest(
    authorisationServerId,
    accessToken,
    fapiFinancialId,
  );
  return accountRequestId;
};

exports.setupAccountRequest = setupAccountRequest;
exports.clientCredentials = getClientCredentials;
