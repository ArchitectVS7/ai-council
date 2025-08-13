# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Database Configuration
POSTGRES_URL="your_neon_postgres_connection_string_here"

# Google Workspace Integration
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/google/auth"

# Microsoft 365 Integration
MICROSOFT_CLIENT_ID="your_microsoft_client_id"
MICROSOFT_CLIENT_SECRET="your_microsoft_client_secret"
MICROSOFT_TENANT_ID="your_microsoft_tenant_id"
MICROSOFT_REDIRECT_URI="http://localhost:3000/api/integrations/microsoft/auth"

# Slack Integration
SLACK_CLIENT_ID="your_slack_client_id"
SLACK_CLIENT_SECRET="your_slack_client_secret"
SLACK_SIGNING_SECRET="your_slack_signing_secret"
SLACK_REDIRECT_URI="http://localhost:3000/api/integrations/slack/auth"

# OpenAI API (if using AI features)
OPENAI_API_KEY="your_openai_api_key_here"

# Next.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret_here"

# Development Settings
NODE_ENV="development"
```

## Setup Instructions

1. Copy the above content into a new file named `.env.local` in your project root
2. Replace all placeholder values with your actual API credentials
3. Ensure `.env.local` is listed in your `.gitignore` file for security
4. Restart your development server after adding environment variables

## Security Notes

- Never commit `.env.local` or any environment files containing real credentials
- Use different credentials for development, staging, and production environments
- Regularly rotate API keys and secrets for security
