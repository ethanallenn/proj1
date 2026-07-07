// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');
const twilio = require('twilio');

// Load environment variables locally (from .env)
require('dotenv').config();

// Read configurations from process environment (Railway or local .env)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER || '+442890571924';
const SIP_DESTINATION = process.env.SIP_DESTINATION || 'sip:100@visuae-sip.sip.twilio.com';

const IVR_URL = process.env.IVR_URL;
const VOICEMAIL_URL = process.env.VOICEMAIL_URL;
const OUTBOUND_URL = process.env.OUTBOUND_URL;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// 1. Authentication Middleware
function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(418).json({ error: 'Authentication required' });
  }
  
  const [type, credentials] = authHeader.split(' ');
  if (type === 'Basic') {
    const decoded = Buffer.from(credentials, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return next();
    }
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
}

// 2. Authentication Login Check
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Helper for pinging endpoints safely
async function pingEndpoint(url) {
  if (!url) {
    return { status: 'offline', latency: '--', statusCode: 'Endpoint URL missing' };
  }
  
  const start = Date.now();
  try {
    const response = await axios.get(url, { timeout: 4000 });
    return {
      status: 'online',
      latency: `${Date.now() - start}ms`,
      statusCode: response.status
    };
  } catch (error) {
    if (error.response) {
      return {
        status: 'online',
        latency: `${Date.now() - start}ms`,
        statusCode: error.response.status
      };
    }
    return {
      status: 'offline',
      latency: 'Timeout',
      statusCode: 'Connection Error'
    };
  }
}

// 3. Status Diagnostic Query Route
app.get('/api/status', checkAuth, async (req, res) => {
  const results = {};

  // A. Check Twilio API status
  const twilioStart = Date.now();
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    try {
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      await client.api.v2010.accounts(TWILIO_ACCOUNT_SID).fetch();
      results.twilio = {
        status: 'online',
        latency: `${Date.now() - twilioStart}ms`,
        statusCode: 200
      };
    } catch (error) {
      results.twilio = {
        status: error.code === 20003 ? 'unauthorized' : 'offline',
        latency: error.code === 20003 ? 'Auth Failed' : 'Timeout',
        statusCode: error.status || 'Connection Error'
      };
    }
  } else {
    results.twilio = { status: 'offline', latency: '--', statusCode: 'Credentials missing' };
  }

  // B. Check AWS IVR Endpoint
  results.ivr = await pingEndpoint(IVR_URL);

  // C. Check AWS Voicemail Endpoint
  results.voicemail = await pingEndpoint(VOICEMAIL_URL);

  // D. Check AWS Outbound Endpoint
  results.outbound = await pingEndpoint(OUTBOUND_URL);

  res.json(results);
});

// 4. Test All Lines Outbound Call routing
app.post('/api/test-all-lines', checkAuth, async (req, res) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return res.status(400).json({ 
      error: 'Twilio credentials are not configured in environment variables.' 
    });
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // TwiML payload to route the call, simulate pressing 1 (Ethan's Line), and connect the SIP dial
    const twimlMarkup = `
      <Response>
        <Say voice="Polly.Joey-Neural">Visuae automatic trunk line test initiated. Dialing extension option 1, Ethan's SIP line.</Say>
        <Play digits="1" />
        <Dial timeout="20">
          <Sip>${SIP_DESTINATION}</Sip>
        </Dial>
      </Response>
    `;

    const call = await client.calls.create({
      twiml: twimlMarkup,
      to: SIP_DESTINATION,
      from: TWILIO_NUMBER
    });

    res.json({ 
      success: true, 
      message: `Test call initiated successfully. Call SID: ${call.sid}`,
      callSid: call.sid
    });
  } catch (error) {
    res.status(500).json({ 
      error: `Failed to trigger outbound SIP line test: ${error.message}` 
    });
  }
});

// Serve frontend app routing fallbacks
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server executing at http://localhost:${PORT}`);
});
