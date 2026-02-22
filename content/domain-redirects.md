# Domain Redirects → generatedgallery.com

**Goal:** Redirect freegen.ai and anydiffusion.com → https://generatedgallery.com (301)

## Current Status (2026-02-22)

| Domain | Registrar | Nameservers | Current IPs | In Cloudflare? |
|--------|-----------|-------------|-------------|----------------|
| freegen.ai | Spaceship | launch1/2.spaceship.net | 34.216.117.25, 54.149.79.189 | ❌ No |
| anydiffusion.com | Spaceship | launch1/2.spaceship.net | 54.149.79.189, 34.216.117.25 | ❌ No |
| generatedgallery.com | Namecheap | nikon/wanda.ns.cloudflare.com | (Cloudflare Tunnel) | ✅ Yes |

## Cloudflare Account
- Email: justacatbot@proton.me
- Account ID: 40a8b20040bdbc76c5a6dc0e14f8b141
- API Token (from cloudflared cert): `rNrAr_tgTsQxkyXE57fIwmPD1QNUk9Yp225YzAjj`
  - ⚠️ This token lacks zone creation permission. Need to create a new API token or use dashboard.

## Steps for Cody

### Step 1: Add Domains to Cloudflare

For **each domain** (freegen.ai, anydiffusion.com):

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com) as justacatbot@proton.me
2. Click **"Add a site"** → enter the domain name
3. Select **Free plan**
4. Cloudflare will assign nameservers (e.g., `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`)
5. Note the assigned nameservers

### Step 2: Update Nameservers at Spaceship

For **each domain**:

1. Log into [Spaceship](https://www.spaceship.com) (where both domains are registered)
2. Go to domain management → select the domain
3. Change nameservers from `launch1/2.spaceship.net` to the Cloudflare nameservers from Step 1
4. Save. Propagation takes up to 24-48h (usually faster)

### Step 3: Create Redirect Rules

Once domains are active in Cloudflare, for **each domain**:

#### Option A: Bulk Redirects (Recommended)
1. In Cloudflare dashboard → select the domain
2. Go to **Rules** → **Redirect Rules**
3. Create rule:
   - **Rule name:** `Redirect to GeneratedGallery`
   - **When:** All incoming requests (or URI Path matches `/*`)
   - **Then:** URL redirect
     - **Type:** Static
     - **URL:** `https://generatedgallery.com`
     - **Status code:** 301

#### Option B: Page Rules (Legacy)
1. Go to **Rules** → **Page Rules**
2. Create rule:
   - **URL:** `*freegen.ai/*` (or `*anydiffusion.com/*`)
   - **Setting:** Forwarding URL → 301 Permanent Redirect
   - **Destination:** `https://generatedgallery.com`

### Step 4: DNS Records

For each domain, add a minimal DNS record so Cloudflare can proxy:

- **Type:** A
- **Name:** `@`
- **Content:** `192.0.2.1` (dummy IP — traffic gets redirected before hitting origin)
- **Proxy status:** Proxied (orange cloud ☁️)

Also add for www:
- **Type:** CNAME
- **Name:** `www`
- **Content:** `@`
- **Proxy status:** Proxied (orange cloud ☁️)

### Step 5: Create API Token with Full Permissions (Optional)

To automate this in the future:
1. Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → **Edit zone DNS** template (or custom with Zone:Edit, Zone:Read)
3. Save the token to TOOLS.md

## API Commands (Once Zones Exist)

```bash
CF_TOKEN="YOUR_TOKEN"
ZONE_ID="zone_id_here"

# Add A record (dummy for redirect)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"@","content":"192.0.2.1","proxied":true}'

# Add www CNAME
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"www","content":"@","proxied":true}'

# Create redirect rule (Single Redirects)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "Redirect to GeneratedGallery",
    "kind": "zone",
    "phase": "http_request_dynamic_redirect",
    "rules": [{
      "expression": "true",
      "description": "301 redirect all traffic to generatedgallery.com",
      "action": "redirect",
      "action_parameters": {
        "from_value": {
          "status_code": 301,
          "target_url": {
            "value": "https://generatedgallery.com"
          },
          "preserve_query_string": false
        }
      }
    }]
  }'
```
