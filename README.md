# AEMET Weather Alerts Dashboard 🌦️

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/redspidersoftware/alertasmeteo)

Real-time weather alert monitoring system for Spain using AEMET OpenData API.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

- 🗺️ **Interactive Map** - Visualize alerts across Spain with severity-based color coding
- 🔔 **Real-time Alerts** - Live updates from AEMET OpenData API
- 🌍 **Bilingual** - Full support for Spanish and English
- 🔐 **User Authentication** - Secure registration and login with Supabase
- 📧 **Email Verification** - User verification workflow
- 🎯 **Smart Filtering** - Filter alerts by type and severity
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Maps**: React Leaflet
- **API**: AEMET OpenData

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- AEMET API key

### Installation

1. Clone the repository
\`\`\`bash
git clone https://github.com/redspidersoftware/alertasmeteo.git
cd alertasmeteo
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables
\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your credentials:
\`\`\`
VITE_AEMET_API_KEY=your_aemet_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

4. Set up Supabase database
- Run the SQL in `supabase_schema.sql` in your Supabase SQL Editor

5. Start development server
\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:5173`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to Vercel or Netlify.

## Project Structure

\`\`\`
alertasmeteo/
├── src/
│   ├── components/      # React components
│   ├── context/         # React context (Auth, Language)
│   ├── services/        # API services
│   ├── lib/            # Supabase client
│   └── types/          # TypeScript types
├── public/             # Static assets
├── supabase_schema.sql # Database schema
└── DEPLOYMENT.md       # Deployment guide
\`\`\`

## License

MIT

## Author

Red Spider Software
