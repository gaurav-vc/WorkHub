import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import MiniQuizOverlay from "./MiniQuizOverlay";

import { API_BASE } from "@/config";

interface CourseVideoPlayerProps {
  videoUrl: string;
  coursePointId: number;
  employeeName: string;
  onClose?: () => void;
}

export default function CourseVideoPlayer({ videoUrl, coursePointId, employeeName, onClose }: CourseVideoPlayerProps) {
  const { token } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Settings & Progress state
  const [settings, setSettings] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Runtime state
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [maxWatched, setMaxWatched] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [showMiniQuiz, setShowMiniQuiz] = useState(false);

  // Fetch Settings & Progress
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        // Fetch global settings and progress in parallel
        const [setRes, progRes] = await Promise.all([
          fetch(`${API_BASE}/learning_center/video_settings/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/learning_center/video_progress/?employee_name=${encodeURIComponent(employeeName)}&course_point=${coursePointId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (setRes.ok) {
          const setData = await setRes.json();
          setSettings(Array.isArray(setData) ? setData[0] : setData);
        }
        
        let progData = null;
        if (progRes.ok) {
          const resJson = await progRes.json();
          if (resJson.length > 0) {
            progData = resJson[0];
          } else {
            // Need to create it initially via POST
            const createRes = await fetch(`${API_BASE}/learning_center/video_progress/`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                employee_name: employeeName,
                course_point: coursePointId
              })
            });
            if (createRes.ok) progData = await createRes.json();
          }
        }
        
        if (progData) {
          setProgress(progData);
          setMaxWatched(progData.max_progress_seconds || 0);
          setIsCompleted(progData.is_completed || false);
          
          // Resume position
          if (videoRef.current && progData.last_position_seconds > 0 && !progData.is_completed) {
            videoRef.current.currentTime = progData.last_position_seconds;
          }
        }
      } catch (e) {
        console.error("Error initializing video data", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitData();
  }, [token, coursePointId, employeeName]);

  // Sync progress to backend
  const syncProgress = useCallback(async (current: number, maxProg: number, completed: boolean) => {
    if (!progress?.id) return;
    try {
      await fetch(`${API_BASE}/learning_center/video_progress/${progress.id}/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          last_position_seconds: current,
          max_progress_seconds: maxProg,
          is_completed: completed
        })
      });
    } catch (e) {
      console.error("Error syncing progress", e);
    }
  }, [progress, token]);

  // Auto-Save Interval (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        syncProgress(videoRef.current.currentTime, maxWatched, isCompleted);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [syncProgress, maxWatched, isCompleted]);

  // Handle Tab Inactivity & Idle Pausing
  useEffect(() => {
    if (!settings?.auto_pause) return;

    // 1. Tab Visibility
    const handleVisibility = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        toast("Video paused due to tab inactivity", { icon: <AlertTriangle className="text-amber-500 h-4 w-4" /> });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 2. Idle Timer
    const handleActivity = () => {
      setLastActivity(Date.now());
      if (showIdleWarning) setShowIdleWarning(false);
    };
    
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);

    const idleInterval = setInterval(() => {
      const idleTime = (Date.now() - lastActivity) / 1000;
      if (idleTime > settings.idle_timeout_seconds) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setShowIdleWarning(true);
        }
      }
    }, 5000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      clearInterval(idleInterval);
    };
  }, [settings, lastActivity, showIdleWarning]);

  // Handle Video TimeUpdate (for Fast Forward block and Completion logic)
  const handleTimeUpdate = () => {
    if (!videoRef.current || !settings) return;
    
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    // Fast-Forward Block
    if (settings.disable_fast_forward && !isCompleted) {
      // Allow a 2 second buffer for seeking lag
      if (currentTime > maxWatched + 2) {
        videoRef.current.currentTime = maxWatched;
        toast.error("Fast-forwarding is disabled for this course.");
      }
    }

    // Update Max Watched
    if (currentTime > maxWatched && currentTime <= maxWatched + 2) {
      setMaxWatched(currentTime);
    }

    // Check 80% completion
    if (duration > 0 && !isCompleted && !showMiniQuiz) {
      const requiredSeconds = (settings.watch_percentage_required / 100) * duration;
      if (maxWatched >= requiredSeconds) {
        if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
        setShowMiniQuiz(true);
      }
    }
  };

  const handleQuizPassed = () => {
    setShowMiniQuiz(false);
    setIsCompleted(true);
    toast.success("Course point completed!", { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> });
    syncProgress(videoRef.current?.currentTime || 0, maxWatched, true);
  };

  const handleQuizFailedMax = async () => {
    setShowMiniQuiz(false);
    setMaxWatched(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    syncProgress(0, 0, false);
    
    // Reset attempts to 0 for next time
    if (progress?.id) {
      await fetch(`${API_BASE}/learning_center/video_progress/${progress.id}/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quiz_attempts: 0 })
      });
      setProgress({ ...progress, quiz_attempts: 0 });
    }
  };

  const handleSeeked = () => {
    // If they seeked too far, the timeUpdate will catch them, but we handle Seeked to enforce it immediately
    if (!videoRef.current || !settings) return;
    if (settings.disable_fast_forward && !isCompleted) {
      if (videoRef.current.currentTime > maxWatched + 2) {
        videoRef.current.currentTime = maxWatched;
      }
    }
  };

  // Convert youtube links or play mp4 directly
  const isYoutube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url; 
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black/90">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-white text-sm font-medium tracking-wide">Loading learning environment...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      {/* Top Bar indicating status */}
      <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-start pointer-events-none">
        <div>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold tracking-wide backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5" /> COMPLETED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs font-bold tracking-wide backdrop-blur-md">
              IN PROGRESS
            </span>
          )}
          
          {settings?.disable_fast_forward && !isCompleted && (
            <div className="mt-2 text-xs text-white/50 font-medium">Fast-forward disabled.</div>
          )}
        </div>
      </div>

      {showIdleWarning && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl flex flex-col items-center shadow-2xl animate-in zoom-in-95">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Are you still there?</h3>
            <p className="text-slate-400 text-center mb-6">Video auto-paused due to inactivity.</p>
            <button 
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors"
              onClick={() => {
                setShowIdleWarning(false);
                setLastActivity(Date.now());
                if (videoRef.current) videoRef.current.play();
              }}
            >
              Resume Video
            </button>
          </div>
        </div>
      )}

      {showMiniQuiz && progress && (
        <MiniQuizOverlay 
          coursePointId={coursePointId}
          progressId={progress.id}
          attemptsUsed={progress.quiz_attempts || 0}
          onPassed={handleQuizPassed}
          onFailedMaxAttempts={handleQuizFailedMax}
        />
      )}
      {/* Video Player Area */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative">
        {isYoutube ? (
          <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
            <p className="text-white font-medium mb-2">External YouTube videos cannot be strictly tracked.</p>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">Learning controls (like tracking watch time, disabling fast-forward, and auto-pause) only work with locally uploaded MP4 videos due to cross-origin limitations.</p>
            <iframe 
              src={getEmbedUrl(videoUrl)} 
              className="w-full max-w-4xl aspect-video rounded-xl shadow-2xl border border-slate-800"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            controlsList={settings?.disable_fast_forward && !isCompleted ? "nodownload" : "nodownload"}
            className="w-full max-h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleSeeked}
            onPlay={() => setShowIdleWarning(false)}
          />
        )}
      </div>
    </div>
  );
}
