var express = require('express')
var nodeFetch = require('node-fetch')
var Crypto = require('crypto-js')
var app = express()

//Twitter keys
const twitterConsumerSecret = 'QD21zYutGb3fAo3ajzu1P3U3EZYVP2PoPChj8LoCup2EKWNjqG';
const twitterConsumerKey = 'WV9aXjxc8U8Fc9uJh2pGFo6pD';

//Callback URL of your application, change if standalone. Otherwise this is the one for in Exponent apps.
const callbackURL = 'host.exp.exponent://oauthredirect';

app.get('/', function (req, res){
  res.send('Hello!')
});

app.listen(3000, function (){
  console.log('Twitter login app listening port 3000')
});

app.get('/getRedirectURL', function(req, res){
  //Set response to JSON
  res.setHeader('Content-Type', 'application/json');
  const requestTokenURL = '/oauth/request_token';
  const authorizationURL = '/oauth/authorize';
  const accessURL = '/oauth/access_token';
  const baseURL = 'https://api.twitter.com';

  //Request Token
  //Creates base header + Request URL
  let tokenRequestHeaderParams = createHeaderBase();
  let tokenRequestURL = baseURL + requestTokenURL;

  //Add additional parameters for signature + Consumer Key
  tokenRequestHeaderParams['oauth_consumer_key'] = twitterConsumerKey;

  //Creates copy to add additional request params, to then create the signature
  let callBackParam = { 'oauth_callback':callbackURL };
  let parametersForSignature =  Object.assign({}, callBackParam, tokenRequestHeaderParams);
  let signature = createSignature(parametersForSignature, 'POST', tokenRequestURL, twitterConsumerSecret);
  tokenRequestHeaderParams['oauth_signature'] = signature;
  //Creates the Header String, adds the callback parameter
  let headerString = createHeaderString(tokenRequestHeaderParams);
  let callbackKeyValue = ', oauth_callback="' + encodeURIComponent(callbackURL) + '"';
  let tokenRequestHeader = headerString + callbackKeyValue;
    //Request
  nodeFetch(tokenRequestURL, {method:'POST', headers:{ Authorization:tokenRequestHeader }})
  .then(response =>{
    return response.text();
  }).then(response =>{
    let textResponse = response;
    let arrayOfResponseKeyValuePairs = textResponse.split('&');
    let dictionaryOfKeyValuePairs = {};
    for (let keyPair of arrayOfResponseKeyValuePairs) {
        let keyPairArray = keyPair.split('=');
        dictionaryOfKeyValuePairs[keyPairArray[0]] = keyPairArray[1];
    }
    const authToken = dictionaryOfKeyValuePairs['oauth_token'];
    const authTokenSecret = dictionaryOfKeyValuePairs['oauth_token_secret'];

    //Token Authorization, send the URL to the native app to then display in 'Webview'
    let authURL = baseURL + authorizationURL + '?oauth_token=' + authToken;
    res.json({redirectURL:authURL});
  });
});


/**
 * Creates the Token Request OAuth header
 * @param  {[dictionary]} params OAuth params
 * @return {[string]}            OAuth header string
 */
function createHeaderString(params) {
  let headerString = 'OAuth ';
  for (var index = 0; index < Object.keys(params).length; index++) {
    let key = Object.keys(params)[index];
    let encodedKey = encodeURIComponent(key);
    let encodedValue = encodeURIComponent(params[key]);
    headerString = headerString + encodedKey + '="' + encodedValue + '"';
    if (index !== Object.keys(params).length - 1) {
        headerString = headerString + ', ';
    }
  }
  return headerString;
}

/**
 * Creates the Signature for the OAuth header
 * @param  {[Dictionary]} params     OAuth + Request Parameters
 * @param  {[string]} HTTPMethod     Type of Method (POST,GET...)
 * @param  {[string]} requestURL     Full Request URL
 * @param  {[string]} twitterConsumerSecret Twitter Consumer Secret
 * @param  {[string?]} tokenSecret   Secret token (Optional)
 * @return {[string]}                Returns the encoded/hashed signature
 */
function createSignature(params, HTTPMethod, requestURL, twitterConsumerSecret, tokenSecret) {
  let percentEncodedParameters = percentEncodeParameters(params);
  let upperCaseHTTPMethod = HTTPMethod.toUpperCase();
  let percentEncodedRequestURL = encodeURIComponent(requestURL);
  let percentEncodedConsumerSecret = encodeURIComponent(twitterConsumerSecret);

  let signatureBaseString =  upperCaseHTTPMethod + '&' + percentEncodedRequestURL + '&' + encodeURIComponent(percentEncodedParameters);
  let signingKey;
  if (tokenSecret !== undefined) {
    signingKey = percentEncodedConsumerSecret + '&' + encodeURIComponent(tokenSecret);
  } else {
    signingKey = percentEncodedConsumerSecret + '&';
    }
  let signature = Crypto.HmacSHA1(signatureBaseString, signingKey);
  let encodedSignature = Crypto.enc.Base64.stringify(signature);
  return encodedSignature;
}

/**
 * Percent encode the OAUTH Header + Request parameters for signature
 * @param  {[dictionary]} params Dictionary of params
 * @return {String}        Percent encoded parameters string
 */
function percentEncodeParameters(params) {
  let encodedParameters = '';
  for (var index = 0; index < Object.keys(params).length; index++) {
    let key = Object.keys(params)[index];
    let encodedKey = encodeURIComponent(key);
    let encodedValue = encodeURIComponent(params[key]);
    encodedParameters = encodedParameters.concat(encodedKey).concat('=').concat(encodedValue);
    if (index !== Object.keys(params).length - 1) {
        encodedParameters = encodedParameters.concat('&');
    }
  }
  return encodedParameters;
}

/**
 * Creates the header with the base parameters (Date, nonce etc...)
 * @return {header} returns a header dictionary with base fields filled.
 */
function createHeaderBase() {
  return {
    oauth_consumer_key:'',
    oauth_nonce: createNonce(),
    oauth_signature_method:'HMAC-SHA1',
    oauth_timestamp: new Date().getTime() / 1000,
    oauth_version: '1.0',
  };
}

/**
 * Creates a nonce for OAuth header
 * @return {[string]} nonce
 */
function createNonce() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}