# DevBoard API

A production-ready REST API for developer project and task management — built like a simplified Jira. Built by [Nilabh](https://github.com/Nilabh) as a full end-to-end backend engineering project.

---

## About

DevBoard is a backend API that powers a project and task management system for developer teams. It demonstrates real-world backend engineering patterns including JWT authentication with token rotation, role-based access control, relational data modeling in MongoDB, and Redis-backed token blacklisting.

This is not a tutorial clone — it's designed to reflect the kind of backend systems used in production at SaaS and product companies.

---

## Features

- **JWT Authentication** — Access + refresh token rotation with 15-minute expiry on access tokens
- **Token Blacklisting** — Logout invalidates tokens via Redis; revoked tokens are rejected on every request
- **Role-Based Access Control (RBAC)** — Per-project roles (Admin / Member / Viewer) enforced at the middleware level
- **Projects API** — Full CRUD with member management; creators are automatically assigned as Admin
- **Tasks API** — Full CRUD with assignment, status tracking, and priority levels
- **Advanced Querying** — Filter by status/priority/assignee, sort by date, paginate results via query params
- **Consistent Response Format** — Every endpoint returns `{ success, data, message }` for predictable API consumption
- **Security** — Helmet, CORS, rate limiting, bcrypt password hashing
- **Developer Experience** — Nodemon, dotenv, Morgan request logging, structured error handling

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
| Frontend | React + Vite |
| HTTP Client | Axios (with interceptor) |
| Dev Tools | Nodemon, Concurrently |

---

## Project Structure

```
devboard/
├── server/
│   └── src/
│       ├── config/
│       │   ├── db.js               # MongoDB connection
│       │   └── redis.js            # Redis client setup
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── project.controller.js
│       │   └── task.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js  # JWT verification
│       │   └── authorize.js        # RBAC enforcement
│       ├── models/
│       │   ├── User.js
│       │   ├── Project.js
│       │   └── Task.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── project.routes.js
│       │   └── task.routes.js
│       ├── utils/
│       │   └── responseFormatter.js
│       ├── app.js
│       └── server.js
├── client/                         # React + Vite frontend
└── package.json                    # Root with concurrently scripts
```

---

## API Endpoints

### Auth
```
POST   /api/auth/register       Create a new account
POST   /api/auth/login          Login and receive access + refresh tokens
POST   /api/auth/refresh        Rotate access token using refresh token
POST   /api/auth/logout         Blacklist token and end session
GET    /api/auth/me             Get authenticated user profile
```

### Projects
```
POST   /api/projects                        Create a project
GET    /api/projects                        Get all projects you're a member of
GET    /api/projects/:id                    Get a single project with members
PATCH  /api/projects/:id                    Update project (Admin only)
DELETE /api/projects/:id                    Delete project (Owner only)
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
PATCH  /api/projects/:projectId/tasks/:taskId/assign          Assign task to member
```

**Task query params:** `?status=todo&priority=high&assignee=userId&sortBy=dueDate&order=asc&page=1&limit=10`

---

## RBAC Rules

| Action | Admin | Member | Viewer |
|---|---|---|---|
| View project & tasks | ✅ | ✅ | ✅ |
| Create / edit tasks | ✅ | ✅ | ❌ |
| Assign tasks | ✅ | ✅ | ❌ |
| Delete tasks | ✅ | ❌ | ❌ |
| Manage members | ✅ | ❌ | ❌ |
| Update / delete project | ✅ | ❌ | ❌ |

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Redis (local or Upstash)

### Installation

```bash
# Clone the repo
git clone https://github.com/Nilabh/devboard-api.git
cd devboard-api

# Install all dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### Environment Variables

Create `server/.env` from the example:

```bash
cp server/.env.example server/.env
```

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/devboard
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### Run

```bash
# Start everything (backend + frontend) with one command
npm run dev
```

- API runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`

---

## Auth Flow

```
Register / Login
      ↓
Receive access token (15m) + refresh token (7d)
      ↓
Send access token on every request → Authorization: Bearer <token>
      ↓
Token expired? → POST /auth/refresh → new access token (handled automatically by Axios interceptor)
      ↓
Logout → refresh token blacklisted in Redis → all future requests rejected
```

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
  "message": "You are not authorized to perform this action",
  "error": "..."
}
```

---

## Author

**Nilabh**
- GitHub: [@Nilabh](https://github.com/NilabhW)

---

## License

MIT
