const request = require('superagent');
const { setupMutualTLS } = require('../certs-util');
const { URL } = require('url');
const log = require('debug')('log');
const debug = require('debug')('debug');
const uuidv4 = require('uuid/v4');
const error = require('debug')('error');

const allowedCurrencies = ['GBP', 'EUR']; // TODO - refactor out of here

// For detailed spec see
// https://openbanking.atlassian.net/wiki/spaces/WOR/pages/23266217/Payment+Initiation+API+Specification+-+v1.1.1#PaymentInitiationAPISpecification-v1.1.1-POST/paymentsrequest

const buildPaymentsData = (opts, risk, creditorAccount, instructedAmount) => {
  if (!instructedAmount.Amount) throw new Error('InstructedAmount Amount missing');
  if (!instructedAmount.Currency) throw new Error('InstructedAmount Currency missing');
  if (!creditorAccount.SchemeName) throw new Error('CreditorAccount SchemeName missing');
  if (!creditorAccount.Identification) throw new Error('CreditorAccount Identification missing');
  if (!creditorAccount.Name) throw new Error('CreditorAccount Name missing');
  const {
    instructionIdentification,
    endToEndIdentification,
    reference,
    unstructured,
  } = opts;
  const currency = instructedAmount.Currency;

  if (allowedCurrencies.indexOf(currency) === -1) throw new Error('Disallowed currency');
  const payload = {
    Data: {
      Initiation: {
        InstructionIdentification: instructionIdentification || uuidv4().slice(0, 34),
        EndToEndIdentification: endToEndIdentification || uuidv4().slice(0, 34),
        InstructedAmount: instructedAmount,
        CreditorAccount: creditorAccount,
      },
    },
    Risk: risk || {},
  };

  // Optional Fields
  let remittanceInformation;
  if (reference || unstructured) {
    remittanceInformation = {};
    if (reference) remittanceInformation.Reference = reference;
    if (unstructured) remittanceInformation.Unstructured = unstructured;
  }
  if (remittanceInformation) payload.Data.Initiation.RemittanceInformation = remittanceInformation;

  return payload;
};

const postPayments = async (resourceServerPath, accessToken,
  headers, opts, risk, CreditorAccount, InstructedAmount, fapiFinancialId,
  idempotencyKey) => {
  try {
    const body = buildPaymentsData(opts, risk, CreditorAccount, InstructedAmount);
    const host = resourceServerPath.split('/open-banking')[0]; // eslint-disable-line

    const paymentsUri = new URL('/open-banking/v1.1/payments', host);
    log(`POST to ${paymentsUri}`);
    const payment = setupMutualTLS(request.post(paymentsUri))
      .set('authorization', `Bearer ${accessToken}`)
      .set('x-idempotency-key', idempotencyKey)
      .set('x-jws-signature', 'not-required-swagger-to-be-changed')
      .set('x-fapi-financial-id', fapiFinancialId)
      .set('content-type', 'application/json; charset=utf-8')
      .set('accept', 'application/json; charset=utf-8');
    if (headers.customerLastLogged) payment.set('x-fapi-customer-last-logged-time', headers.customerLastLogged);
    if (headers.customerIp) payment.set('x-fapi-customer-ip-address', headers.customerIp);
    if (headers.interactionId) payment.set('x-fapi-interaction-id', headers.interactionId);
    payment.send(body);
    const response = await payment;
    debug(`${response.status} response for ${paymentsUri}`);
    return response.body;
  } catch (err) {
    if (err.response && err.response.text) {
      error(err.response.text);
    }
    const e = new Error(err.message);
    e.status = err.response ? err.response.status : 500;
    throw e;
  }
};

exports.buildPaymentsData = buildPaymentsData;
exports.postPayments = postPayments;
