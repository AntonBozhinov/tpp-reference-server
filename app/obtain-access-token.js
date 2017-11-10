const request = require('superagent');
const { decorate } = require('./certs-util');
const log = require('debug')('log');

// Use Basic Authentication Scheme: https://tools.ietf.org/html/rfc2617#section-2
const credentials = (userid, password) => {
  const basicCredentials = Buffer.from(`${userid}:${password}`).toString('base64');
  return `Basic ${basicCredentials}`;
};

/*
 * For now only support Client Credentials Grant Type (OAuth 2.0):
 * https://tools.ietf.org/html/rfc6749#section-4.4
 *
 * Assume authentication using a client_id and client_secret:
 * https://tools.ietf.org/html/rfc6749#section-2.3
 */
const postToken = async (authorisationServerHost, clientId, clientSecret, payload) => {
  try {
    const tokenUri = `${authorisationServerHost}/token`;
    const authCredentials = credentials(clientId, clientSecret);
    log(`POST to ${tokenUri}`);
    const response = await decorate(request
      .post(tokenUri)
      .set('authorization', authCredentials)
      .set('content-type', 'application/x-www-form-urlencoded')
      .send(payload));
    return response.body;
  } catch (err) {
    const error = new Error(err.message);
    error.status = err.response ? err.response.status : 500;
    throw error;
  }
};

exports.postToken = postToken;
