---
name: dev
description: Node.js backend toolkit for MongoDB/Mongoose projects. Scaffold CRUD modules, review code, debug issues, optimize performance. Auto-detects your framework and conventions.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: <command> <args> — commands: scaffold, review, debug, optimize, add-route
---

# Node.js Dev Toolkit

**Command**: `$ARGUMENTS`

Parse the first word as the command. Follow the matching section below.

| Command | Usage | What it does |
|---|---|---|
| `scaffold` | `scaffold <entity> [field:type ...]` | Generate full CRUD module |
| `review` | `review [module]` | Audit code quality, performance, scalability |
| `debug` | `debug <module> [error-message]` | Diagnose and fix issues |
| `optimize` | `optimize [module\|area]` | Find performance and scalability improvements |
| `add-route` | `add-route <module>` | Register route in app entry point |

---

## Step 0: Detect Stack (ALWAYS do this first)

Read `package.json` and scan the project before doing anything.

**1. Read `package.json` → detect tech:**

| What | Look for in dependencies |
|---|---|
| ORM/ODM | `mongoose` · `@prisma/client` · `typeorm` · `drizzle-orm` |
| Framework | `express` · `fastify` · `@nestjs/core` · `koa` |
| Validation | `joi` · `zod` · `yup` · `class-validator` |
| Language | `typescript` in devDeps → TS, else JS |
| Queue | `bullmq` · `bull` · `agenda` |
| Cache | `ioredis` · `redis` |

**2. Scan project → detect conventions:**
- Glob folders: `src/`, `controllers/`, `services/`, `repositories/`, `models/`, `routes/`, `helpers/`, `constants/`, `config/`, `middleware/`, `jobs/`, `validators/`
- Read 2 existing files → detect file naming (`camelCase.js` vs `kebab-case.js` vs `snake_case.js`), variable naming, DB field naming, export style, error handling pattern, response pattern

**3. Rule: Match the project.** Generated code must follow whatever conventions already exist. Never impose new patterns.

---

## Architecture: Repository Pattern (ENFORCED)

This project follows a strict **4-layer architecture**. Every module MUST follow this pattern:

```
controllers/  → HTTP handling only (parse req, call service, send res)
services/     → Business logic only (rules, orchestration, NO direct DB calls)
repositories/ → All database queries (pure data access, NO business logic)
helpers/      → Reusable utilities (cookies, device info, formatting)
```

### Layer Rules

| Layer | CAN do | CANNOT do |
|---|---|---|
| **Controller** | Parse req params/body/query, call service methods, set cookies via helpers, send response via `sendSuccess()` | Import models, run DB queries, contain business logic |
| **Service** | Throw `AppError`, call repository methods, call other services, call utils (hash, token, email) | Import models directly, run `Model.find/create/update`, access `req`/`res` |
| **Repository** | Run Mongoose queries (`find`, `create`, `findByIdAndUpdate`, etc.), return documents | Throw `AppError`, contain business logic, access `req`/`res` |
| **Helper** | Export pure utility functions, access `config` | Contain business logic, run DB queries |

### Violations to Check
- **DB call in service** → VIOLATION. Move to repository.
- **Business logic in repository** → VIOLATION. Move to service.
- **`req`/`res` access in service** → VIOLATION. Pass needed values as params from controller.
- **Model import in service** → VIOLATION. Use repository instead.

---

## Code Quality Rules (apply to ALL commands)

These rules apply to every piece of code you generate or review:

1. **Guard clauses** — Check errors first, return early. Don't nest happy path in else.
2. **const by default** — Use `let` only when reassigning. Never `var`.
3. **No `return await`** — Write `return fn()` not `return await fn()`. Exception: inside try-catch.
4. **Destructure** — `const { id } = req.params` not `const id = req.params.id`.
5. **Don't mutate inputs** — Use `{ ...req.body }` not modify req directly.
6. **Controllers are thin** — Parse req → call service → respond. No logic.
7. **Services call repositories** — Never import Model directly. All DB access via repository.
8. **Pass session to transactions** — Every DB write inside a transaction must receive the session.
9. **Don't re-fetch** — If caller already has the record, pass it down.
10. **No dead code** — No commented-out blocks. Git has history.
11. **DRY** — If pattern repeats 2+ times, make it a helper.
12. **Self-documenting names** — `existingUser` not `rec`. `isDeleted` not `del`.
13. **Max 2 nesting levels** — Flatten with early returns.
14. **Paginate everything** — Every list endpoint must have limit. No unbounded queries.
15. **Select needed fields** — Use `.select()` or `.lean()`. Don't return entire documents if only a few fields are needed.
16. **Use Promise.all** — For independent async ops, don't await sequentially.
17. **No hardcoded strings** — Messages from constants, config from env, enums from constants.
18. **No console.log** — Use project's logger.
19. **Use `.lean()`** — For read-only queries, always use `.lean()` for plain JS objects (5x faster).
20. **Index all query fields** — Every field used in `.find()` filters, sorts, or population must be indexed.
21. **Avoid `$where` and `mapReduce`** — Use aggregation pipeline instead. Never allow user input in `$where`.

