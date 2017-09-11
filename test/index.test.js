const request = require('supertest');

const authorization = 'abc';
const xFapiFinancialId = 'xyz';

process.env.DEBUG = 'error';
process.env.ASPSP_READWRITE_HOST = 'example.com';
process.env.AUTHORIZATION = authorization;
process.env.X_FAPI_FINANCIAL_ID = xFapiFinancialId;

const {app} = require('../app/index.js');
const assert = require('assert');

const nock = require('nock');

const requestHeaders = {
  reqheaders: {
    'authorization': authorization,
    'x-fapi-financial-id': xFapiFinancialId,
  },
};

nock(/example\.com/, requestHeaders)
  .get('/open-banking/v1.1/accounts')
  .reply(200, {hi: 'ya'});

nock(/example\.com/)
  .get('/open-banking/non-existing')
  .reply(404);

describe('Sessions', () => {

  it('sets a session cookie for /session/make', (done) => {

    request(app)
      .get('/session/make')
      .set('Accept', 'application/json')
      .end((err, res) => {

        let mySid = res.body.sid;
        let cookies = res.headers['set-cookie'];
        let cookie = cookies && cookies[0] || '';
        let cookieSet = (cookie.indexOf('session=' + mySid) !== -1);
        assert.equal(true, cookieSet);
        done();
      });
  });

  it('destroys a session cookie at /session/delete', (done) => {

    request(app)
      .get('/session/delete')
      .set('Accept', 'application/json')
      .end((err, res) => {

        let cookies = res.headers['set-cookie'];
        let cookie = cookies && cookies[0] || '';
        let cookieUnSet = (cookie.indexOf('session=;') !== -1);
        assert.equal(true, cookieUnSet);
        done();
      });
  });
});

describe('Proxy', () => {
  it('returns proxy 200 response for /open-banking/v1.1/accounts', (done) => {
    request(app)
      .get('/open-banking/v1.1/accounts')
      .set('Accept', 'application/json')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.body.hi, 'ya');
        done();
      });
  });

  it('returns proxy 404 reponse for /open-banking/non-existing', (done) => {
    request(app)
      .get('/open-banking/non-existing')
      .set('Accept', 'application/json')
      .end((err, res) => {
        assert.equal(res.status, 404);
        done();
      });
  });

  it('should return 404 for path != /open-banking', (done) => {
    request(app)
      .get('/open-banking-invalid')
      .set('Accept', 'application/json')
      .end((err, res) => {
        assert.equal(res.status, 404);
        done();
      });
  });
});
