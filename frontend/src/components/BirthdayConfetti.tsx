import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { API_BASE } from "@/config";

interface Employee {
  id: string;
  name: string;
  initials: string;
  photo?: string | null;
}

export default function BirthdayConfetti() {
  const [birthdays, setBirthdays] = useState<Employee[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkBirthdays = async () => {
      try {
        const res = await fetch(`${API_BASE}/directory/employees/birthdays_today/`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setBirthdays(data);
            setIsOpen(true);
            triggerConfetti();
          }
        }
      } catch (e) {
        console.error("Failed to check birthdays", e);
      }
    };
    
    // Only check once per session to avoid annoying the user on every refresh
    if (!sessionStorage.getItem("birthday_checked")) {
      checkBirthdays();
      sessionStorage.setItem("birthday_checked", "true");
    }
  }, []);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  if (birthdays.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold text-center text-primary flex items-center justify-center gap-2">
            🎉 Happy Birthday! 🎂
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6 flex flex-col items-center justify-center gap-6">
          <p className="text-muted-foreground text-sm">
            Join us in wishing a very happy birthday to:
          </p>
          
          <div className="flex flex-wrap justify-center gap-6">
            {birthdays.map(emp => (
              <div key={emp.id} className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                  {emp.photo ? (
                    <AvatarImage src={emp.photo} alt={emp.name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="text-3xl font-display font-bold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      {emp.initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="font-semibold text-lg">{emp.name}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
