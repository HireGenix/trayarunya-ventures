# Database Implementation

This directory contains the database implementation for the application. Currently, it uses a simple file-based storage system for demonstration purposes.

## Files

- `db.ts`: Implements a file-based database for storing leads data. It provides CRUD operations for leads and statistics generation.

## Implementation Details

The database implementation uses the Node.js file system (`fs`) module to read and write data to JSON files in the `/data` directory. The implementation includes:

- CRUD operations for leads (create, read, update, delete)
- Filtering, pagination, and sorting for lead queries
- Statistics generation for lead data

## Usage

```typescript
import { db } from '@/lib/db';

// Create a new lead
const newLead = await db.leads.create({
  name: 'John Doe',
  email: 'john.doe@example.com',
  // ... other lead properties
});

// Find leads with filtering and pagination
const leads = await db.leads.findMany({
  take: 10,
  skip: 0,
  where: {
    status: 'New'
  },
  orderBy: {
    date: 'desc'
  }
});

// Get lead statistics
const stats = await db.leads.getStats();
```

## Production Considerations

In a production environment, you would replace this implementation with a proper database solution such as:

1. **PostgreSQL or MySQL**: For relational data with complex queries
2. **MongoDB**: For document-based storage with flexible schema
3. **Prisma ORM**: For type-safe database access with migrations

The current implementation is designed to be easily replaceable by maintaining the same interface while changing the underlying storage mechanism.