---

## Command: scaffold

**Usage**: `scaffold <entity> [field1:type field2:type ...]`

Generate a complete CRUD module. What files to create depends on detected stack:

### What to generate (Mongoose + Express)

| # | File | Layer |
|---|---|---|
| 1 | `models/<Entity>.ts` | Model (schema + interfaces) |
| 2 | `repositories/<entity>Repository.ts` | Repository (pure DB queries) |
| 3 | `services/<entity>Service.ts` | Service (business logic, calls repository) |
| 4 | `controllers/<entity>Controller.ts` | Controller (thin HTTP handlers) |
| 5 | `routes/<entity>Routes.ts` | Routes (Express router) |
| 6 | `validators/<entity>.ts` | Validators (Zod schemas) |
| 7 | `constants/messages.ts` | Constants (add messages for entity) |

### Mongoose Model Template
```ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEntity {
  field1: string;
  field2: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEntityDocument extends IEntity, Document {}

const entitySchema = new Schema<IEntityDocument>(
  {
    field1: { type: String, required: true, trim: true },
    field2: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes — ALWAYS index foreign keys, filtered fields, sort fields
entitySchema.index({ createdBy: 1 });
entitySchema.index({ isDeleted: 1, createdAt: -1 });
entitySchema.index({ field1: 1, isDeleted: 1 });

export const Entity: Model<IEntityDocument> = mongoose.model<IEntityDocument>('Entity', entitySchema);
```

### Repository Template (Mongoose)
```ts
import { Entity, IEntityDocument } from '../models/Entity';
import { FilterQuery, UpdateQuery } from 'mongoose';

class EntityRepository {
  async findById(id: string) {
    return Entity.findById(id).exec();
  }

  async findOne(filter: FilterQuery<IEntityDocument>) {
    return Entity.findOne(filter).exec();
  }

  async create(data: Partial<IEntityDocument>) {
    return Entity.create(data);
  }

  async updateById(id: string, update: UpdateQuery<IEntityDocument>) {
    return Entity.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
  }

  async deleteById(id: string) {
    return Entity.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true }).exec();
  }

  async findPaginated(
    filter: FilterQuery<IEntityDocument>,
    sort: string,
    skip: number,
    limit: number,
  ) {
    return Entity.find(filter).sort(sort).skip(skip).limit(limit).lean().exec();
  }

  async countDocuments(filter: FilterQuery<IEntityDocument>) {
    return Entity.countDocuments(filter).exec();
  }
}

export const entityRepository = new EntityRepository();
```

### Service Template (Mongoose — calls Repository, NOT Model)
```ts
import { entityRepository } from '../repositories/entityRepository';
import { AppError } from '../utils/AppError';
import { ENTITY_MESSAGES } from '../constants/messages';

interface ListParams {
  page: number;
  limit: number;
  sort?: string;
  search?: string;
  filters?: Record<string, unknown>;
}

class EntityService {
  async create(data: Partial<IEntity>) {
    return entityRepository.create(data);
  }

  async list({ page, limit, sort = '-createdAt', search, filters = {} }: ListParams) {
    const query: Record<string, unknown> = { ...filters, isDeleted: false };

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      entityRepository.findPaginated(query, sort, skip, limit),
      entityRepository.countDocuments(query),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const entity = await entityRepository.findById(id);
    if (!entity) {
      throw new AppError(ENTITY_MESSAGES.NOT_FOUND, 404);
    }
    return entity;
  }

  async update(id: string, data: Partial<IEntity>) {
    const entity = await entityRepository.updateById(id, { $set: data });
    if (!entity) {
      throw new AppError(ENTITY_MESSAGES.NOT_FOUND, 404);
    }
    return entity;
  }

  async softDelete(id: string) {
    const entity = await entityRepository.deleteById(id);
    if (!entity) {
      throw new AppError(ENTITY_MESSAGES.NOT_FOUND, 404);
    }
    return entity;
  }
}

export const entityService = new EntityService();
```

