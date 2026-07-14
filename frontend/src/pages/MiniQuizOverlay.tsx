import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

import { API_BASE } from "@/config";

interface MiniQuizOverlayProps {
  coursePointId: number;
  progressId: number; // to patch attempts/completion
  attemptsUsed: number;
  onPassed: () => void;
  onFailedMaxAttempts: () => void;
}

export default function MiniQuizOverlay({ coursePointId, progressId, attemptsUsed, onPassed, onFailedMaxAttempts }: MiniQuizOverlayProps) {
  const { token } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQs = async () => {
      try {
        const res = await fetch(`${API_BASE}/learning_center/course_point_questions/?course_point=${coursePointId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setQuestions(data);
          // if no questions exist, just instantly pass them
          if (data.length === 0) {
            onPassed();
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchQs();
  }, [coursePointId, token, onPassed]);

  const handleOptionClick = (opt: string) => {
    if (showResult || quizFinished) return;
    setSelectedOption(opt);
    setShowResult(true);

    const isCorrect = opt === questions[currentIndex].correct_option;
    if (isCorrect) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizFinished(true);
    setIsSubmitting(true);
    
    // We assume they must get 100% or 80%? Let's say they must get at least 4/5 (80%)
    const passed = (score / questions.length) >= 0.8;

    try {
      if (passed) {
        // Just call onPassed, the parent will handle marking is_completed=true
        onPassed();
      } else {
        const newAttempts = attemptsUsed + 1;
        if (newAttempts >= 3) {
          toast.error("You have failed the quiz 3 times. You must rewatch the video.", { duration: 5000 });
          onFailedMaxAttempts();
        } else {
          // Update attempts in DB
          await fetch(`${API_BASE}/learning_center/video_progress/${progressId}/`, {
            method: 'PATCH',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quiz_attempts: newAttempts })
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowResult(false);
    setQuizFinished(false);
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) return null; // Fallback

  const currentQ = questions[currentIndex];

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="bg-indigo-600 p-6 text-center relative">
          <h2 className="text-2xl font-bold text-white">Knowledge Check</h2>
          <p className="text-indigo-100 text-sm mt-1">Answer these questions to unlock the next topic.</p>
          <div className="absolute top-4 right-4 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold">
            Attempt {attemptsUsed + 1}/3
          </div>
        </div>

        {!quizFinished ? (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-500 font-semibold text-sm">Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-indigo-600 font-bold text-sm">Score: {score}</span>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-6 leading-relaxed">
              {currentQ.question_text}
            </h3>

            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((optStr) => {
                const optKey = `option_${optStr.toLowerCase()}`;
                const text = currentQ[optKey];
                
                let btnClass = "w-full text-left justify-start p-4 h-auto whitespace-normal border-2 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-base transition-all";
                
                if (showResult) {
                  if (optStr === currentQ.correct_option) {
                    btnClass = "w-full text-left justify-start p-4 h-auto whitespace-normal border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-bold relative";
                  } else if (optStr === selectedOption) {
                    btnClass = "w-full text-left justify-start p-4 h-auto whitespace-normal border-2 border-red-500 bg-red-50 text-red-800 font-bold relative";
                  } else {
                    btnClass = "w-full text-left justify-start p-4 h-auto whitespace-normal border-2 border-slate-200 bg-slate-50 text-slate-400 opacity-50";
                  }
                }

                return (
                  <Button 
                    key={optStr}
                    variant="outline"
                    className={btnClass}
                    onClick={() => handleOptionClick(optStr)}
                    disabled={showResult}
                  >
                    <span className="mr-3 text-sm font-bold opacity-50">{optStr}.</span> {text}
                    {showResult && optStr === currentQ.correct_option && <CheckCircle2 className="absolute right-4 h-5 w-5 text-emerald-500" />}
                    {showResult && optStr === selectedOption && optStr !== currentQ.correct_option && <XCircle className="absolute right-4 h-5 w-5 text-red-500" />}
                  </Button>
                );
              })}
            </div>

            {showResult && (
              <div className="mt-8 flex justify-end animate-in fade-in slide-in-from-bottom-2">
                <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8">
                  {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            {isSubmitting ? (
               <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
            ) : (
              <>
                {(score / questions.length) >= 0.8 ? (
                  <>
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800 mb-2">Quiz Passed!</h3>
                    <p className="text-slate-500 mb-8 text-lg">Great job! You scored {score} out of {questions.length}. The next topic is unlocked.</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                      <XCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800 mb-2">Quiz Failed</h3>
                    <p className="text-slate-500 mb-8 text-lg">You scored {score} out of {questions.length}. You need at least 80% to pass.</p>
                    
                    {attemptsUsed + 1 < 3 ? (
                      <Button onClick={handleRetry} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg">
                        <RefreshCw className="mr-2 h-5 w-5" /> Retry Quiz ({2 - attemptsUsed} attempts left)
                      </Button>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start text-left max-w-sm">
                        <AlertTriangle className="h-5 w-5 shrink-0 mr-3 mt-0.5" />
                        <span className="text-sm font-medium">You have exhausted all 3 attempts. You must re-watch the video to try again.</span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
