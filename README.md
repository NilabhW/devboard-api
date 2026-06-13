# DevBoard API

A production-ready REST API for developer project and task management — built like a simplified Jira. Built by [Nilabh](https://github.com/NilabhW) as a full end-to-end backend engineering project.

---

## About

DevBoard is a backend API that powers a project and task management system for developer teams. It demonstrates real-world backend engineering patterns including JWT authentication with token rotation, role-based access control, relational data modeling in MongoDB, Redis-backed token blacklisting, file uploads via Cloudinary, and transactional email notifications.

This is not a tutorial clone — it's designed to reflect the kind of backend systems used in production at SaaS and product companies.

---

## Features

- **JWT Authentication** — Access + refresh token rotation with 15-minute expiry on access tokens
- **Token Blacklisting** — Logout invalidates both access and refresh tokens via Redis; revoked tokens are rejected on every request
- **Role-Based Access Control (RBAC)** — Per-project roles (Admin / Member / Viewer) enforced at the middleware level
- **Projects API** — Full CRUD with member management; creators are automatically assigned as Admin
- **Tasks API** — Full CRUD with assignment, status tracking, and priority levels
- **File Attachments** — Upload files to tasks via Cloudinary (images, PDFs, docs); delete removes from cloud storage too
- **Email Notifications** — Transactional emails on task assignment and project member invitations (Nodemailer + Ethereal in dev)
- **Advanced Querying** — Filter by status/priority/assignee, sort by multiple fields, paginate results via query params
- **Consistent Response Format** — Every endpoint returns `{ success, message, data }` for predictable API consumption
- **Security** — Helmet, CORS, bcrypt password hashing
- **Developer Experience** — Nodemon, dotenv, Morgan request logging, centralised error handling middleware

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Cache / Token Store | Redis (ioredis) |
| Authentication | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| File Storage | Cloudinary + multer-storage-cloudinary |
| Email | Nodemailer (Ethereal in dev / SMTP in prod) |
| Frontend | React + Vite |
| Dev Tools | Nodemon |

---

## Project Structure

```
devboard-api/
├── src/
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   ├── redis.js                # Redis client setup
│   │   ├── cloudinary.js           # Cloudinary + multer storage config
│   │   └── mailer.js               # Nodemailer transporter (Ethereal / SMTP)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── project.controller.js
│   │   ├── task.controller.js
│   │   └── upload.controller.js    # File attachment upload/delete
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT verification
│   │   ├── authorize.js            # RBAC enforcement
│   │   ├── upload.js               # Multer middleware
│   │   └── error.middleware.js     # Centralised error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js                 # Includes embedded attachments subdocument
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── project.routes.js
│   │   ├── task.routes.js
│   │   └── upload.routes.js
│   ├── utils/
│   │   ├── ApiError.js             # Custom error class
│   │   ├── catchAsync.js           # Async error wrapper
│   │   ├── sendResponse.js         # Consistent response helper
│   │   └── emailTemplates.js       # HTML email templates
│   └── app.js
├── frontend/                       # React + Vite frontend
├── .env.example
└── package.json
```

---

## API Endpoints

### Health Check
```
GET    /api/health                  API status, environment, timestamp (public)
```

### Auth
```
POST   /api/auth/register           Create a new account
POST   /api/auth/login              Login and receive access + refresh tokens
POST   /api/auth/refresh            Rotate access token using refresh token
POST   /api/auth/logout             Blacklist both tokens and end session
GET    /api/auth/me                 Get authenticated user profile
```

### Projects
```
POST   /api/projects                        Create a project
GET    /api/projects                        Get all projects you're a member of
GET    /api/projects/:id                    Get a single project with members
PATCH  /api/projects/:id                    Update project (Admin only)
DELETE /api/projects/:id                    Delete project + all tasks (Owner only)
POST   /api/projects/:id/members            Add a member with role (Admin only)
DELETE /api/projects/:id/members/:userId    Remove a member (Admin only)
```

### Tasks
```
POST   /api/projects/:projectId/tasks                         Create a task
GET    /api/projects/:projectId/tasks                         Get tasks (filter/sort/paginate)
GET    /api/projects/:projectId/tasks/:taskId                 Get single task
PATCH  /api/projects/:projectId/tasks/:taskId                 Update task
DELETE /api/projects/:projectId/tasks/:taskId                 Delete task (Admin only)
PATCH  /api/projects/:projectId/tasks/:taskId/assign          Assign/unassign task
```

**Task query params:** `?status=todo&priority=high&assignee=userId&sortBy=dueDate&order=asc&page=1&limit=10`

Allowed `sortBy` values: `createdAt` (default), `dueDate`, `priority`, `status`, `updatedAt`

### Attachments
```
POST   /api/projects/:projectId/tasks/:taskId/attachments              Upload files to a task (Admin / Member)
DELETE /api/projects/:projectId/tasks/:taskId/attachments/:attachmentId Delete an attachment (Admin / Member)
```

Accepted file types: `jpg`, `jpeg`, `png`, `pdf`, `docx`

---

## Task Fields

| Field | Values |
|---|---|
| `status` | `todo` · `in_progress` · `in_review` · `done` |
| `priority` | `low` · `medium` · `high` · `urgent` |

---

## RBAC Rules

| Action | Admin | Member | Viewer |
|---|---|---|---|
| View project & tasks | ✅ | ✅ | ✅ |
| Create / edit tasks | ✅ | ✅ | ❌ |
| Assign tasks | ✅ | ✅ | ❌ |
| Upload / delete attachments | ✅ | ✅ | ❌ |
| Delete tasks | ✅ | ❌ | ❌ |
| Manage members | ✅ | ❌ | ❌ |
| Update project | ✅ | ❌ | ❌ |
| Delete project | Owner only | ❌ | ❌ |

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- Cloudinary account (for file attachments)

### Installation

```bash
# Clone the repo
git clone https://github.com/NilabhW/devboard-api.git
cd devboard-api

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/devboard

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_access_key_change_me
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_me
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cloudinary (File Attachments)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# SMTP (Email Notifications)
# Leave empty to auto-use Ethereal test accounts in development
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### Run

```bash
# Start the backend (from project root)
npm run dev                   # API on http://localhost:5000

# Start the frontend (separate terminal)
cd frontend && npm run dev    # Frontend on http://localhost:5173
```

---

## Auth Flow

```
Register / Login
      ↓
Receive access token (15m) + refresh token (7d)
      ↓
Send access token on every request → Authorization: Bearer <token>
      ↓
Token expired? → POST /api/auth/refresh → new access token + new refresh token
      ↓
Logout → both access token AND refresh token blacklisted in Redis → all future requests rejected
```

---

## Email Notifications

DevBoard sends transactional emails on two events:

| Event | Recipient | Template |
|---|---|---|
| Task assigned | Assignee | Task title + project name + link |
| Added to project | New member | Project name + link |

In **development**, emails are caught by an auto-created [Ethereal](https://ethereal.email) test account — no real delivery, just a preview URL logged to the console.

In **production**, set your `SMTP_*` environment variables to use any real SMTP provider (SendGrid, Mailgun, etc.).

Email failures are **fire-and-forget** — they never break the API response.

---

## Response Format

Every endpoint returns a consistent structure:

```json
// Success
{
  "success": true,
  "message": "Project created successfully",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "You are not authorized to perform this action"
}
```

In `development` mode, error responses also include a `stack` field for debugging.

---

## Author

**Nilabh**
- GitHub: [@NilabhW](https://github.com/NilabhW)

---

## License

MIT
