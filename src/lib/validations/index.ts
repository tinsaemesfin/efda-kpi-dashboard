import { z } from "zod";

// User validation schemas
export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

// KPI data validation schemas
export const kpiDataPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  target: z.number().optional(),
  unit: z.string().optional(),
  date: z.string().or(z.date()),
  category: z.string().optional(),
});

export const kpiChartDataSchema = z.object({
  title: z.string(),
  data: z.array(kpiDataPointSchema),
  type: z.enum(["line", "bar", "pie", "area", "scatter"]),
});

// Filter and search schemas
export const dateRangeSchema = z.object({
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
});

export const filterSchema = z.object({
  dateRange: dateRangeSchema.optional(),
  categories: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  kpiTypes: z.array(z.string()).optional(),
});

// API response schemas
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    success: z.boolean(),
    message: z.string().optional(),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }).optional(),
  });

// Form validation schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const reportFilterSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  kpiIds: z.array(z.string()).optional(),
  format: z.enum(["pdf", "excel", "csv"]).default("pdf"),
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type KPIDataPoint = z.infer<typeof kpiDataPointSchema>;
export type KPIChartData = z.infer<typeof kpiChartDataSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type ReportFilter = z.infer<typeof reportFilterSchema>;
