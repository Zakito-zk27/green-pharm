import { AdminApp } from "@/components/admin/AdminApp";

// The proxy (src/proxy.ts) sends visitors without a valid session to /admin/login,
// and every action re-checks the session on the server.
export default function AdminPage() {
  return <AdminApp />;
}
