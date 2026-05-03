# Railway Deployment Guide

## Services Setup

Deploy each folder as a separate Railway service:
- `apps/server` → Node.js backend service
- `apps/agents` → Python agents service  
- `apps/web` → Static frontend service (or use Vercel free tier)

## Environment Variables

### Node.js Backend Service (apps/server)
| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Provided by Railway automatically | 3000 |
| NODE_ENV | Set to production | production |
| DATABASE_URL | PostgreSQL connection string from Railway DB | postgresql://... |
| BETTER_AUTH_SECRET | 32+ char random secret | generate with: openssl rand -hex 32 |
| BETTER_AUTH_URL | Your Node.js service Railway URL | https://your-server.railway.app |
| FRONTEND_URL | Your frontend URL | https://your-app.vercel.app |
| AGENT_SERVICE_URL | Your Python service Railway URL | https://your-agents.railway.app |
| INTERNAL_API_KEY | Shared secret with Python service | generate with: openssl rand -hex 24 |

### Python Agents Service (apps/agents)
| Variable | Description |
|----------|-------------|
| ANTHROPIC_API_KEY | From console.anthropic.com |
| TAVILY_API_KEY | From tavily.com (optional - DDGS+HN work without it) |
| REDDIT_CLIENT_ID | From reddit.com/prefs/apps (optional) |
| REDDIT_CLIENT_SECRET | From reddit.com/prefs/apps (optional) |
| REDDIT_USER_AGENT | FluxIdeas/1.0 by /u/yourusername |
| CLOUDINARY_CLOUD_NAME | From cloudinary.com (for PDF storage) |
| CLOUDINARY_API_KEY | From cloudinary.com |
| CLOUDINARY_API_SECRET | From cloudinary.com |
| INTERNAL_API_KEY | Same as Node.js service INTERNAL_API_KEY |
| NODEJS_BACKEND_LOG_ENDPOINT_URL | https://your-server.railway.app/internal/pipeline-log |

### Frontend Service (apps/web)
| Variable | Description |
|----------|-------------|
| VITE_API_URL | Your Node.js service Railway URL |

## Deployment Order
1. Create a Railway project
2. Add PostgreSQL database plugin
3. Deploy apps/server service → copy Railway URL
4. Deploy apps/agents service → set NODEJS_BACKEND_LOG_ENDPOINT_URL to server URL
5. Deploy apps/web service (or Vercel) → set VITE_API_URL to server URL
6. Update FRONTEND_URL in server env vars with actual frontend URL
7. Run database migration: in Railway server service shell → `npm run db:migrate`

## Quick test after deployment
1. Visit frontend URL → landing page loads
2. Sign up for an account
3. Go to Dashboard → New Research
4. Enter "productivity tools for remote teams"
5. Watch the live agent feed
6. Select a problem from the list
7. Download the PDF/PPTX report
