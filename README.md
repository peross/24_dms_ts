# DMS (Document Management System)

A full-stack document management system with a modern React frontend and TypeScript backend.

## Project Structure

```
24_dms_ts/
├── frontend/          # React + TypeScript frontend application
├── backend/           # TypeScript backend (to be implemented)
└── README.md         # This file
```

## Frontend

A modern file manager interface built with React, TypeScript, Vite, and shadcn/ui.

### Features

- 🎨 Modern UI with shadcn/ui components
- 🌓 Light and dark theme support
- 📁 Folder tree navigation
- 📄 File list with details (name, last modified, permission, size)
- 🎯 Clean, intuitive interface matching the design
- 🔍 Search functionality
- 📱 Fully responsive design
- ⚡ Built with Vite for fast development

### Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons

### Getting Started

You can run commands from the root directory (they will be proxied to the frontend):

Install dependencies:

```bash
npm install
```

Or install all workspace dependencies:

```bash
npm install:all
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

**Alternatively**, you can work directly in the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

### Frontend Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Sidebar.tsx   # Left navigation sidebar
│   │   ├── Header.tsx     # Top toolbar with actions
│   │   ├── FolderTree.tsx # Left pane folder tree
│   │   ├── FileList.tsx  # Right pane file list
│   │   └── ThemeToggle.tsx # Theme switcher
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles with Tailwind
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Dependencies and scripts
```

## Backend

Node.js backend API built with TypeScript, Express, Sequelize, and MySQL.

### Tech Stack

- **Node.js** - Runtime environment
- **TypeScript** - Type safety
- **Express** - Web framework
- **Sequelize** - ORM for MySQL
- **MySQL** - Database

### Getting Started

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file based on `.env.example` and configure your database:

```bash
cp .env.example .env
```

Create MySQL database:

```sql
CREATE DATABASE dms_db;
```

Run development server:

```bash
npm run dev
```

Or from root:

```bash
npm run dev:backend
```

### Backend Models

- **User** - User accounts with email, password, and role
- **Folder** - Folder structure with hierarchical support
- **File** - File metadata with size, MIME type, and permissions

### API Endpoints

- `GET /health` - Health check
- `GET /api` - API information

More endpoints to be implemented...

## Development

Run both frontend and backend:

```bash
npm run dev:all
```

Or individually:

```bash
npm run dev          # Frontend only
npm run dev:backend  # Backend only
```

## License

MIT
