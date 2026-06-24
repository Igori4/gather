# Deploying Gather to AWS (Free Tier)

Replaces the Vercel/Railway plan in CLAUDE.md. Goal: $0/mo for the first 12 months
(AWS account age), then ~EC2 instance cost only (~$7-8/mo on-demand, or $0 if you
stop the instance when not demoing it).

## Architecture

```
Browser ──HTTPS──> CloudFront #1 ──> S3 (private)         [static React build]
Browser ──HTTPS/WSS──> CloudFront #2 ──> EC2:80 (Express + Socket.IO)
EC2 ──> Supabase Postgres (unchanged, already external)
```

Two CloudFront distributions, no Route53, no ACM certificate, no custom domain.
CloudFront gives free valid HTTPS on its own `*.cloudfront.net` domain, and
supports WebSocket passthrough out of the box — that's what makes this work
without buying a domain.

## Prerequisites

- AWS account (root or IAM user with `AdministratorAccess` for setup — narrow
  later if you care)
- AWS CLI v2 installed and configured (`aws configure`)
- Set a **Billing Alert** in AWS Budgets for $1 so you notice if free tier
  is exceeded — do this first, before anything else.

## Part A — Frontend: S3 + CloudFront

1. **Build the frontend** with prod env vars pointing at the backend CloudFront
   domain (you'll get this URL in Part C — placeholder for now, fix later):
   ```
   apps/web/.env.production
     VITE_API_URL=https://<backend-cloudfront-domain>
     VITE_SOCKET_URL=https://<backend-cloudfront-domain>
   ```
   ```bash
   npm run build --workspace=apps/web
   ```
   Output: `apps/web/dist/`

2. **Create private S3 bucket** (block all public access — CloudFront reads
   via Origin Access Control, not a public bucket policy):
   ```bash
   aws s3api create-bucket --bucket gather-web-<unique-suffix> --region us-east-1
   aws s3api put-public-access-block --bucket gather-web-<unique-suffix> \
     --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
   ```

3. **Upload the build**:
   ```bash
   aws s3 sync apps/web/dist s3://gather-web-<unique-suffix> --delete
   ```

4. **Create CloudFront distribution** (console is easier than CLI here):
   - Origin: the S3 bucket, origin access = **Origin Access Control (OAC)** —
     create new OAC, let CloudFront update the bucket policy for you
   - Default root object: `index.html`
   - **Custom error responses** (required for React Router SPA routing):
     - 403 → `/index.html`, response code 200
     - 404 → `/index.html`, response code 200
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Note the distribution domain, e.g. `d123abc.cloudfront.net` — this is
     your frontend URL.

5. Re-deploy whenever the frontend changes: rebuild, `aws s3 sync`, then
   invalidate cache: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`

## Part B — Backend: EC2 free tier

1. **Launch instance** (console):
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: `t3.micro` (or `t2.micro` depending on region free-tier
     eligibility)
   - Storage: 8-30 GB gp3 (free tier covers up to 30GB)
   - Security group:
     - SSH (22) — restrict to your IP only
     - HTTP (80) — anywhere (CloudFront will hit this)
   - Create/download a key pair for SSH

2. **SSH in and install Docker**:
   ```bash
   ssh -i your-key.pem ubuntu@<ec2-public-ip>
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker ubuntu
   sudo apt install -y docker-compose-plugin
   # log out/in for group to take effect
   ```

3. **Get the code onto the box**:
   ```bash
   git clone <your-repo-url> gather
   cd gather
   ```

4. **Create `.env.production`** on the EC2 box (never commit this) with the
   real production secrets: `DATABASE_URL` (Supabase), `JWT_SECRET`,
   `REFRESH_TOKEN_SECRET`, `RESEND_API_KEY`, `GEMINI_API_KEY`,
   `GOOGLE_CLIENT_ID/SECRET`, `CORS_ORIGIN=https://<frontend-cloudfront-domain>`
   (from Part A step 4), `FRONTEND_URL=https://<frontend-cloudfront-domain>`.

5. **Run it**:
   ```bash
   sudo docker compose -f docker-compose.prod.yml up -d --build
   ```
   `Dockerfile.prod` runs `prisma migrate deploy` on container start, then
   `node dist/index.js`. Container listens on 4000 inside, mapped to host
   port 80 (see `docker-compose.prod.yml`).

6. Verify: `curl http://<ec2-public-ip>/health` (or whatever health route
   exists) from your machine.

## Part C — CloudFront #2: HTTPS + WebSocket in front of EC2

1. **Create a second CloudFront distribution**:
   - Origin: Custom origin = EC2 public DNS name (not S3), HTTP only, port 80
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: **all** (GET, POST, PUT, DELETE, etc. — needed for
     the REST API, not just GET)
   - Cache policy: **CachingDisabled** (API responses must not be cached)
   - Origin request policy: **AllViewer** (forwards all headers/cookies —
     needed for JWT auth headers and Socket.IO's upgrade handshake)
   - CloudFront auto-detects and proxies WebSocket upgrade requests when
     origin protocol is HTTP/HTTPS — no extra WS-specific setting needed.

2. Note this distribution's domain, e.g. `d456xyz.cloudfront.net`. **This is
   the real `VITE_API_URL`/`VITE_SOCKET_URL`** — go back to Part A step 1,
   set it correctly, rebuild, re-sync, invalidate.

3. Also update `.env.production` on EC2: `CORS_ORIGIN` and `FRONTEND_URL`
   must be the **frontend** CloudFront domain from Part A, not this one.
   Restart the container after editing: `sudo docker compose -f docker-compose.prod.yml up -d --build`

## Cost guardrails

- EC2 free tier: 750 hrs/mo for 12 months from **account creation date**,
  not from today if the account is older. Check Billing Console.
- Stop (not terminate) the EC2 instance when not actively demoing to avoid
  any post-free-tier charges — stopped instances don't bill compute, only
  the EBS volume (a few cents/mo).
- S3 + CloudFront: free tier covers 5GB S3 storage + 1TB CloudFront egress/mo
  for 12 months — a portfolio app won't get close.
- Supabase stays on its own free tier, unaffected by any of this.

## Rollback

CLAUDE.md's original Vercel/Railway plan still works if this gets too fiddly
— frontend and backend are decoupled by env vars either way, no code changes
needed to switch hosts.
