# Quill HR Manager

A modern, full-featured HR Management System built with React, TypeScript, and Supabase.

## 🌟 Features

### For Employees
- ✅ **Attendance Management**: Check-in/Check-out with location tracking
- 📅 **Leave Requests**: Apply for various types of leave (Sick, Casual, Annual, etc.)
- 📊 **Attendance Reports**: View and export attendance history (CSV/PDF)
- 📆 **Attendance Calendar**: Visual monthly attendance view
- ✓ **Task Management**: View and update assigned tasks

### For Admins
- 👥 **Employee Management**: Full CRUD operations for employee records
- 📋 **Attendance Monitoring**: Real-time attendance tracking with working hours
- 🗓️ **Leave Approval**: Review and approve/reject leave requests
- 📝 **Task Assignment**: Create and assign tasks to employees
- 📈 **Dashboard**: Overview of attendance, leave, and task statistics

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Authentication)
- **State Management**: React Query (TanStack Query)
- **Date Handling**: date-fns
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 16+ and npm
- Supabase account (free tier works)
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/quill-hr-manager.git
cd quill-hr-manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project:
- Dashboard → Settings → API → Project URL
- Dashboard → Settings → API → anon/public key

### 4. Set Up Supabase Database

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

Quick steps:
1. Run `RESET_DATABASE.sql` in Supabase SQL Editor
2. Create admin user in Authentication panel
3. Run `INSERT_USERS.sql` with your admin user UUID
4. (Optional) Disable email confirmation in Auth settings

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Login

Use the admin credentials you created:
- Email: `admin@company.com`
- Password: (the one you set)

## 📦 Deployment to Vercel

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/quill-hr-manager)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 📁 Project Structure

```
quill-hr-manager/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin-only components
│   │   ├── hr/             # Employee components
│   │   └── ui/             # Reusable UI components (shadcn)
│   ├── contexts/           # React Context (Auth)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (Supabase client)
│   ├── pages/              # Page components
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── .env.example            # Environment variables template
├── DEPLOYMENT.md           # Deployment guide
├── SUPABASE_SETUP.md       # Database setup guide
└── package.json            # Dependencies
```

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ Supabase Row Level Security (RLS) enabled
- ✅ Role-based access control (Admin/Employee)
- ✅ `.env` files excluded from Git
- ✅ Secure authentication with Supabase Auth

**Important**: Never commit `.env` files to GitHub!

## 🧪 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 📊 Database Schema

### Tables
- `employees` - Employee information and credentials
- `attendance` - Daily check-in/check-out records
- `leave_requests` - Leave applications and approvals
- `tasks` - Task assignments and tracking

See `supabase-schema.sql` for complete schema.

## 🎨 UI Components

Built with [shadcn/ui](https://ui.shadcn.com/):
- Cards, Buttons, Inputs, Forms
- Dialogs, Alerts, Toasts
- Tables, Calendars, Selects
- And more...

## 📖 Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Database Schema](./supabase-schema.sql)

## 🐛 Troubleshooting

### "Missing environment variables" error
- Ensure `.env` file exists with correct values
- Restart dev server after adding variables

### Authentication not working
- Check Supabase project URL is correct
- Verify email confirmation is disabled (or confirm email)
- Check browser console for errors

### Build fails
- Run `npm run build` locally to see errors
- Ensure all dependencies are installed
- Check TypeScript errors

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Support

For issues and questions:
- Check existing documentation
- Review closed issues on GitHub
- Open a new issue with detailed description

---

**Built with ❤️ using React, TypeScript, and Supabase**
