import TickCrossBackground from '../../components/auth/TickCrossBackground';

export default function PlusPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 bg-gray-50 overflow-hidden">
      <TickCrossBackground />
      <div className="relative z-10 bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">CheatCode Plus</h1>
        <p className="text-xl text-gray-700 mb-6">$9.99 / month</p>
        <ul className="text-left mb-6 list-disc list-inside space-y-2 text-gray-700">
          <li>Unlimited tasks and check-ins</li>
          <li>Priority support</li>
          <li>Early access to new features</li>
        </ul>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
          Subscribe Now
        </button>
      </div>
    </div>
  );
}
