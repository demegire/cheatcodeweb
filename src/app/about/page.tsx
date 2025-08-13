import TickCrossBackground from '../../components/auth/TickCrossBackground';

export default function AboutPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 bg-gray-50 overflow-hidden">
      <TickCrossBackground />
      <div className="relative z-10 bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4 text-black font-extrabold">About</h1>
        <div className="bg-gray-50 rounded-lg p-6 ">
          <p className="text-black text-justify">
            Hi - we are{" "}
            <a
              href="https://www.linkedin.com/in/alp-burak-soysal/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Alp
            </a>{" "}
            and{" "}
            <a
              href="https://www.linkedin.com/in/ege-demir-312081195/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Ege
            </a>
            , developers of cheat-code. Our friend group has been using cheat-code for 8 years (as a Google Sheet) so we wanted to make it accessible for everyone. It is a great tool for keeping up with your friends and sharing accountability with them, so you can actually get things done. Have fun using cheat-code!
          </p>
        </div>
      </div>
    </div>
  );
}
