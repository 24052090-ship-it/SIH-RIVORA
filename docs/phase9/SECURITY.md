# Security Checklist

Before deployment:

- Replace all development JWT/database secrets.
- Restrict CORS to the production frontend origin.
- Keep API keys server-side where possible.
- Restrict Google Maps keys by application/API.
- Put FastAPI behind an internal network or authenticated gateway.
- Limit upload size and validate MIME/type (already enforced for vision uploads).
- Use HTTPS in production.
- Back up PostgreSQL and test restoration.
- Do not commit `.env` or model credentials.
- Review database roles and least privilege.
- Monitor authentication failures and 429 responses.
