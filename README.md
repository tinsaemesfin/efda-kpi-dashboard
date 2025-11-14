# EFDA KPI Dashboard

A modern, responsive KPI (Key Performance Indicator) dashboard built with Next.js, designed for government and enterprise use with external authentication and role-based access control.

## 🚀 Features

- **Modern Tech Stack**: Next.js 15, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui for consistent, accessible design
- **State Management**: Zustand for predictable state management
- **Data Fetching**: TanStack Query (React Query) for efficient API calls
- **Validation**: Zod for type-safe form validation
- **Charts**: Recharts for complex data visualizations
- **Authentication Ready**: Prepared for external governmental auth integration
- **Responsive Design**: Mobile-first approach with sidebar navigation

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Validation**: Zod
- **Charts**: Recharts
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd efda-kpi-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Main dashboard page
├── components/            # Reusable components
│   ├── ui/               # Shadcn/ui components
│   ├── layout/           # Layout components (header, sidebar)
│   └── charts/           # Chart components (line, bar, pie)
├── lib/                  # Utilities and configurations
│   ├── stores/           # Zustand stores (auth, ui)
│   ├── validations/      # Zod validation schemas
│   ├── providers.tsx     # React Query provider
│   └── utils.ts          # Utility functions
└── types/                # TypeScript type definitions
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# External Auth Configuration (to be provided)
NEXT_PUBLIC_AUTH_URL=your-external-auth-url
NEXT_PUBLIC_API_BASE_URL=your-api-base-url

# Application Settings
NEXT_PUBLIC_APP_NAME="EFDA KPI Dashboard"
```

### Authentication Setup

The application is prepared for external governmental authentication. To integrate:

1. Update the `auth-store.ts` in `src/lib/stores/` with your authentication logic
2. Configure the external auth provider in your layout or middleware
3. Update the login/logout handlers to work with your auth system

### API Integration

The app uses TanStack Query for data fetching. Add your API calls to custom hooks:

```typescript
// Example: src/lib/hooks/use-kpis.ts
export function useKPIs() {
  return useQuery({
    queryKey: ['kpis'],
    queryFn: () => fetch('/api/kpis').then(res => res.json()),
  });
}
```

## 📊 Charts & Visualizations

The dashboard includes pre-built chart components using Recharts:

- **KPILineChart**: For time-series data with target lines
- **KPIBarChart**: For categorical comparisons
- **KPIPieChart**: For proportional data

Example usage:

```tsx
import { KPILineChart } from '@/components/charts';

const data = [
  { date: '2024-01-01', value: 1200, target: 1100 },
  // ... more data
];

<KPILineChart
  data={data}
  title="Performance Trend"
  description="Monthly KPI values vs targets"
/>
```

## 🎨 Customization

### Theme

The app uses Tailwind CSS with Shadcn/ui theming. Modify colors in `tailwind.config.ts`:

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        // Your custom colors
      }
    }
  }
}
```

### Components

Add new Shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Vercel Deployment

The app is optimized for Vercel deployment. Connect your repository and deploy automatically.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

---

Built with ❤️ for government and enterprise KPI monitoring
