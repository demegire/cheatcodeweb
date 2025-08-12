import TickCrossBackground from '../../components/auth/TickCrossBackground';
import PlusInfo from '../../components/plus/PlusInfo';

export default function PlusPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 bg-gray-50 overflow-hidden">
      <TickCrossBackground />
      <PlusInfo />
    </div>
  );
}