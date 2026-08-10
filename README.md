# El-Jindi Auto Services

Enterprise operations system for automotive parts, POS sales, inventory, accounting, and accounts receivable.

## Local Development

```powershell
npm ci
npm run dev
```

The local development environment uses `.env.local`. Keep that file private.

## Render Deployment

This repository includes `render.yaml` for a Render web service and PostgreSQL database.

1. Create a private GitHub repository and push this project.
2. In Render, choose **New > Blueprint** and connect the repository.
3. Set `DEFAULT_ADMIN_PASSWORD` when Render prompts for the secret value.
4. Deploy the Blueprint.

The Blueprint stores `BUSINESS_STORE_PATH` in PostgreSQL, so business data does not depend on Render's temporary web-service filesystem.

### Migrating Existing Data

Before switching users to Render, export the current `data/db.json` state and import it into the Render PostgreSQL `business_state` table. Do not use `docker compose down -v`, and do not overwrite the target database until its backup is verified.

Build command:

```text
npm ci && npm run build
```

Start command:

```text
npm start
```

Never commit `.env`, `.env.local`, database files, backups, logs, or generated production secrets.
