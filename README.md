# Aegis // Cybersecurity Chatbot & Threat Prevention Hub

Aegis is a premium, client-side intelligence platform designed to prevent phishing, malware, and social engineering attacks. Utilizing a **Light Blue Scientific Theme**, this app integrates with Google's **Gemini v2.5 Flash** model (via client-provided API key) to evaluate threats in real time.

## Key Features

1. **Aegis Intelligence Chatbot**:
   - Talk directly to Aegis about security risks, response plans, or encryption protocols.
   - Pre-configured suggestion chips for quick responses.
   - Memory context up to the last 10 interactions.

2. **Phishing URL Risk Scanner**:
   - Lexical flag checks (e.g. brand spoofing, IP addresses, suspicious TLDs).
   - Deep LLM risk scoring (0-100%) and detailed forensic reports.
   - Cybernetic SVG gauge animation reflecting threat severity.

3. **Email forensic Threat Audit**:
   - Social engineering analysis (urgency, authority, calls to action).
   - Score breakdown out of 10 and psychological triggers detection.

4. **Malware Script Sandbox**:
   - Pure static code heuristics scanner (detects dynamic execution, obfuscated base64 payload strings, network download commands).
   - Safe sandbox parsing with line numbering.
   - LLM decompilation analysis detailing step-by-step risk points.

5. **System Config**:
   - Add/Remove your Google Gemini developer API key.
   - Safe client-side storage: Key is saved inside the browser's `localStorage` and never sent to a third-party server.
   - Active diagnostic validation tests connection latency and endpoint handshakes.

---

## Local Setup

You can host and run Aegis locally on your machine.

### Prerequisites
Make sure you have Node.js installed on your system.

### Installation
From this directory, install the Vite development server dependency:
```cmd
npm install
```

### Run Localhost
Start the local server:
```cmd
npm run dev
```

Once running, Vite will output the local network URL (typically `http://localhost:5173`). Open this URL in any modern web browser to access the dashboard.

---

## Getting a Gemini API Key

Aegis uses the Gemini API. You can get an API key for free:
1. Visit the [Google AI Studio page](https://aistudio.google.com/).
2. Log in with your Google account.
3. Click on **Create API Key**.
4. Copy the generated key.
5. Paste it in the **System Config** tab within Aegis and click **Save Config**.

---

## Security & Privacy Notice
All operations occur in your local browser sandbox. The API key is kept in your private `localStorage` and sent directly to Google's official Gemini endpoint. No user data, messages, or files are tracked or uploaded elsewhere.
