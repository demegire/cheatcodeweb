import PlusInfo from '../plus/PlusInfo';

interface PlusModalProps {
  onClose: () => void;
}

export default function PlusModal({ onClose }: PlusModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}>
        <PlusInfo />
      </div>
    </div>
  );
}