### Controller Template (Express — thin, calls Service)
```ts
import { Request, Response, NextFunction } from 'express';
import { entityService } from '../services/entityService';
import { sendSuccess } from '../utils/apiResponse';
import { ENTITY_MESSAGES } from '../constants/messages';

async function create(req: Request, res: Response, next: NextFunction) {
  const entity = await entityService.create({ ...req.body, createdBy: req.user!.id });
  sendSuccess(res, entity, ENTITY_MESSAGES.CREATED, 201);
}

async function list(req: Request, res: Response, next: NextFunction) {
  const { page = '1', limit = '20', sort, search, ...filters } = req.query;
  const result = await entityService.list({
    page: Number(page),
    limit: Math.min(Number(limit), 100),
    sort: sort as string,
    search: search as string,
    filters,
  });
  sendSuccess(res, result, 'Entities retrieved');
}

async function getById(req: Request, res: Response, next: NextFunction) {
  const entity = await entityService.getById(req.params.id);
  sendSuccess(res, entity, 'Entity retrieved');
}

async function update(req: Request, res: Response, next: NextFunction) {
  const entity = await entityService.update(req.params.id, req.body);
  sendSuccess(res, entity, ENTITY_MESSAGES.UPDATED);
}

async function remove(req: Request, res: Response, next: NextFunction) {
  await entityService.softDelete(req.params.id);
  sendSuccess(res, null, ENTITY_MESSAGES.DELETED);
}

export const entityController = { create, list, getById, update, remove };
```

### Helper Template
```ts
import { Request, Response } from 'express';
import { config } from '../config';

// Pure utility functions — no business logic, no DB calls
export function helperFunction(param: Type): ReturnType {
  // ...
}
```

### Route Template (Express)
```ts
import { Router } from 'express';
import { entityController } from '../controllers/entityController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createEntitySchema, updateEntitySchema } from '../validators/entity';

const router = Router();

// Public routes
router.get('/', entityController.list);
router.get('/:id', entityController.getById);

// Protected routes
router.post('/', authenticate, authorize('admin', 'super_admin'), validate(createEntitySchema), entityController.create);
router.put('/:id', authenticate, authorize('admin', 'super_admin'), validate(updateEntitySchema), entityController.update);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), entityController.remove);

export default router;
```

### Validator Template (Zod)
```ts
import { z } from 'zod';

export const createEntitySchema = z.object({
  body: z.object({
    field1: z.string().min(1).max(255).trim(),
    field2: z.number().positive(),
  }),
});

export const updateEntitySchema = z.object({
  body: z.object({
    field1: z.string().min(1).max(255).trim().optional(),
    field2: z.number().positive().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
  }),
});
```

### Constants Template
```ts
export const ENTITY_MESSAGES = {
  CREATED: 'Entity created successfully',
  UPDATED: 'Entity updated successfully',
  DELETED: 'Entity deleted successfully',
  NOT_FOUND: 'Entity not found',
  ALREADY_EXISTS: 'Entity already exists',
};
```

### After scaffolding
1. Run `add-route` to register the route
2. Add constants/messages if project uses a constants file
3. Verify indexes are created by checking MongoDB with `db.collection.getIndexes()`

---

## Command: review

**Usage**: `review [module]`

Audit code quality, performance, and scalability. Read the module's files, then check:

### Architecture Checks (PRIORITY)
- **Repository pattern followed?** Services must NOT import models or run DB queries directly.
- **Controllers are thin?** No business logic, no DB calls — just parse req → call service → respond.
- **Helpers used?** Reusable utility logic (cookies, device info) lives in `helpers/`, not inline in controllers.
- **No model imports in services?** Services import from `repositories/`, never from `models/`.

### Quality Checks
- Guard clauses used (no deep nesting)?
- `const` by default (no `var`, `let` only when needed)?
- No `return await` outside try-catch?
- No duplicated logic (DRY)?
- No side effects (inputs not mutated)?
- Session/transaction passed to all DB writes in multi-step operations?
- Error messages from constants (no hardcoded strings)?

### MongoDB/Mongoose Checks
- `.lean()` used on read-only queries?
- Indexes defined for all query filter/sort fields?
- No `$where` or string-based queries (injection risk)?
- `express-mongo-sanitize` middleware active?
- ObjectId validated before `.findById()` calls?
- `.select()` used to limit returned fields?
- Population (`.populate()`) limited to needed fields with `.populate('ref', 'field1 field2')`?
- No unbounded `.find({})` without limit?
- Soft-delete pattern consistent (`isDeleted` flag)?
- Compound indexes for common multi-field queries?
- `$inc`, `$push`, `$pull` used for atomic updates instead of read-modify-write?

