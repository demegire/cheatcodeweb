import { PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function PlusInfo() {
  return (
    <div className="relative z-10 bg-white p-10 rounded-xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
      <div className="flex w-full items-center justify-center gap-3 mb-6">
        <h1 className="text-3xl text-gray-900 font-extrabold tracking-tight">cheat-code Plus</h1>
        <div className="bg-green-50 p-2 rounded-full">
          <PlusIcon className="h-8 w-8 text-green-600 stroke-2" />
        </div>
      </div>
      <div className="mb-8">
        <p className="text-2xl text-gray-900 font-semibold mb-1">only for $9.99 / month</p>
        <p className="text-sm text-gray-500">Cancel anytime • 30-day money-back guarantee</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <ul className="text-left space-y-4 text-gray-700">
          <li className="flex items-start gap-3">
            <div className="bg-green-100 p-1 rounded-full mt-0.5">
              <CheckIcon className="h-4 w-4 text-green-600 stroke-2" />
            </div>
            <span className="font-medium">Unlimited tasks and groups</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="bg-green-100 p-1 rounded-full mt-0.5">
              <CheckIcon className="h-4 w-4 text-green-600 stroke-2" />
            </div>
            <span className="font-medium">Priority support</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="bg-green-100 p-1 rounded-full mt-0.5">
              <CheckIcon className="h-4 w-4 text-green-600 stroke-2" />
            </div>
            <span className="font-medium">Early access to new features</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="bg-green-100 p-1 rounded-full mt-0.5">
              <CheckIcon className="h-4 w-4 text-green-600 stroke-2" />
            </div>
            <span className="font-medium">Support the developers!</span>
          </li>
        </ul>
      </div>
      <button className="w-full bg-theme hover:bg-theme-hover text-white font-semibold px-8 py-3 rounded-full transition-colors shadow-sm hover:shadow-md">
        Subscribe Now
      </button>
      <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-2">
        Secure payment • SSL encrypted •
        <img
          src="/pay_with_iyzico_horizontal_colored.svg"
          alt="Pay with iyzico"
          className="h-4"
        />
      </p>
    </div>
  );
}
