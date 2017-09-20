if (!process.env.DEBUG) process.env.DEBUG = 'error,log';

const express = require('express');
const bodyParser = require('body-parser');
const { session } = require('./session');
const { login } = require('./login');
const { proxyMiddleware } = require('./proxy.js');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/login', login.authenticate);
app.use('/logout', login.logout);
app.use('/open-banking', proxyMiddleware);
app.use('/session/make', session.sendNewSession);
app.use('/session/delete', session.handleDestroySessionRequest);
app.use('/session/check', session.check);

exports.app = app;
