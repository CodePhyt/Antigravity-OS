/**
 * Ralph's Brain View Page
 * 
 * Dedicated page for the autonomous agent monitoring dashboard.
 * Displays real-time thinking process and task execution.
 */

import { RalphsBrainView } from '@/components/dashboard/RalphsBrainView';

export const metadata = {
  title: "Ralph's Brain View | Antigravity OS",
  description: 'Real-time autonomous agent monitoring and visualization',
};

export default function BrainPage() {
  return <RalphsBrainView />;
}
