import { createFileRoute } from '@tanstack/react-router';
import { AdminDashboardApp } from '../admin/AdminDashboardApp';

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { name: "apple-mobile-web-app-title", content: "AdminHub" },
    ],
    links: [
      { rel: "apple-touch-icon", href: "/admin-apple-icon.png" },
    ],
  }),
  component: AdminDashboardApp,
});
