import { SidebarNav } from "@/components/sidebar-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarNav />
      <main className="pl-56">
        <div className="p-6">{children}</div>
      </main>
    </>
  );
}
