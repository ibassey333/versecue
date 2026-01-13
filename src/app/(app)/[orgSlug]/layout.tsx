import { OrgProvider } from '@/contexts/OrgContext';

export default function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  return (
    <OrgProvider slug={params.orgSlug}>
      {children}
    </OrgProvider>
  );
}
