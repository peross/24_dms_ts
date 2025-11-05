# DMS Backend API

Node.js backend API for Document Management System built with TypeScript, Express, Sequelize, and MySQL with robust authentication and authorization.

## Tech Stack

- **Node.js** - Runtime environment
- **TypeScript** - Type safety
- **Express** - Web framework
- **Sequelize** - ORM for MySQL
- **MySQL** - Database
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **dotenv** - Environment variables

## Features

- 🔐 **Robust Authentication System**
  - Access tokens (short-lived, 15 minutes)
  - Refresh tokens (long-lived, 7 days)
  - Automatic token refresh
  - Token revocation on logout
- 👥 **Role-Based Access Control (RBAC)**
  - Separate roles table
  - User-role many-to-many relationship
  - Flexible role assignment
- 🗄️ **Clean Database Structure**
  - Normalized schema with proper relationships
  - Snake_case column naming convention
  - Primary keys follow `[table_name]_id` pattern

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Sequelize database configuration
│   ├── models/
│   │   ├── user.model.ts        # User model
│   │   ├── role.model.ts        # Role model
│   │   ├── user-role.model.ts   # User-Role junction table
│   │   ├── refresh-token.model.ts # Refresh token model
│   │   ├── folder.model.ts      # Folder model
│   │   ├── file.model.ts        # File model
│   │   └── index.ts             # Model exports
│   ├── services/
│   │   ├── user.service.ts      # User business logic
│   │   └── auth.service.ts      # Authentication logic
│   ├── controllers/
│   │   └── auth.controller.ts   # Authentication HTTP handlers
│   ├── middleware/
│   │   └── auth.middleware.ts   # JWT authentication & authorization
│   ├── routes/
│   │   └── auth.route.ts        # Authentication routes
│   ├── utils/
│   │   ├── jwt.util.ts          # JWT token utilities
│   │   └── password.util.ts     # Password hashing utilities
│   ├── seed/
│   │   ├── role.seed.ts         # Role seed data
│   │   ├── user.seed.ts         # User seed data
│   │   └── index.ts             # Seed runner
│   └── index.ts                 # Entry point
├── dist/                        # Compiled JavaScript (generated)
├── .env.example                 # Environment variables template
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dms_db
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

**Important**: Change the JWT secrets in production!

### 3. Create MySQL Database

```sql
CREATE DATABASE dms_db;
```

### 4. Run the Server

Development mode (with hot reload):
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

### 5. Seed Database (Optional)

Create demo roles and users for testing:

```bash
npm run seed
```

This will create:
- **Roles**: `admin`, `user`
- **Admin user**: `admin@demo.com` / `admin123` (with `admin` role)
- **Regular user**: `user@demo.com` / `user123` (with `user` role)

**Note**: The seed script will skip existing data, so it's safe to run multiple times.

## Database Models

### User
- `user_id` - Primary key
- `email` - Unique email address
- `password` - Hashed password (bcrypt)
- `first_name` - User's first name
- `last_name` - User's last name
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### Role
- `role_id` - Primary key
- `name` - Unique role name (e.g., "admin", "user")
- `description` - Role description
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### UserRole (Junction Table)
- `user_role_id` - Primary key
- `user_id` - Foreign key to users
- `role_id` - Foreign key to roles
- Unique constraint on (`user_id`, `role_id`)

### RefreshToken
- `refresh_token_id` - Primary key
- `user_id` - Foreign key to users
- `token` - Unique refresh token string
- `expires_at` - Token expiration date
- `revoked` - Boolean flag for token revocation
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### Folder
- `folder_id` - Primary key
- `name` - Folder name
- `path` - Full folder path
- `parent_id` - Reference to parent folder (self-referential, nullable)
- `user_id` - Owner of the folder
- `permissions` - Unix-style permissions (e.g., "755")
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### File
- `file_id` - Primary key
- `name` - File name
- `path` - Full file path
- `size` - File size in bytes
- `mime_type` - MIME type of the file
- `folder_id` - Parent folder reference (nullable)
- `user_id` - Owner of the file
- `permissions` - Unix-style permissions (e.g., "644")
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "roleNames": ["user"]
}
```

**Response:**
```json
{
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new_refresh_token..."
}
```

#### POST `/api/auth/logout`
Logout and revoke refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### POST `/api/auth/logout-all`
Logout from all devices (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

#### GET `/api/auth/profile`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user"]
  }
}
```

### General

- `GET /health` - Health check
- `GET /api` - API information

## Authentication Flow

1. **Login/Register**: User receives both `accessToken` and `refreshToken`
2. **API Requests**: Include `accessToken` in `Authorization: Bearer <token>` header
3. **Token Expiration**: When `accessToken` expires (401), use `refreshToken` to get new tokens
4. **Logout**: Revoke `refreshToken` to prevent further token refresh

## Authorization

The `authorize` middleware can be used to protect routes based on roles:

```typescript
import { authenticate, authorize } from '../middleware/auth.middleware';

router.get('/admin-only', authenticate, authorize('admin'), adminController);
```

## Development

The server will automatically create database tables in development mode using `sequelize.sync({ alter: true })`. In production, use migrations instead.

## Security Notes

- Passwords are hashed using bcrypt (10 salt rounds)
- Access tokens are short-lived (15 minutes) for security
- Refresh tokens are stored in database and can be revoked
- All tokens are revoked on logout
- JWT secrets should be strong and unique in production
- Use HTTPS in production

## License

MIT
