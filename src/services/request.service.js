'use strict';

const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const { omit } = require('../utilities');

/**
 * @module request
 */

const instance = axios.create();

axiosCookieJarSupport(instance);

/**
 * @method interceptRequest
 * @private
 * @description handles request data before it is sent to the resource. This method
 * will eventually be used to cancel the request and return the configuration body.
 * This method will test the url for an http proticol and reject if none exist.
 * @param  {Object} config The axios request configuration
 * @return {Promise}      the request configuration object
 */

const interceptRequest = config =>
  config.url.startsWith('http')
    ? omit(config, ['params.request', 'data.request'])
    : Promise.reject({
        message: 'The Data API Requires https or http',
        code: '1630'
      });

/**
 * @method handleResponseError
 * @private
 * @description This method evaluates the error response. This method will substitute
 * a non json error or a bad gateway status with a json code and message error. This
 * method will add an expired property to the error response if it recieves a invalid
 * token response.
 * @param  {Object} error The error recieved from the requested resource.
 * @return {Promise}      A promise rejection containing a code and a message
 */

const handleResponseError = error => {
  if (!error.response) {
    return Promise.reject(error);
  } else if (
    error.response.status === 502 ||
    typeof error.response.data !== 'object'
  ) {
    return Promise.reject({
      message: 'The Data API is currently unavailable',
      code: '1630'
    });
  } else if (
    error.response.status === 401 &&
    error.request.path.includes('RCType=EmbeddedRCFileProcessor')
  ) {
    return Promise.reject({
      message: 'FileMaker WPE rejected the request',
      code: '9'
    });
  } else if (error.response.data.messages[0].code === '952') {
    return Promise.reject(
      Object.assign(error.response.data.messages[0], { expired: true })
    );
  } else {
    return Promise.reject(error.response.data.messages[0]);
  }
};

instance.interceptors.request.use(interceptRequest);
instance.interceptors.response.use(response => response, handleResponseError);

module.exports = { instance };
