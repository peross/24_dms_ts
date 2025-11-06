import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { User, Shield } from 'lucide-react';
import { ProfileTab } from './ProfileTab';
import { SecurityTab } from './SecurityTab';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { t } = useTranslation();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('auth.profile.title')}
          </DialogTitle>
          <DialogDescription>
            {t('auth.profile.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 flex overflow-hidden">
          <TabsList className="flex flex-col h-auto w-48 border-r rounded-none p-2 bg-muted/50 justify-start">
            <TabsTrigger 
              value="profile" 
              className="w-full justify-start data-[state=active]:bg-background"
            >
              <User className="w-4 h-4 mr-2" />
              {t('auth.profile.profileTab')}
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="w-full justify-start data-[state=active]:bg-background"
            >
              <Shield className="w-4 h-4 mr-2" />
              {t('auth.profile.securityTab')}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="profile" className="m-0 p-6 space-y-6">
              <ProfileTab />
            </TabsContent>

            <TabsContent value="security" className="m-0 p-6 space-y-6">
              <SecurityTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
