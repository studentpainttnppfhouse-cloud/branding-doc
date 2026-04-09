# Shopify Delivery Proof System

A web app that lets you **import Shopify orders, record video/photo proof for each order before dispatch, and automatically email the evidence to customers**.

## Features

| Feature | Details |
|---------|---------|
| **Order Import** | Upload Shopify CSV export *or* sync directly via Shopify Admin API |
| **Recording Studio** | Browser-based webcam recording & screenshot capture per order |
| **Screen + Camera** | Record screen + microphone simultaneously for unboxing-style proofs |
| **Media Gallery** | Review, preview, or delete captured videos & photos before sending |
| **Auto Email** | Send proof email with all attachments to the customer's email address |
| **Status Tracking** | `pending → recorded → sent` pipeline for every order |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your SMTP credentials

# 3. Run
npm start
# → http://localhost:3000
```

Open `http://localhost:3000` — no build step required, just plain HTML pages served by Express.

## Pages

| File | URL | Purpose |
|------|-----|---------|
| `public/index.html`  | `/index.html`  | Dashboard with stats |
| `public/orders.html` | `/orders.html` | Orders list + send proof |
| `public/import.html` | `/import.html` | CSV upload or Shopify API sync |
| `public/record.html` | `/record.html?id=<orderId>` | Recording studio |

## Environment Variables (`.env.local`)

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | `587` for TLS, `465` for SSL |
| `SMTP_USER` | Your email address |
| `SMTP_PASS` | App password |
| `SMTP_FROM` | From address shown to customers |
| `PORT` | Server port (default `3000`) |

Shopify API credentials are entered directly in the Import page — no env variable needed.

## Workflow

```
Import Orders (CSV upload or Shopify API)
       ↓
Orders Dashboard  →  filter by status
       ↓
Recording Studio (per order)
  ├── Start webcam / screen capture
  ├── Record video  →  auto-saved to server
  └── Take photos   →  auto-saved to server
       ↓
Click "Send Proof"  →  email sent to customer
  └── Attaches all videos & photos
       ↓
Order marked as "sent" ✓
```

## Tech Stack

- **HTML + Vanilla JS** (no framework, no build step)
- **Tailwind CSS** (CDN)
- **Express.js** (backend + static file server)
- **MediaRecorder API** (browser-native video recording)
- **Nodemailer** (SMTP email with attachments)
- **PapaParse** (CDN, CSV parsing in-browser)
- **File-based JSON store** (`.data/` folder)