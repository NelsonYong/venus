# Venus

English | [简体中文](./README.zh-CN.md)

A modern AI application built with Next.js, PostgreSQL, and Prisma.

## Tech Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Type Checking**: TypeScript
- **Containerization**: Docker & Docker Compose

## Project Structure

```
my-nextjs-app/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── users/         # User-related APIs
│   │   └── posts/         # Post-related APIs
│   ├── posts/             # Post pages
│   ├── users/             # User pages
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Utility libraries
│   └── prisma.ts         # Prisma client
├── prisma/               # Database related
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts          # Seed data
├── .env                  # Environment variables
├── docker-compose.yml    # Docker services config
├── package.json
└── README.md
```

## Database Models

- **User**: User information
- **Post**: Article content
- **Comment**: Comments
- **Tag**: Tags
- **ApiUsage**: API usage records

## Quick Start

### Prerequisites

Make sure you have installed:

- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone the Project

```bash
git clone <your-repo-url>
cd my-nextjs-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file:

```env
# Database connection
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/myapp_development"

# Next.js configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### 4. Start Database Services

```bash
# Start PostgreSQL database
docker-compose up -d postgres

# Verify database status
docker-compose ps
```

### 5. Database Initialization

```bash
# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Seed data (optional)
npx prisma db seed
```

### 6. Start Development Server

```bash
npm run dev
```

The application will start at http://localhost:3000.

## Available Scripts

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server

# Database management
npm run db:up                  # Start database services
npm run db:down                # Stop database services
npm run db:reset               # Reset database (delete all data)
npm run db:seed                # Run seed data
npm run db:studio              # Start Prisma Studio
npm run db:migrate             # Run migrations
npm run db:generate            # Generate Prisma Client

# Management interfaces
npm run db:admin               # Start pgAdmin (http://localhost:8080)
npm run db:adminer             # Start Adminer (http://localhost:8081)
```

## Database Management Interfaces

### Prisma Studio (Recommended)

```bash
npm run db:studio
```

Access: http://localhost:5555

### pgAdmin

```bash
docker-compose up -d pgadmin
```

Access: http://localhost:8080

- Email: admin@example.com
- Password: admin123

### Adminer (Lightweight)

```bash
docker-compose up -d adminer
```

Access: http://localhost:8081

- Server: postgres
- Username: myuser
- Password: mypassword
- Database: myapp_development

### Command Line Access

```bash
# Connect via Docker
npm run db:psql

# Or use psql directly
psql -h localhost -p 5432 -U myuser -d myapp_development
```

## Development Workflow

### Adding New Data Models

1. Edit `prisma/schema.prisma` to add new models
2. Create migration:
   ```bash
   npx prisma migrate dev --name add_new_model
   ```
3. Generate client:
   ```bash
   npx prisma generate
   ```

### Reset Development Environment

```bash
# Complete reset (delete all data)
npm run db:reset

# Restart development environment
npm run dev
```

### Database Backup and Restore

```bash
# Backup database
docker exec my-app-postgres pg_dump -U myuser myapp_development > backup.sql

# Restore database
docker exec -i my-app-postgres psql -U myuser myapp_development < backup.sql
```

## API Routes

### User Related

- `GET /api/users` - Get user list
- `POST /api/users` - Create new user

### Post Related

- `GET /api/posts` - Get post list
- `GET /api/posts?published=true` - Get published posts
- `POST /api/posts` - Create new post

## Page Routes

- `/` - Home page
- `/posts` - Post list page
- `/users` - User list page
- `/posts/[slug]` - Post detail page (needs implementation)

## Troubleshooting

### Database Connection Failed

1. Ensure Docker services are running:
   ```bash
   docker-compose ps
   ```
2. Check environment variable configuration
3. Restart database service:
   ```bash
   docker-compose restart postgres
   ```

### Table Does Not Exist Error

```bash
# Check migration status
npx prisma migrate status

# Reset database if needed
npx prisma migrate reset
```

### Prisma Studio Won't Start

```bash
# Ensure Prisma Client is up to date
npx prisma generate

# Restart
npx prisma studio
```

### Port Already in Use

If you encounter port conflicts, modify port mapping in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432" # Change local port to 5433
```

Then update `DATABASE_URL` in `.env`.

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Docker Production Deployment

```bash
# Build production image
docker build -t my-app .

# Start with production config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Look at existing [Issues](https://github.com/your-username/your-repo/issues)
3. Create a new Issue describing your problem

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

## Features

- ✅ Modern Next.js 14 with App Router
- ✅ Type-safe database operations with Prisma
- ✅ PostgreSQL with Docker setup
- ✅ Multiple database management interfaces
- ✅ Seed data and migrations
- ✅ API routes for CRUD operations
- ✅ Responsive UI with Tailwind CSS
- ✅ TypeScript for type safety
- ✅ Development and production configurations

## Roadmap

- [ ] Authentication with NextAuth.js
- [ ] File upload functionality
- [ ] Search and filtering
- [ ] Pagination
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] API rate limiting
- [ ] Comprehensive testing suite
