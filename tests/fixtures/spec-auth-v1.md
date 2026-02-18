# Authentication Service

The authentication service handles user login, registration, and session management.

## Requirements

- Users must authenticate with email and password
- Sessions expire after 24 hours
- Failed login attempts are rate-limited to 5 per minute
- Passwords must be hashed with bcrypt (cost factor 12)

## API Endpoints

### POST /auth/login

Accepts email and password. Returns a JWT token on success.

### POST /auth/register

Creates a new user account. Requires email, password, and display name.

### POST /auth/logout

Invalidates the current session token.

## Security Constraints

- All endpoints must use HTTPS
- Tokens must be signed with RS256
- Password reset tokens expire after 1 hour
