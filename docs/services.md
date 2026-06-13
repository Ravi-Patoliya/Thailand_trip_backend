# Services API

Base URL: `/api/services`

---

## City Enum Values

The following are the only accepted values for any `city` field across all endpoints.

| ID | Value        |
|----|--------------|
| 1  | `bangkok`    |
| 2  | `phuket`     |
| 3  | `pattaya`    |
| 4  | `chiang_mai` |
| 5  | `koh_samui`  |

---

## Endpoints

### 1. List / Filter Services

```
GET /api/services
```

**Auth:** Optional — send Bearer token to access admin-level fields (`isActive`, `isFeatured` filters).

**Query Parameters**

| Parameter      | Type              | Required | Default | Description |
|----------------|-------------------|----------|---------|-------------|
| `id`           | MongoID           | No       | —       | Returns a single service by ID. All other params are ignored. |
| `page`         | number            | No       | `1`     | Page number for pagination. |
| `limit`        | number            | No       | `20`    | Items per page. Max: `100`. |
| `category`     | MongoID           | No       | —       | Filter services by category ID. |
| `city`         | string (enum)     | No       | —       | One of the 5 city values above. |
| `availability` | string (enum)     | No       | —       | `available` \| `limited` \| `unavailable` |
| `minPrice`     | number            | No       | —       | Filter base price ≥ value. |
| `maxPrice`     | number            | No       | —       | Filter base price ≤ value. |
| `tags`         | string            | No       | —       | Comma-separated list, e.g. `beach,luxury`. |
| `sort`         | string (enum)     | No       | —       | `price_asc` \| `price_desc` \| `rating` \| `newest` |
| `isActive`     | `"true"/"false"`  | No       | —       | **Admin only.** Filter by active status. |
| `isFeatured`   | `"true"/"false"`  | No       | —       | **Admin only.** Filter featured services. |

**Success Response — `200 OK`**

```json
{
  "message": "Services fetched.",
  "payload": {
    "data": [ ],
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

---

### 2. Get Single Service

```
GET /api/services?id=<mongoId>
```

**Auth:** Optional

**Success Response — `200 OK`**

```json
{
  "message": "Service fetched.",
  "payload": { }
}
```

**Error Responses**

| Status | Reason |
|--------|--------|
| `404`  | Service not found or inactive (public view). |

---

### 3. Create Service

```
POST /api/services
Authorization: Bearer <token>
Content-Type: application/json
```

**Auth:** Required — Admin or Superadmin.

**Request Body**

| Field              | Type          | Required | Description |
|--------------------|---------------|----------|-------------|
| `title`            | string        | Yes      | Max 150 characters. Must be unique. |
| `category`         | MongoID       | Yes      | Must reference an existing category. |
| `description`      | string        | Yes      | Full description (HTML allowed). |
| `shortDescription` | string        | No       | Max 300 characters. Used on cards. |
| `pricing`          | array         | Yes      | At least 1 pricing tier. See below. |
| `duration.value`   | number        | No       | Numeric duration, e.g. `3`. |
| `duration.unit`    | string (enum) | No       | `hours` \| `days` \| `nights` |
| `maxGroupSize`     | number        | No       | Min `1`. `null` = no limit. |
| `availability`     | string (enum) | No       | `available` \| `limited` \| `unavailable`. Default: `available`. |
| `inclusions`       | string[]      | No       | e.g. `["Airport pickup", "Breakfast"]` |
| `exclusions`       | string[]      | No       | e.g. `["Airfare", "Personal expenses"]` |
| `highlights`       | string[]      | No       | Key selling points shown on detail page. |
| `location.city`    | string (enum) | No       | One of the 5 city values above. |
| `location.region`  | string        | No       | Sub-region free text, e.g. `"Andaman Coast"`. |
| `isActive`         | boolean       | No       | Default: `true`. |
| `isFeatured`       | boolean       | No       | Default: `false`. |
| `metaTitle`        | string        | No       | SEO meta title. |
| `metaDescription`  | string        | No       | SEO meta description. |
| `tags`             | string[]      | No       | Auto-lowercased, e.g. `["beach", "luxury"]`. |

**Pricing Tier Object**

```json
{
  "label": "Per Person",
  "amount": 2500,
  "currency": "INR",
  "isBase": true
}
```

> Mark exactly one tier with `"isBase": true`. Its `amount` becomes the `basePrice` used for price filtering and sorting.

**Example Request Body**

```json
{
  "title": "Phuket Island Hopping",
  "category": "665f1a2b3c4d5e6f7a8b9c0d",
  "description": "<p>Visit 3 stunning islands in a single day...</p>",
  "shortDescription": "Full-day island tour with snorkeling and lunch.",
  "pricing": [
    { "label": "Per Person", "amount": 2500, "currency": "INR", "isBase": true },
    { "label": "Per Group (max 6)", "amount": 12000, "currency": "INR", "isBase": false }
  ],
  "duration": { "value": 8, "unit": "hours" },
  "maxGroupSize": 12,
  "availability": "available",
  "inclusions": ["Boat transfer", "Lunch", "Snorkeling gear"],
  "exclusions": ["Personal expenses", "Airfare"],
  "highlights": ["3 islands in 1 day", "Coral reef snorkeling"],
  "location": { "city": "phuket", "region": "Andaman Coast" },
  "isActive": true,
  "isFeatured": false,
  "tags": ["beach", "island", "adventure"],
  "metaTitle": "Phuket Island Hopping Tour | Thailand Tours",
  "metaDescription": "Book the best island hopping tour in Phuket."
}
```

**Success Response — `201 Created`**

```json
{
  "message": "Service created successfully.",
  "payload": { }
}
```

**Error Responses**

| Status | Reason |
|--------|--------|
| `401`  | No or expired token. |
| `403`  | Not an admin. |
| `404`  | Category not found. |
| `409`  | Service with this title already exists. |
| `422`  | Validation error — `errors` key contains field-level details. |

---

### 4. Update Service

```
PATCH /api/services/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Auth:** Required — Admin or Superadmin.

