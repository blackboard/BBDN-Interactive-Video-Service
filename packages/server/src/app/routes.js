import cookieParser from "cookie-parser";
import ltiAdv from "./lti-adv";
import deepLinkService from "./deep-link-service";
import config from "../config/config";
import axios from "axios";
import redisUtil from '../util/redisutil';
import uuid from 'uuid';

const PUBLIC_KEY_SET = "{\n" +
  "  \"keys\": [\n" +
  "    {\n" +
  "      \"kty\": \"RSA\",\n" +
  "      \"e\": \"AQAB\",\n" +
  "      \"use\": \"sig\",\n" +
  "      \"kid\": \"12345\",\n" +
  "      \"alg\": \"RS256\",\n" +
  "      \"n\": \"sB3jz6IZBOuerqkZ-RUpCoZuNeaL2A2ODOC4W9dJcL649-dYGzJMR6R8chuOL5EQAEZyzbxGU49rkLCa0d0yt4PIJE_k86Ib9PBZhhyj1WuIPHYuJqzPlwdHXJDSA6pEdSsOS5fWCLs75IETnbmPtV0wM8C32QHd6U8M2iZSmy5XFut5H-DisplW7rTaeCzVIqZXEnvBp0ZsxVyXkYJj1emnhX0TqgsdQy8H7evVvM2--dIBIENbKmxNQQH8pwTdRgMWJqAFjo8Tkj2PKLb075aEE-wEtlF0Ms7Y2ASo22Jya57E-CPfeCPE5vIJ_SyC0B8GeIE41qdra-lfzVi_zQ\"\n" +
  "    }\n" +
  "  ]\n" +
  "}";

