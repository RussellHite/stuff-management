# Stuff Management - Multi-User Inventory System

A comprehensive multi-user inventory management system built with Next.js 15 and Supabase. Features include organization management, role-based access control, inventory tracking, QR code support, and transaction history.

## Features

- **Multi-Tenant Architecture**: Organizations with role-based access control
- **User Management**: Admin, Manager, Employee, and Viewer roles
- **Inventory Tracking**: Real-time stock levels across multiple locations
- **QR Code Support**: Generate and scan QR codes for products
- **Transaction History**: Complete audit trail of all inventory movements
- **Authentication**: Email/password and magic link authentication
- **Row Level Security**: Database-level security policies

## Database Schema

The system includes the following main tables:

1. **Organizations** - Companies/teams with multi-tenant support
2. **User Profiles** - Extended user information beyond Supabase Auth
3. **Organization Members** - User-organization relationships with roles
4. **Locations** - Warehouses, stores, offices, etc.
5. **Categories** - Product categorization with hierarchical support
6. **Products** - Items with SKUs, QR codes, and specifications
7. **Inventory** - Current stock levels by location
8. **Inventory Transactions** - All stock movements with audit trail

## Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **Authentication**: Supabase Auth with email/password and magic links
- **Database**: PostgreSQL with Row Level Security policies
- **Deployment**: Vercel (recommended)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd stuff-management
npm install
```

### 2. Set up Supabase

1. Create a new project at [https://supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up the Database

Run the SQL migrations in your Supabase SQL editor in order:

1. `supabase/migrations/001_initial_schema.sql` - Creates tables and indexes
2. `supabase/migrations/002_row_level_security.sql` - Sets up RLS policies
3. `supabase/migrations/003_sample_data.sql` - Adds sample data (optional)

### 4. Configure Authentication

In your Supabase project:

1. Go to Authentication > Settings
2. Set Site URL to `http://localhost:3000`
3. Add `http://localhost:3000/dashboard` to Redirect URLs
4. Enable email confirmations if desired

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Initial Setup

1. **Sign up** for a new account or use the sample data
2. **Create an organization** or join an existing one
3. **Set up locations** (warehouses, stores, etc.)
4. **Create categories** to organize products
5. **Add products** with SKUs and QR codes
6. **Start tracking inventory** across locations

### User Roles

- **Admin**: Full access to organization settings and all features
- **Manager**: Can manage inventory, products, and locations
- **Employee**: Can view and update inventory, create transactions
- **Viewer**: Read-only access to inventory and reports

### Sample Data

The system includes sample data with:
- 2 organizations (Acme Corporation, Global Logistics Inc)
- 4 locations across different organization
- 4 product categories
- 5 sample products with QR codes
- Initial inventory levels
- Sample transactions

To use sample data:
1. Create a user account
2. Add the user to an organization using the organization_members table
3. Run the `create_sample_transactions(user_id)` function

## Security

- **Row Level Security**: All database tables use RLS policies
- **Role-based Access**: Different permissions for each user role
- **Multi-tenant**: Organizations are completely isolated
- **Audit Trail**: All changes are logged with timestamps and user IDs

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Docker containers
- VPS with PM2

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
