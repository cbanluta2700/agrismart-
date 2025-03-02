'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CardContent } from '@/components/ui/card';
import { Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupSettings {
  allowJoinRequests: boolean;
  requireApproval: boolean;
  allowMemberPosts: boolean;
  isPrivate: boolean;
  rules: string[];
}

interface SettingsTabProps {
  groupId: string;
  initialSettings: GroupSettings;
}

export default function SettingsTab({ groupId, initialSettings }: SettingsTabProps) {
  const [settings, setSettings] = useState<GroupSettings>(initialSettings);
  const [newRule, setNewRule] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/forum/groups/${groupId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      toast.success('Group settings updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const addRule = () => {
    if (newRule.trim()) {
      setSettings(prev => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()]
      }));
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    setSettings(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  return (
    <CardContent className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Allow Join Requests</Label>
            <p className="text-sm text-muted-foreground">
              Allow users to request to join this group
            </p>
          </div>
          <Switch
            checked={settings.allowJoinRequests}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, allowJoinRequests: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Require Approval</Label>
            <p className="text-sm text-muted-foreground">
              Require admin approval for new members
            </p>
          </div>
          <Switch
            checked={settings.requireApproval}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, requireApproval: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Allow Member Posts</Label>
            <p className="text-sm text-muted-foreground">
              Allow regular members to create new posts
            </p>
          </div>
          <Switch
            checked={settings.allowMemberPosts}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, allowMemberPosts: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Private Group</Label>
            <p className="text-sm text-muted-foreground">
              Make group visible only to members
            </p>
          </div>
          <Switch
            checked={settings.isPrivate}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, isPrivate: checked }))
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Group Rules</Label>
        <div className="space-y-2">
          {settings.rules.map((rule, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input value={rule} readOnly />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeRule(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Add new rule"
            />
            <Button onClick={addRule}>Add Rule</Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </CardContent>
  );
}
