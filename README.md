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
# Edit .env.local with your SMTP credentials (and optionally Shopify API token)

# 3. Run
npm run dev
# → http://localhost:3000
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHOPIFY_STORE_URL` | `your-store.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API access token |
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (`587` for TLS, `465` for SSL) |
| `SMTP_USER` | SMTP username / email address |
| `SMTP_PASS` | SMTP password or app password |
| `SMTP_FROM` | From address shown to customers |
| `NEXT_PUBLIC_BASE_URL` | Public URL of your deployment |

## Workflow

```
Import Orders (CSV or Shopify API)
       ↓
Orders Dashboard (see all orders + status)
       ↓
Recording Studio (per order)
  ├── Start webcam / screen capture
  ├── Record video → auto-saved
  └── Take photos → auto-saved
       ↓
Send Proof Email to customer
  └── Attaches all videos & photos
       ↓
Order marked as "sent" ✓
```

## Shopify CSV Format

Export from **Shopify Admin → Orders → Export → All orders (CSV for Excel)**. The system auto-detects the standard Shopify column names (`Name`, `Email`, `Billing Name`, `Lineitem name`, etc.) and collapses multi-row line items into a single order record.

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **MediaRecorder API** (browser-native video/audio recording)
- **Nodemailer** (SMTP email with attachments)
- **PapaParse** (CSV parsing)
- **File-based JSON store** (swap for Postgres/Supabase in production)