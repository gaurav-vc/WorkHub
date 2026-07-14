import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, CheckCircle2, XCircle, Award, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { startAssessment as startAssessmentApi, submitAssessmentAnswer, finishAssessment as finishAssessmentApi } from "@/api/learning";
const GLOBAL_TIMER_START = 1800; // 30 mins in seconds
const QUESTION_TIMER_START = 60; // 60 seconds
const MAX_WARNINGS = 2;

interface FinalAssessmentProps {
  courseId: number;
  employeeName: string;
  onClose: () => void;
  onPassed: () => void;
}

export default function FinalAssessment({ courseId, employeeName, onClose, onPassed }: FinalAssessmentProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctOption, setCorrectOption] = useState<string | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<{score: number, passed: boolean, correct: number, total: number, attempts_left?: number} | null>(null);

  // Anti-cheat & Timer states
  const [globalTimeLeft, setGlobalTimeLeft] = useState(GLOBAL_TIMER_START);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIMER_START);
  const [warnings, setWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [shuffledOptions, setShuffledOptions] = useState<string[]>(['A', 'B', 'C', 'D']);

  const STORAGE_KEY = `final_assessment_${courseId}_${employeeName}`;

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen && !document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    }
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - data.lastUpdated) / 1000);
          
          let newGlobalTime = data.globalTimeLeft - elapsedSeconds;
          let newQuestionTime = data.questionTimeLeft - elapsedSeconds;

          if (newGlobalTime <= 0) {
            setSessionId(data.sessionId);
            finishAssessment(data.sessionId);
            return;
          }

          setSessionId(data.sessionId);
          setQuestions(data.questions);
          setCurrentIndex(data.currentIndex);
          setWarnings(data.warnings || 0);
          setGlobalTimeLeft(newGlobalTime);
          
          if (newQuestionTime <= 0) {
             setQuestionTimeLeft(0);
          } else {
             setQuestionTimeLeft(newQuestionTime);
          }
          
          if (data.selectedOption) {
            setSelectedOption(data.selectedOption);
            setIsCorrect(data.isCorrect);
            setCorrectOption(data.correctOption);
          }

          if (data.shuffledOptions) {
            setShuffledOptions(data.shuffledOptions);
          }
          
          setLoading(false);
          enterFullscreen();
          return;
        } catch (e) {
          console.error("Failed to parse stored session", e);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      startSession();
    };
    checkExistingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = async () => {
    try {
      const data = await startAssessmentApi(courseId.toString(), employeeName);
      setSessionId(data.session_id);
      setQuestions(data.questions);
      enterFullscreen();
    } catch (e: any) {
      toast.error(e.message || "Failed to start assessment");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleReattempt = () => {
    setIsFinished(false);
    setFinalScore(null);
    setCurrentIndex(0);
    setQuestions([]);
    setSelectedOption(null);
    setIsCorrect(null);
    setCorrectOption(null);
    setGlobalTimeLeft(GLOBAL_TIMER_START);
    setQuestionTimeLeft(QUESTION_TIMER_START);
    setWarnings(0);
    setShowWarningModal(false);
    setWarningMessage("");
    setLoading(true);
    localStorage.removeItem(STORAGE_KEY);
    startSession();
  };

  // Persist State
  useEffect(() => {
    if (sessionId && !isFinished && !loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionId,
        questions,
        currentIndex,
        globalTimeLeft,
        questionTimeLeft,
        warnings,
        selectedOption,
        isCorrect,
        correctOption,
        shuffledOptions,
        lastUpdated: Date.now()
      }));
    }
  }, [sessionId, questions, currentIndex, globalTimeLeft, questionTimeLeft, warnings, selectedOption, isCorrect, correctOption, shuffledOptions, isFinished, loading]);

  // Option Shuffling logic
  useEffect(() => {
    if (questions.length > 0 && questions[currentIndex] && !selectedOption) {
      const opts = ['A', 'B', 'C', 'D'];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      setShuffledOptions(opts);
      // We only reset the timer if it wasn't restored from a saved state that was mid-question
      if (questionTimeLeft <= 0 || questionTimeLeft === QUESTION_TIMER_START) {
         setQuestionTimeLeft(QUESTION_TIMER_START);
      }
    }
  }, [currentIndex, questions]); // purposely excluding selectedOption to prevent re-shuffle

  // Timers
  useEffect(() => {
    if (!sessionId || isFinished || showWarningModal || loading) return;

    const timerId = setInterval(() => {
      setGlobalTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          finishAssessment(sessionId);
          return 0;
        }
        return prev - 1;
      });

      setQuestionTimeLeft(prev => {
        if (prev <= 1) {
          if (!selectedOption && !submittingAnswer) {
             handleAutoSubmitTimeout();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [sessionId, isFinished, showWarningModal, selectedOption, submittingAnswer, loading]);

  const triggerWarning = (msg: string) => {
    if (isFinished || showWarningModal) return;
    const newWarnings = warnings + 1;
    setWarnings(newWarnings);
    if (newWarnings > MAX_WARNINGS) {
      setWarningMessage("You have exceeded the maximum number of warnings. The assessment will now automatically fail.");
      setShowWarningModal(true);
      setTimeout(() => {
        finishAssessment(sessionId!, true);
      }, 3000);
    } else {
      setWarningMessage(msg + ` (Warning ${newWarnings} of ${MAX_WARNINGS})`);
      setShowWarningModal(true);
    }
  };

  // Anti-Cheat Event Listeners
  useEffect(() => {
    if (!sessionId || isFinished || loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerWarning("Tab switching is strictly prohibited during the assessment.");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerWarning("You must remain in full-screen mode during the assessment.");
      }
    };

    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
        e.preventDefault();
        toast.warning("Copy/Paste is disabled during the assessment.");
      }
    };

    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("contextmenu", blockContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("contextmenu", blockContextMenu);
    };
  }, [sessionId, isFinished, warnings, loading, showWarningModal]);

  const handleAutoSubmitTimeout = async () => {
    // If time expires, submit a generic wrong answer if nothing is selected
    if (selectedOption || submittingAnswer || !sessionId) return;
    
    setSubmittingAnswer(true);
    
    try {
      const q = questions[currentIndex];
      const data = await submitAssessmentAnswer(sessionId.toString(), { question_id: q.id, selected_option: 'Z' });
      setIsCorrect(data.is_correct);
      setCorrectOption(data.correct_option || null);
      setSelectedOption('TIMEOUT'); 
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleOptionSelect = async (opt: string) => {
    if (selectedOption || submittingAnswer || !sessionId) return;
    
    setSelectedOption(opt);
    setSubmittingAnswer(true);
    
    try {
      const q = questions[currentIndex];
      const data = await submitAssessmentAnswer(sessionId.toString(), { question_id: q.id, selected_option: opt });
      setIsCorrect(data.is_correct);
      setCorrectOption(data.correct_option || null);
    } catch (e) {
      toast.error("Failed to submit answer. Please try again.");
      setSelectedOption(null);
      toast.error("Network error.");
      setSelectedOption(null);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setIsCorrect(null);
      setCorrectOption(null);
      setQuestionTimeLeft(QUESTION_TIMER_START);
    } else {
      finishAssessment(sessionId!);
    }
  };

  const finishAssessment = async (id: number, forceFail: boolean = false) => {
    setLoading(true);
    setIsFinished(true);
    try {
      const data = await finishAssessmentApi(id.toString());
      if (forceFail) {
          data.passed = false;
          data.score = 0;
      }
      setFinalScore({
        score: data.score,
        passed: data.passed,
        correct: data.correct_answers,
        total: data.total_questions,
        attempts_left: data.attempts_left
      });
      localStorage.removeItem(STORAGE_KEY);
      exitFullscreen();
      if (data.passed) {
        onPassed();
      }
    } catch (e) {
      toast.error("Failed to calculate final score or network error.");
      exitFullscreen();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading && !isFinished) {
    return createPortal(
      <div className="fixed inset-0 bg-white z-[99999] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-wide">Initializing Assessment Environment...</p>
      </div>,
      document.body
    );
  }

  if (isFinished && finalScore) {
    return createPortal(
      <div className="fixed inset-0 bg-white z-[99999] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        {finalScore.passed ? (
          <>
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <Award className="h-12 w-12 text-emerald-500" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Congratulations!</h1>
            <p className="text-xl text-slate-600 mb-8 max-w-lg">
              You passed the final assessment with a score of <strong>{finalScore.score.toFixed(1)}%</strong> ({finalScore.correct} / {finalScore.total}).
              Your certificate has been unlocked!
            </p>
            <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 text-lg rounded-xl shadow-lg">
              View Certificate & Return
            </Button>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Assessment Failed</h1>
            <p className="text-xl text-slate-600 mb-8 max-w-lg">
              You scored <strong>{finalScore.score.toFixed(1)}%</strong> ({finalScore.correct} / {finalScore.total}).
              Please review the course material and try again later.
            </p>
            {finalScore.attempts_left !== undefined && finalScore.attempts_left < 100 && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-8 max-w-sm w-full text-sm font-medium">
                <p>Attempts Left: {finalScore.attempts_left}</p>
                {finalScore.attempts_left === 1 && (
                  <p className="mt-2 text-amber-600 font-bold">Caution - this is your last attempt for this assessment.</p>
                )}
                {finalScore.attempts_left === 0 && (
                  <p className="mt-2 font-bold">You have no attempts left.</p>
                )}
              </div>
            )}
            
            <div className="flex gap-4">
              <Button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-8 py-6 text-lg rounded-xl">
                Return to Course
              </Button>
              {finalScore.attempts_left !== undefined && finalScore.attempts_left > 0 && (
                <Button onClick={handleReattempt} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-md">
                  Re-attempt Assessment
                </Button>
              )}
            </div>
          </>
        )}
      </div>,
      document.body
    );
  }

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-50 z-[99999] flex flex-col select-none overflow-y-auto">
      
      <Dialog open={showWarningModal} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md [&>button]:hidden" 
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="mr-2 h-6 w-6" /> Anti-Cheat Warning
            </DialogTitle>
            <DialogDescription className="text-base text-slate-700 pt-3 font-medium">
              {warningMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end mt-4">
            {warnings <= MAX_WARNINGS && (
              <Button 
                type="button" 
                onClick={() => {
                  setShowWarningModal(false);
                  enterFullscreen();
                }} 
                className="bg-indigo-600 text-white"
              >
                I Understand, Return to Assessment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white border-b border-slate-200 p-4 md:p-6 flex justify-between items-center shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-slate-800">Final Assessment</h2>
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center text-red-500 font-bold text-sm">
                <Clock className="w-4 h-4 mr-1"/> Global Time: {formatTime(globalTimeLeft)}
            </span>
          </div>
        </div>
        <div className="text-right flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question Time</span>
            <div className={`text-xl font-bold ${questionTimeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                {formatTime(questionTimeLeft)}
            </div>
          </div>
          <div className="h-10 w-px bg-slate-200"></div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Progress</span>
            <div className="text-xl font-bold text-indigo-600">{currentIndex + 1} / {questions.length}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <h3 className="text-2xl font-bold text-slate-800 mb-10 leading-snug">
              {currentQ.question_text || <span className="text-red-500 italic text-lg">Question text is missing in database</span>}
            </h3>

            {selectedOption === 'TIMEOUT' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Time expired for this question. Moving to the next one...
                </div>
            )}

            <div className="grid gap-4">
              {shuffledOptions.map((optStr, index) => {
                const optKey = `option_${optStr.toLowerCase()}`;
                const text = currentQ[optKey];
                const displayLabel = String.fromCharCode(65 + index); // A, B, C, D visually
                
                let btnClass = "w-full text-left justify-start p-6 h-auto whitespace-normal border-2 text-lg font-medium transition-all duration-200 rounded-xl ";
                
                if (selectedOption === optStr) {
                  if (isCorrect === true) {
                    btnClass += "border-emerald-500 bg-emerald-50 text-emerald-800";
                  } else if (isCorrect === false) {
                    btnClass += "border-red-500 bg-red-50 text-red-800";
                  } else {
                    btnClass += "border-indigo-500 bg-indigo-50 text-indigo-800 opacity-70";
                  }
                } else if (selectedOption && isCorrect === false && correctOption === optStr) {
                  btnClass += "border-emerald-500 bg-emerald-50 text-emerald-800";
                } else if (selectedOption) {
                  btnClass += "border-slate-200 bg-slate-50 text-slate-400 opacity-50";
                } else {
                  btnClass += "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700 hover:shadow-md";
                }

                return (
                  <Button 
                    key={optStr}
                    variant="outline"
                    className={btnClass}
                    onClick={() => handleOptionSelect(optStr)}
                    disabled={!!selectedOption || submittingAnswer}
                  >
                    <span className="mr-4 text-sm font-bold opacity-50 bg-white/50 px-3 py-1 rounded-md">{displayLabel}</span> 
                    {text || <span className="italic opacity-50">Option text is missing</span>}
                    {selectedOption === optStr && isCorrect === true && <CheckCircle2 className="ml-auto h-6 w-6 text-emerald-500" />}
                    {selectedOption === optStr && isCorrect === false && <XCircle className="ml-auto h-6 w-6 text-red-500" />}
                    {selectedOption !== optStr && isCorrect === false && correctOption === optStr && <CheckCircle2 className="ml-auto h-6 w-6 text-emerald-500" />}
                  </Button>
                );
              })}
            </div>
          </div>
          
          <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end">
            <Button 
              onClick={handleNext} 
              disabled={!selectedOption || submittingAnswer}
              className={`px-10 py-6 text-lg font-bold rounded-xl shadow-lg transition-all ${selectedOption ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400'}`}
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Assessment'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
