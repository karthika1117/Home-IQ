# HomeIQ - AI-Powered Home Service Platform

HomeIQ is a customer and technician home-service platform with three AI/automation agents:
- **Agent 1** — Booking / Technician Matching (via SNS Workbench)
- **Agent 2** — Appliance Health & Revenue Generation
- **Agent 3** — Scheduling & Reminders

## Architecture
- **Frontend:** React + Vite
- **Backend/API:** Vercel Serverless Functions (`api/`) & Express (`server.js` for local)
- **Database:** Supabase (PostgreSQL + RLS + Auth)

## Deployment to Vercel

1. Create a new project in Vercel.
2. Link your GitHub repository.
3. Framework Preset: **Vite**
4. Root Directory: `./` (leave default)
5. Add the following **Environment Variables** in the Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_AGENT1_WEBHOOK_URL` (Use production SNS URL)
   - `VITE_BOOKING_CONFIRM_WEBHOOK_URL` (Set to `/api/confirm-booking`)
   - `VITE_DEMO_MODE` (Set to `false`)
   - `SUPABASE_SERVICE_ROLE_KEY` (Backend only, do not prefix with VITE)
   - `ALLOWED_ORIGIN` (Your Vercel domain, e.g., `https://my-app.vercel.app`)

6. Deploy! Vercel will automatically build the Vite frontend and host the backend function from `api/confirm-booking.js`.

## Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in your Supabase credentials
cp .env.example .env.local

# Run frontend (Vite)
npm run dev

# Run backend (Express, on port 3001)
npm run server
```

## Testing

```bash
# Run the test suite
npm test

# Run the linter
npm run lint

# Test the production build
npm run build
```

## Workflows

1. **Customer Workflow:** Login -> Add Appliance -> Create Service Request
2. **Agent 1 Workflow:** Hits SNS webhook, scores technicians, returns matches -> Customer explicitly selects one and confirms.
3. **Agent 3 (Booking):** Creates reminders for customer and technician.
4. **Technician Workflow:** Login -> See Assigned Jobs -> Complete Job (adds notes).
5. **Agent 2 Workflow:** Calculates appliance health based on age + service history. If due for service, creates an Opportunity.
6. **Agent 3 (Opportunity):** Notifies customer about the new health-based opportunity.

## Security Notes
- `SUPABASE_SERVICE_ROLE_KEY` should **never** be committed to Git or prefixed with `VITE_`.
- Row Level Security (RLS) policies govern data access in Supabase.
- Always use `VITE_DEMO_MODE=false` in production to hit real SNS webhooks.
