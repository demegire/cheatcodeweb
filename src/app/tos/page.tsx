import TickCrossBackground from '../../components/auth/TickCrossBackground';

export default function TermsOfService() {
  return (
    <div className="relative flex items-center justify-center min-h-screen p-8 bg-gray-50 overflow-hidden">
      <TickCrossBackground />
      <div className="relative z-10 w-full max-w-3xl bg-white p-8 rounded-lg shadow-md overflow-y-auto max-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-black">Terms and Conditions</h1>
        <div className="space-y-4 text-sm text-gray-700">
          <p>By accessing or using our service, you agree to these Terms and Conditions. If you do not agree, please do not use the service.</p>

          <h2 className="text-lg font-semibold">Use of Service</h2>
          <p>The service is provided to help you stay accountable and productive. You must provide accurate information and use the service only for lawful purposes.</p>

          <h2 className="text-lg font-semibold">User Responsibilities</h2>
          <p>You are responsible for the content and tasks you create. You agree not to misuse the service or attempt to disrupt its operation.</p>

          <h2 className="text-lg font-semibold">Content</h2>
          <p>Content you submit remains yours, but you grant us a license to use it for operating and improving the service. We may remove content that violates these Terms.</p>

          <h2 className="text-lg font-semibold">Disclaimer</h2>
          <p>The service is provided on an &quot;as is&quot; basis without warranties of any kind. We do not guarantee that using the service will achieve any specific results.</p>

          <h2 className="text-lg font-semibold">Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, cheat-code is not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>

          <h2 className="text-lg font-semibold">Termination</h2>
          <p>We may suspend or terminate your access to the service at any time if you violate these Terms.</p>

          <h2 className="text-lg font-semibold">Changes</h2>
          <p>We may update these Terms from time to time. Continued use of the service after changes are posted constitutes your acceptance of the updated Terms.</p>

          <h2 className="text-lg font-semibold">Contact</h2>
          <p>If you have questions about these Terms, contact us at hi@cheat-code.cc.</p>
        </div>
      </div>
    </div>
  );
}
