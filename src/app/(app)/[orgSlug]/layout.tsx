import { OrgProvider } from '@/contexts/OrgContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrgHeader } from '@/components/OrgHeader';

export default function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  return (
    <AuthProvider>
      <OrgProvider slug={params.orgSlug}>
        <div className="min-h-screen bg-verse-bg flex flex-col">
          <OrgHeader />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </OrgProvider>
    </AuthProvider>
  );
}
