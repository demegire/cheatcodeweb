import dynamic from 'next/dynamic';

// Lazy wrapper around StatsView so chart.js + react-chartjs-2 (~70 KB gz)
// don't ship in the initial dashboard bundle. Imported in both the
// dashboard page and MainLayout so the React-element type identity
// check in MainLayout (`child.type === StatsView`) keeps working.
const StatsView = dynamic(() => import('./StatsView'), {
  ssr: false,
});

export default StatsView;
