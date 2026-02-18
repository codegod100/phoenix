# Notification Service

## Overview

The Notification Service handles delivery of messages to users across multiple channels: email, push notifications, and in-app messages.

## Channel Support

- The service must support email, push notification, and in-app message channels
- Each user must be able to configure channel preferences per notification type
- If a preferred channel fails, the service must fall back to the next available channel
- Channel availability must be checked before attempting delivery

## Email Delivery

- Emails must be sent through a configurable SMTP provider
- The service must support HTML and plaintext email templates
- Email templates must be versioned and stored in the template registry
- Bounce notifications must be processed and the user's email status updated
- The service must not send more than 10 emails per user per hour

## Push Notifications

- Push tokens must be validated before delivery attempts
- Expired push tokens must be automatically removed
- Push payload size must not exceed 4KB
- The service must support both iOS (APNs) and Android (FCM) platforms

## In-App Messages

- In-app messages must be stored with read/unread status
- Users must be able to mark messages as read individually or in bulk
- Unread message counts must be available via a dedicated endpoint
- Messages older than 90 days must be automatically archived

## Delivery Guarantees

- Every notification must be assigned a unique delivery ID
- The service must guarantee at-least-once delivery for all channels
- Duplicate detection must prevent the same notification from being delivered twice
- Failed deliveries must be retried with exponential backoff (max 3 retries)
- After all retries are exhausted, the notification must be marked as permanently failed

## Rate Limiting

- Notification volume must be rate-limited per user to prevent spam
- System-wide rate limits must be configurable per channel
- Rate limit violations must be logged and the notification queued for later delivery

## Template System

- Templates must support variable interpolation with a {{variable}} syntax
- Missing template variables must cause a delivery failure, not silent omission
- Templates must be validated at registration time, not at send time
- Each template must declare its required variables explicitly
