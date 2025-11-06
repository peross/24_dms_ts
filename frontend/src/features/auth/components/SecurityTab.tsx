import { ChangePasswordSection } from './ChangePasswordSection';
import { TwoFactorSection } from './TwoFactorSection';
import { ActiveSessionsSection } from './ActiveSessionsSection';

export function SecurityTab() {
  return (
    <div className="space-y-8">
      {/* Change Password Section */}
      <ChangePasswordSection />

      {/* Two-Factor Authentication Section */}
      <TwoFactorSection />

      {/* Active Sessions Section */}
      <ActiveSessionsSection />
    </div>
  );
}

