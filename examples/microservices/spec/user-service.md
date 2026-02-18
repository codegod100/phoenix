# User Service

## Overview

The User Service manages user accounts, profiles, and preferences. It is the system of record for all user identity data.

## Account Management

- The service must support creating new user accounts with email and password
- Email addresses must be unique across all accounts
- Passwords must be hashed using bcrypt with a minimum cost factor of 12
- The service must never store or return plaintext passwords
- Account deletion must be a soft delete with a 30-day recovery window
- After the recovery window, all user data must be permanently purged

## Profile Management

- Users must be able to update their display name and avatar URL
- Profile updates must be validated: display names limited to 100 characters
- Avatar URLs must be validated against an allowlist of image hosting domains
- Profile reads must be served from cache with a 5-minute TTL

## Authentication Integration

- The service must expose a verify-credentials endpoint for the Auth service
- Failed credential checks must increment a lockout counter
- After 10 failed attempts, the account must be locked for 1 hour
- The lockout counter must reset on successful authentication
- The verify-credentials endpoint must always respond within 200ms

## Data Constraints

- User IDs must be UUIDv4 format
- All timestamps must be stored in UTC as ISO 8601
- The service must not access any external APIs directly
- Database queries must use parameterized statements to prevent SQL injection
- All database operations must be wrapped in transactions where atomicity is required

## Events

- The service must publish a UserCreated event when a new account is created
- The service must publish a UserDeleted event when soft-delete is triggered
- The service must publish a ProfileUpdated event on any profile change
- Events must be published to the message queue with at-least-once delivery
- Event payloads must never contain passwords or security credentials

## Search

- The service must support searching users by email prefix or display name
- Search queries must be limited to 50 results per page
- Search must return results within 500ms for datasets under 1 million users
