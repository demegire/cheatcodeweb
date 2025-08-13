import TickCrossBackground from '../../components/auth/TickCrossBackground';

export default function AboutPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 bg-gray-50 overflow-hidden">
      <TickCrossBackground />
      <div className="relative z-10 bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4 text-black">About</h1>
        <p className="text-gray-600">Write something about cheat-code.cc here.</p>
      </div>
    </div>
  );
}
