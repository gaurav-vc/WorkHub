import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

import { API_BASE } from "@/config";

interface VideoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoSettingsModal({ isOpen, onClose }: VideoSettingsModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: 1,
    auto_pause: true,
    idle_timeout_seconds: 120,
    disable_fast_forward: true,
    watch_percentage_required: 80,
    assessment_question_count: 50,
    assessment_passing_score: 80
  });

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen, token]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/learning_center/video_settings/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Since it's a list view that returns the first object we created
        if (Array.isArray(data) && data.length > 0) {
          setSettings(data[0]);
        } else if (data.id) {
          setSettings(data);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load video settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Create if doesn't exist, else PATCH
      const method = 'PATCH';
      const url = `${API_BASE}/learning_center/video_settings/${settings.id}/`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        toast.success("Video controls updated successfully!");
        onClose();
      } else {
        toast.error("Failed to update video controls");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            Global Video Controls
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Auto Pause */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-slate-800">Auto-Pause on Idle</Label>
                <p className="text-sm text-slate-500">Automatically pause video if employee is inactive or switches tabs.</p>
              </div>
              <Switch 
                checked={settings.auto_pause}
                onCheckedChange={(c) => setSettings({...settings, auto_pause: c})}
              />
            </div>

            {settings.auto_pause && (
              <div className="space-y-2 pl-4 border-l-2 border-indigo-200">
                <Label className="text-sm font-semibold text-slate-700">Idle Timeout (seconds)</Label>
                <Input 
                  type="number" 
                  value={settings.idle_timeout_seconds}
                  onChange={(e) => setSettings({...settings, idle_timeout_seconds: parseInt(e.target.value) || 0})}
                  className="w-32 bg-slate-50"
                />
                <p className="text-xs text-slate-400">Time before auto-pausing (e.g. 120 = 2 mins).</p>
              </div>
            )}

            {/* Disable Fast Forward */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-slate-800">Disable Fast-Forward</Label>
                <p className="text-sm text-slate-500">Prevent users from seeking ahead of their max watched time.</p>
              </div>
              <Switch 
                checked={settings.disable_fast_forward}
                onCheckedChange={(c) => setSettings({...settings, disable_fast_forward: c})}
              />
            </div>

            {/* Watch Percentage */}
            <div className="space-y-2 pt-2">
              <Label className="text-base font-semibold text-slate-800">Required Watch Percentage</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  min="1" max="100"
                  value={settings.watch_percentage_required}
                  onChange={(e) => setSettings({...settings, watch_percentage_required: parseInt(e.target.value) || 0})}
                  className="w-24 bg-slate-50"
                />
                <span className="text-slate-500 font-medium">%</span>
              </div>
              <p className="text-sm text-slate-500">Percentage of video required to mark it as 'Completed'.</p>
            </div>

            {/* Assessment Config */}
            <div className="pt-4 border-t border-slate-100">
              <Label className="text-base font-semibold text-slate-800 mb-4 block">Final Assessment Config</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Random Question Count</Label>
                  <Input 
                    type="number" 
                    min="1"
                    value={settings.assessment_question_count}
                    onChange={(e) => setSettings({...settings, assessment_question_count: parseInt(e.target.value) || 0})}
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-slate-400">Questions per exam.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Passing Score (%)</Label>
                  <Input 
                    type="number" 
                    min="1" max="100"
                    value={settings.assessment_passing_score}
                    onChange={(e) => setSettings({...settings, assessment_passing_score: parseInt(e.target.value) || 0})}
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-slate-400">Score to pass exam.</p>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Controls
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