### Performance Checks
- **N+1 queries**: Any DB query inside a loop? → Use `.populate()` or `$in` batch query.
- **Unbounded queries**: Any list query without `limit`? → Add pagination.
- **Missing indexes**: Filtered/sorted fields without indexes? → Add them.
- **Over-fetching**: Returning all fields when only a few needed? → Use `.select()`.
- **Sequential awaits**: Independent async ops awaited one-by-one? → Use `Promise.all`.
- **Event loop blocking**: Any `fs.readFileSync`, large `JSON.parse`, sync crypto? → Use async.
- **Large documents**: Embedding arrays that grow unbounded? → Move to separate collection with reference.

### Scalability Checks
- **In-memory state**: Sessions/caches in memory? → Move to Redis.
- **Hardcoded config**: `process.env` scattered in code? → Centralize in config.
- **No graceful shutdown**: Missing SIGTERM handler? → Add one (close DB connection, drain queues).
- **No health check**: Missing `/health` endpoint? → Add one with DB ping.
- **Heavy inline work**: Emails/reports in request handler? → Move to BullMQ job queue.
- **No circuit breaker**: External API calls without timeout/retry? → Add resilience.
- **Connection pool**: `maxPoolSize` configured in Mongoose connection? → Set appropriate value.

### Security Checks
- Auth middleware on all protected endpoints?
- No sensitive data in responses (passwords, tokens, internal IDs)?
- `express-mongo-sanitize` to prevent NoSQL injection?
- Role checks use constants, not hardcoded strings?
- ObjectId validation on all params before DB queries?
- Rate limiting on sensitive endpoints (login, OTP)?

### Output format:
```
## Review: <module>
### Stack: Mongoose + <Framework> + <Validation>
### Architecture: Repository pattern compliance X/10
### Issues: [CRITICAL] / [ARCHITECTURE] / [PERFORMANCE] / [SCALABILITY] / [WARNING]
### Score: Quality X/10 · Performance X/10 · Scalability X/10
### Fixes: specific file:line with code suggestion
```

---

## Command: debug

**Usage**: `debug <module> [error-message]`

### Step 1: Trace the request flow
Read each file in the chain: Route → Middleware → Controller → Service → Repository → Model/Schema

### Step 2: Check common Mongoose/MongoDB bugs

| Category | Common Bugs |
|---|---|
| **Query** | Missing `await` on query · `.lean()` then calling instance methods (`.save()`) · `findByIdAndUpdate` skips `pre('save')` hooks · Forgetting `.exec()` on queries used in Promise.all |
| **Session/Transaction** | Session not passed to `.create()` (must use array syntax: `Model.create([doc], { session })`) · Session not passed to `.findByIdAndUpdate()` · `startSession()` not closed in finally block |
| **Schema** | Field name mismatch between schema and query · `ref` string doesn't match model name · `unique` index not created (need to restart or run `ensureIndexes()`) · Mixed type not triggering `markModified()` |
| **Population** | Circular population causing stack overflow · Populating non-existent ref · Deep population performance (use aggregation instead) |
| **Aggregation** | `$match` stage not using indexes (put $match first) · `$lookup` on non-indexed foreign field · ObjectId comparison without `$toObjectId` or `new mongoose.Types.ObjectId()` |
| **Connection** | Connection string wrong (replica set, authSource) · `bufferCommands` causing silent hangs · Connection pool exhausted |
| **Architecture** | Service calling Model directly instead of Repository · Controller containing business logic · Helper doing DB queries |

### Step 3: Check common framework bugs

| Framework | Common Bugs |
|---|---|
| **Express** | Async handler without error catch/wrapper · Middleware order wrong · `req.params.id` is string (forgot to validate as ObjectId) · Double `res.json()` call · Missing `next(error)` in catch |

### Step 4: Check for code smells
- Transaction created but not passed to all DB calls within it?
- `.save()` called on `.lean()` result?
- `.findOne()` without proper filter (returns random doc)?
- Array filter/map on Mongoose documents (use `.lean()` first)?
- `console.log` instead of logger?
- `var` usage?
- Business logic after `session.commitTransaction()`?
- Error swallowed in catch block (empty catch)?
- Service importing Model instead of Repository?

### Output format:
```
## Diagnosis: <module>
### Root Cause: <what's wrong>
### Affected Files: file:line — description
### Fix: step-by-step with code
### Prevention: rule to avoid this
```

