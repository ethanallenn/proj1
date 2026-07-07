# Visuae Phone Network - Status Gateway

A secure administrative monitor and integration test console for the **Visuae Phone Network**. This dashboard tests and verifies the real-time status/uptime of core gateways, runs diagnostic logs, and provides a control interface to test outbound SIP lines using the Twilio API.

---

## 🔒 Security Authentication
Access to the administrative gateway is restricted by a basic credentials login:
- **Username:** `admin`
- **Password:** `admin`

---

## ⚙️ Configuration Setup (.env)

Local credentials are configured in a [`.env`](file:///Users/ethan/Desktop/proj/.env) file located in the project root:
- The [`.env`](file:///Users/ethan/Desktop/proj/.env) file is ignored by Git using [`.gitignore`](file:///Users/ethan/Desktop/proj/.gitignore) to protect your secrets.
- Edit this local file to test credentials on your machine.

---

## 🚀 Deploying to Railway

Railway runs your application in the cloud by connecting to your GitHub repository and automatically injecting your environment variables.

### Step 1: Create a GitHub Repository
1. Initialize Git in the project folder and commit the files:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   ```
2. Create a new repository on GitHub and push the code. Notice that [`.env`](file:///Users/ethan/Desktop/proj/.env) will **not** be uploaded because it is listed in [`.gitignore`](file:///Users/ethan/Desktop/proj/.gitignore).

### Step 2: Deploy on Railway
1. Go to [Railway.app](https://railway.app/) and create a new project.
2. Select **Deploy from GitHub repo** and choose your repository.

### Step 3: Configure Variables on Railway
1. Inside your Railway project service page, navigate to the **Variables** tab.
2. Click **New Variable** or **Raw Editor** and copy-paste the values from your local [`.env`](file:///Users/ethan/Desktop/proj/.env) file:
   - **`TWILIO_ACCOUNT_SID`** (Twilio account identifier)
   - **`TWILIO_AUTH_TOKEN`** (Twilio authentication key)
   - **`TWILIO_NUMBER`** (The target Twilio phone number)
   - **`SIP_DESTINATION`** (Ethan's target SIP URI)
   - **`IVR_URL`** (Inbound voice IVR endpoint)
   - **`VOICEMAIL_URL`** (Voicemail to OneDrive endpoint)
   - **`OUTBOUND_URL`** (Outbound calling endpoint)
   - **`ADMIN_USERNAME`** (Custom portal admin username)
   - **`ADMIN_PASSWORD`** (Custom portal admin password)

3. Railway will trigger a new deployment automatically. Once complete, click the generated domain to access your portal in the cloud!