**URL Params**

| Param | Type    | Required | Description |
|-------|---------|----------|-------------|
| `id`  | MongoID | Yes      | ID of the service to update. |

**Request Body**

All fields are the same as Create. All are optional — send only the fields you want to change. At least one field is required.

**Success Response — `200 OK`**

```json
{
  "message": "Service updated successfully.",
  "payload": { }
}
```

**Error Responses**

| Status | Reason |
|--------|--------|
| `400`  | No fields provided. |
| `401`  | No or expired token. |
| `403`  | Not an admin. |
| `404`  | Service or Category not found. |
| `409`  | Duplicate title conflict. |
| `422`  | Validation error. |

---

### 5. Delete (Deactivate) Service

```
DELETE /api/services/:id
Authorization: Bearer <token>
```

**Auth:** Required — Admin or Superadmin.

> This is a **soft delete** — the service is set to `isActive: false` and remains in the database.

**URL Params**

| Param | Type    | Required | Description |
|-------|---------|----------|-------------|
| `id`  | MongoID | Yes      | ID of the service to deactivate. |

**Success Response — `200 OK`**

```json
{
  "message": "Service deactivated successfully.",
  "payload": null
}
```

**Error Responses**

| Status | Reason |
|--------|--------|
| `400`  | Service is already deactivated. |
| `401`  | No or expired token. |
| `403`  | Not an admin. |
| `404`  | Service not found. |

---

## Service Object (Full Response Shape)

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0d",
  "title": "Phuket Island Hopping",
  "slug": "phuket-island-hopping",
  "category": "665f1a2b3c4d5e6f7a8b9c01",
  "description": "<p>Visit 3 stunning islands...</p>",
  "shortDescription": "Full-day island tour with snorkeling and lunch.",
  "pricing": [
    { "_id": "...", "label": "Per Person", "amount": 2500, "currency": "INR", "isBase": true }
  ],
  "basePrice": 2500,
  "currency": "INR",
  "images": [
    {
      "_id": "...",
      "url": "https://cdn.example.com/services/phuket-1.webp",
      "key": "services/phuket-1.webp",
      "isPrimary": true,
      "altText": "",
      "mimeType": "image/webp",
      "sizeBytes": 204800
    }
  ],
  "videos": [],
  "duration": { "value": 8, "unit": "hours" },
  "maxGroupSize": 12,
  "availability": "available",
  "inclusions": ["Boat transfer", "Lunch", "Snorkeling gear"],
  "exclusions": ["Personal expenses", "Airfare"],
  "highlights": ["3 islands in 1 day", "Coral reef snorkeling"],
  "location": {
    "city": "phuket",
    "region": "Andaman Coast"
  },
  "rating": { "average": 4.5, "count": 28 },
  "isActive": true,
  "isFeatured": false,
  "order": 3,
  "tags": ["beach", "island", "adventure"],
  "metaTitle": "Phuket Island Hopping Tour | Thailand Tours",
  "metaDescription": "Book the best island hopping tour in Phuket.",
  "createdBy": "665f1a2b3c4d5e6f7a8b9c00",
  "updatedBy": null,
  "createdAt": "2025-01-15T08:30:00.000Z",
  "updatedAt": "2025-06-01T12:00:00.000Z",
  "primaryImage": {
    "url": "https://cdn.example.com/services/phuket-1.webp",
    "isPrimary": true,
    "altText": ""
  },
  "id": "665f1a2b3c4d5e6f7a8b9c0d"
}
```

> `primaryImage` is a virtual field — it returns the image with `isPrimary: true`, falling back to `images[0]`. Use it directly as the card thumbnail.

---

## Notes for Frontend

- **City filter** should use a **dropdown**, not a free-text input — values are strictly validated against the enum.
- **`basePrice`** is the display price for listing cards. The full `pricing[]` array is for the service detail / booking page.
- **Pagination**: always use `page` + `limit`. The response always returns `total` so you can calculate total pages: `Math.ceil(total / limit)`.
- **Soft delete**: deleted services still exist in the DB with `isActive: false`. Public API automatically hides them; admin API shows them with the `isActive=false` filter.
- **Image upload** for services is handled separately via the Upload API — upload first to get the S3 `url` and `key`, then include them in the `images` array when creating/updating a service.
