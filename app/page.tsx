import Dashboard from '@/components/Dashboard';
import AuthScreen from '@/components/AuthScreen';
import { AuthGate } from '@/lib/auth-client';

export default function Home() {
  return <AuthGate authScreen={<AuthScreen />}><Dashboard /></AuthGate>;
}
