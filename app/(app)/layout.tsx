import { SidebarNav } from "@/components/sidebar-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarNav />
      <main className="pt-14 md:pt-0 md:pl-56">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </>
  );
}