---

## Command: optimize

**Usage**: `optimize [module or area]`

Scan for performance and scalability improvements:

### MongoDB / Mongoose
- **Connection pool** configured? (`maxPoolSize` in connection options, default 100)
- **N+1 queries?** DB query inside a loop → use `.populate()`, `$in`, or `$lookup` aggregation
- **Missing indexes?** Run `db.collection.find({query}).explain('executionStats')` — check for COLLSCAN
- **Unbounded queries** without limit? → Add pagination everywhere
- **Over-fetching?** No `.select()` or `.lean()`? → Add them for read queries
- **Large documents?** Embedded arrays growing unbounded? → Move to separate collection
- **Aggregation pipeline** order? `$match` and `$project` should come first to reduce working set
- **Read preference** set? Use `secondaryPreferred` for analytics/reports queries
- **Write concern** appropriate? `w: 'majority'` for critical writes, `w: 1` for logs

### Application
- Sequential awaits that could be `Promise.all`?
- Sync operations blocking event loop? (`readFileSync`, sync crypto)
- Growing Maps/Sets without cleanup? (memory leak)
- Compression middleware configured? (`compression` package)
- Streaming for bulk/export endpoints?

### Caching (Redis)
- High-traffic GET endpoints without cache?
- Cache invalidation on writes?
- TTL set on all cached values?
- Cache stampede prevention? (lock or stale-while-revalidate)
- Frequently accessed reference data cached? (categories, configs)

### Scalability
- In-memory state that should be in Redis?
- Missing graceful shutdown? (close Mongoose connection, drain BullMQ workers)
- Missing health check? (`/health` with `mongoose.connection.readyState` check)
- Heavy work (email, reports, image processing) not queued? → BullMQ
- External API calls without timeout/retry/circuit breaker?
- Rate limiting configured? (`express-rate-limit` + `rate-limit-redis`)
- PM2 cluster mode or Node.js `cluster` for multi-core?

### Output format:
```
## Performance Report
### Database: X/10 — issues and fixes
### Application: X/10 — issues and fixes
### Caching: X/10 — opportunities
### Scalability: X/10 — issues and fixes
### Priority Fixes: ordered by impact
```

---

## Command: add-route

**Usage**: `add-route <module>`

Detect framework and register the new route:

| Framework | How to Register |
|---|---|
| **Express** | Find route index file → add `import` + `router.use('/path', route)` |

**Rules**: Read existing registrations first. Match exact naming/import pattern. Don't modify existing routes. Verify route file exists.

---

## Mongoose Field Type Reference

| Type | Mongoose | Zod Validator | Notes |
|---|---|---|---|
| String | `String` | `z.string()` | Add `trim: true` for user input |
| Text (long) | `String` | `z.string()` | No difference in Mongo, just longer |
| Number | `Number` | `z.number()` | Use for int and float |
| Boolean | `Boolean` | `z.boolean()` | |
| Date | `Date` | `z.date()` or `z.string().datetime()` | |
| ObjectId (FK) | `Schema.Types.ObjectId, ref: 'Model'` | `z.string().regex(/^[0-9a-fA-F]{24}$/)` | Always index |
| Enum | `String, enum: ['a','b']` | `z.enum(['a','b'])` | |
| Array | `[String]` or `[SubSchema]` | `z.array(z.string())` | Careful with unbounded growth |
| Nested Object | `{ field: Type }` or subdocument | `z.object({})` | Use subdocument for complex |
| Mixed/JSON | `Schema.Types.Mixed` | `z.record(z.unknown())` | Must `markModified()` before save |
| Map | `Map, of: String` | `z.record(z.string())` | Key-value pairs |
| Decimal | `Schema.Types.Decimal128` | `z.string()` | For financial data |

---

## Mongoose Transaction Template

For operations that modify multiple documents/collections:

```ts
import mongoose from 'mongoose';

async function multiStepOperation(data: InputType) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // All writes pass { session }
    const doc1 = await Model1.create([{ ...data }], { session });
    await Model2.findByIdAndUpdate(id, { $inc: { count: 1 } }, { session });
    await Model3.updateMany({ filter }, { $set: { field: value } }, { session });

    await session.commitTransaction();
    return doc1[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

**Rules**:
- `Model.create()` inside transaction must use array syntax: `Model.create([doc], { session })`
- Always `endSession()` in finally
- Keep transactions short (< 60 seconds)
- Avoid transactions for single-document operations (MongoDB single-doc writes are already atomic)
