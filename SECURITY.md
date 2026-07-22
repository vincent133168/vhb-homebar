# Security Policy

## Supported version

Security fixes are applied to the latest version on the default branch.

## Reporting a vulnerability

Please use GitHub Private Vulnerability Reporting for this repository. Do not
publish credentials, customer data, order records, OAuth details, or exploit
steps in a public issue.

Include the affected route or feature, reproduction conditions, expected
impact, and any suggested mitigation. Remove real customer information from
screenshots and examples.

## Deployment checklist

- Configure a unique administrator password.
- Set `AUTH_SECRET` to at least 32 random characters.
- Keep `.env` and hosted runtime secrets out of source control.
- Restrict access to downloaded migration backups.
- Rotate credentials immediately if they are exposed.
