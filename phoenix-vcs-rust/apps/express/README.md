# super-api

## Overview

Express.js REST API with User and Item management

## API Routes

```nickel
{ method = "GET", path = "/health", handler = "healthCheck", description = "Health check endpoint" }
```

## Data Models

```nickel
{
    User = {
      fields = [
        { name = "name", type = "String", required = true },
        { name = "email", type = "String", required = true, unique = true },
        { name = "password", type = "String", required = true },
        { name = "createdAt", type = "Date", default = "Date.now" },
      ],
    },
    Item = {
      fields = [
        { name = "name", type = "String", required = true },
        { name = "description", type = "String" },
        { name = "price", type = "Number", required = true },
        { name = "owner", type = "ObjectId", ref = "User" },
        { name = "createdAt", type = "Date", default = "Date.now" },
      ],
    },
  }
```

