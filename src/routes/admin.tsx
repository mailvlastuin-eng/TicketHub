import { createFileRoute } from '@tanstack/react-router';
import { AdminDashboardApp } from '../admin/AdminDashboardApp';

export const Route = createFileRoute('/admin')({
  component: AdminDashboardApp,
});
