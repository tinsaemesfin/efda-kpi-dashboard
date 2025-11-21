import AuthGuard from '@/components/auth/AuthGuard';
import HomeContent from '@/components/HomeContent';

export default function Home() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}
