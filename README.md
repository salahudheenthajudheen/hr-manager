# Quill HR Manager

A modern HR Management System built with React, TypeScript, and Supabase.

## Features

**For Employees:**
- Attendance check-in/out with GPS tracking
- Leave requests and calendar view
- Task management with photo attachments
- Attendance reports (CSV/PDF export)

**For Admins:**
- Employee management
- Attendance monitoring with location tracking
- Leave approval system
- Task assignment and tracking
- Dashboard with statistics

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Database + Auth)
- React Query

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Create `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. Setup Database

1. Create Supabase project
2. Run the SQL migrations in Supabase SQL Editor
3. Create admin user in Authentication
4. Add employee_photos column:
   ```sql
   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS employee_photos TEXT[];
   ```

### 4. Run

```bash
npm run dev
```

Visit `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── admin/     # Admin components
│   ├── hr/        # Employee components
│   └── ui/        # UI components
├── pages/         # Page routes
└── lib/           # Supabase client
```

## Deployment

**Vercel:**
1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

## Support

For issues, open a GitHub issue or check the documentation.

---

Built with React, TypeScript, and Supabase