module.exports = function (app) {
  app.use(cookieParser());

  //=======================================================
  // LTI Advantage Message processing
  let jwtPayload;

  app.post("/deeplink", (req, res) => {
    console.log("--------------------\nltiAdvantage deep link");

    // Per the OIDC best practices, ensure the state parameter passed in here matches the one in our cookie
    const cookieState = req.cookies['state'];
    if (cookieState !== req.body.state) {
      res.send("The state field is missing or doesn't match.");
      return;
    }

    jwtPayload = ltiAdv.verifyToken(req.body.id_token);
    if (!jwtPayload || !jwtPayload.verified) {
      res.send("An error occurred processing the id_token.");
      return;
    }

    const returnUrl = jwtPayload.body['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'].deep_link_return_url;
    const learnServer = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].url;
    const lmsType = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].product_family_code;

    const learnInfo = {
      userId: jwtPayload.body['sub'],
      courseId: jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/context'].id,
      learnHost: learnServer,
      returnUrl: encodeURI(returnUrl),
      courseName: jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/context'].title,
      locale: jwtPayload.body['locale'],
      lmsType: lmsType,
      deepLinkData: jwtPayload.body['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'].data,
      iss: jwtPayload.body['iss'],
      deployId: jwtPayload.body["https://purl.imsglobal.org/spec/lti/claim/deployment_id"],
    };

    console.log("learnInfo: " + JSON.stringify(learnInfo));
    res.cookie("learnInfo", JSON.stringify(learnInfo), {sameSite: 'none', secure: true, httpOnly: true});

    // At this point we want to get the 3LO auth code, and then OAuth2 bearer token, and THEN we can send the user
    // to the MS Teams Meeting app UI.

    const redirectUri = `${config.frontendUrl}/tlocode&scope=*&response_type=code&client_id=${config.appKey}&state=${cookieState}`;
    const authcodeUrl = `${learnServer}/learn/api/public/v1/oauth2/authorizationcode?redirect_uri=${redirectUri}`;

    console.log(`Redirect to get 3LO code ${authcodeUrl}`);
    res.redirect(authcodeUrl);
  });

  // The 3LO redirect route
  app.get('/tlocode', async (req, res) => {
    console.log(`tlocode called with code: ${req.query.code} and state: ${req.query.state}`);

    const cookieState = req.cookies['state'];
    if (cookieState !== req.query.state) {
      res.send("The state field is missing or doesn't match.");
      return;
    }

    const learnInfo = req.cookies['learnInfo'];

    let learnHost = '';
    let returnUrl = '';
    let courseName = '';
    let learnLocale = 'en-us';
    if (learnInfo) {
      learnHost = JSON.parse(learnInfo).learnHost;
      returnUrl = JSON.parse(learnInfo).returnUrl;
      courseName = encodeURIComponent(JSON.parse(learnInfo).courseName);
      learnLocale = JSON.parse(learnInfo).locale;
    }
    const redirectUri = `${config.frontendUrl}/tlocode`;
    const learnUrl = learnHost + `/learn/api/public/v1/oauth2/token?code=${req.query.code}&redirect_uri=${redirectUri}`;

    // If we have a code, let's get us a bearer token here.
    const auth_hash = new Buffer.from(`${config.appKey}:${config.appSecret}`).toString('base64');
    const auth_string = "Basic " + auth_hash;
    console.log(`Auth string: ${auth_string}`);
    const options = {
      headers: {
        Authorization: auth_string,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    };

    console.log(`Getting bearer token at ${learnUrl}`);
    const response = await axios.post(learnUrl, "grant_type=authorization_code", options);
    if (response.status === 200) {
      const token = response.data.access_token;
      console.log(`Got bearer token`);

      const nonce = uuid.v4();
      redisUtil.redisSave(nonce, token);

      // Now finally redirect to the IVS app
      res.redirect(`/?nonce=${nonce}&returnurl=${returnUrl}&cname=${courseName}&setLang=${learnLocale}#/viewStreams`);
    } else {
      console.log(`Failed to get token with response ${response.status}`);
      res.send(`An error occurred getting OAuth2 token ${response.status}`);
    }
  });

  app.get("/jwtPayloadData", (req, res) => {
    res.send(jwtPayload);
  });

  app.get("/oidclogin", (req, res) => {
    console.log("--------------------\nOIDC login");
    ltiAdv.oidcLogin(req, res);
  });

  app.get("/.well-known/jwks.json", (req, res) => {
    res.send(PUBLIC_KEY_SET);
  });

  app.get("/config", (req, res) => {
    const frontEnd = config.frontendUrl;
    res.send("JWKS URL: " + frontEnd + "/.well-known/jwks.json<br/>" +
      "OIDC Login URL: " + frontEnd + "/oidclogin<br/>" +
      "Redirect URLs: " + frontEnd + "/lti13");
  });

  app.get('/api-config', (req, res) => {
    res.send({
      msClientId: config.msClientId,
    });
  });

  app.post('/sendMeeting', async (req, res) => {
    let body = req.body;
    console.log(`sendMeeting called: ${JSON.stringify(body)}`);

    // Get the OAuth2 bearer token from our cache based on the nonce. The nonce serves two purposes:
    // 1. Protects against CSRF
    // 2. Is the key for our cached bearer token
    const nonce = body.nonce;
    const token = await redisUtil.redisGet(nonce);
    if (!token) {
      console.log(`Couldn't get token for nonce ${nonce}...exiting.`);
      res.status(404).send(`Couldn't find nonce`);
      return;
    }
    console.log(`sendMeeting got bearer token`);

    // Remove the nonce so it can't be replayed
    redisUtil.redisDelete(nonce);

    let learnInfo = {};
    if (req.cookies['learnInfo']) {
      learnInfo = JSON.parse(req.cookies['learnInfo']);
    }

    const deepLinkReturn = await deepLinkService.createDeepContent(body, learnInfo, token);
    console.log(`sendMeeting got deep link return ${JSON.stringify(deepLinkReturn)}`);
    res.send(deepLinkReturn);
  });

  app.get('/streamData', (req, res) => {
    res.send([
      {
        'selected': false,
        'name': 'Default',
        'key': 'DEFAULT2345',
        'url': 'https://example.com/stream1'
      },
      {
        'selected': false,
        'name': 'My Stream 1',
        'key': 'BOBCAT21234',
        'url': 'https://example.com/mystream1'
      },
    ])
  })

  //=======================================================
  // Catch all
  app.get("*", (req, res) => {
    console.log("catchall - (" + req.url + ")");
    res.redirect('/#/viewStreams');
  });
};
