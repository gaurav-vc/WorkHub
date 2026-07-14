import React, { useEffect, useState } from "react";
// import confetti from "canvas-confetti"; // Commented out to fix missing dependency
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, TrendingUp, Medal, Flame } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

import { API_BASE } from "@/config";

export function CompanyPulse() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetch(`${API_BASE}/hr/leaderboard/`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data);
        setLoading(false);
        // Trigger a subtle confetti celebration on load
        triggerConfetti();
      })
      .catch((err) => {
        console.error("Failed to load leaderboard", err);
        setLoading(false);
      });
  }, []);

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      // confetti({
      //   particleCount: 3,
      //   angle: 60,
      //   spread: 55,
      //   origin: { x: 0 },
      //   colors: ['#2563eb', '#3b82f6', '#60a5fa']
      // });
      // confetti({
      //   particleCount: 3,
      //   angle: 120,
      //   spread: 55,
      //   origin: { x: 1 },
      //   colors: ['#eab308', '#facc15', '#fef08a']
      // });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Syncing pulse...</div>;

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center justify-center text-center space-y-2 mt-4">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-full mb-2">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Company Pulse</h1>
        <p className="text-muted-foreground max-w-lg">
          Recognizing the top performers driving our projects forward. Complete tasks to earn points, level up, and climb the ranks.
        </p>
      </div>

      {/* TOP 3 PODIUM */}
      {topThree.length > 0 && (
        <div className="flex flex-col md:flex-row items-end justify-center gap-4 mt-12 mb-12 h-auto md:h-64">
          {/* 2ND PLACE */}
          {topThree[1] && (
            <div className="w-full md:w-1/4 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100">
              <Avatar className="w-16 h-16 border-4 border-slate-200 shadow-lg mb-4">
                <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xl">{topThree[1].initials}</AvatarFallback>
              </Avatar>
              <div className="bg-gradient-to-t from-slate-200 to-slate-100 w-full rounded-t-xl p-4 text-center h-32 flex flex-col justify-start border border-slate-200 border-b-0 shadow-inner">
                <Medal className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="font-bold text-slate-800 line-clamp-1">{topThree[1].name}</p>
                <Badge variant="secondary" className="mx-auto mt-1 bg-slate-200 text-slate-700">Lvl {topThree[1].level}</Badge>
                <p className="text-sm font-semibold text-slate-500 mt-2">{topThree[1].points} pts</p>
              </div>
            </div>
          )}

          {/* 1ST PLACE */}
          {topThree[0] && (
            <div className="w-full md:w-1/3 flex flex-col items-center animate-in slide-in-from-bottom-12 duration-700 relative z-10">
              <Flame className="w-8 h-8 text-yellow-500 absolute -top-12 animate-bounce" />
              <Avatar className="w-24 h-24 border-4 border-yellow-400 shadow-xl mb-4 relative">
                <div className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full p-1 border-2 border-white">
                  <Star className="w-4 h-4 text-white fill-white" />
                </div>
                <AvatarFallback className="bg-yellow-50 text-yellow-700 font-bold text-3xl">{topThree[0].initials}</AvatarFallback>
              </Avatar>
              <div className="bg-gradient-to-t from-yellow-100 to-yellow-50 w-full rounded-t-xl p-6 text-center h-40 flex flex-col justify-start border border-yellow-200 border-b-0 shadow-lg">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-1" />
                <p className="font-black text-yellow-900 text-lg line-clamp-1">{topThree[0].name}</p>
                <Badge className="mx-auto mt-1 bg-yellow-400 text-yellow-900 hover:bg-yellow-500">Level {topThree[0].level}</Badge>
                <p className="text-lg font-black text-yellow-600 mt-2">{topThree[0].points} pts</p>
              </div>
            </div>
          )}

          {/* 3RD PLACE */}
          {topThree[2] && (
            <div className="w-full md:w-1/4 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-700 delay-200">
              <Avatar className="w-16 h-16 border-4 border-orange-200 shadow-lg mb-4">
                <AvatarFallback className="bg-orange-50 text-orange-700 font-bold text-xl">{topThree[2].initials}</AvatarFallback>
              </Avatar>
              <div className="bg-gradient-to-t from-orange-100 to-orange-50 w-full rounded-t-xl p-4 text-center h-28 flex flex-col justify-start border border-orange-200 border-b-0 shadow-inner">
                <Medal className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                <p className="font-bold text-orange-900 line-clamp-1">{topThree[2].name}</p>
                <Badge variant="secondary" className="mx-auto mt-1 bg-orange-200 text-orange-800">Lvl {topThree[2].level}</Badge>
                <p className="text-sm font-semibold text-orange-600 mt-2">{topThree[2].points} pts</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* THE REST OF THE LEADERBOARD */}
      <Card className="max-w-4xl mx-auto border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Current Standings
          </CardTitle>
          <CardDescription>Keep completing tasks to climb the ranks!</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {rest.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-6 text-center font-bold text-slate-400 text-sm">#{index + 4}</div>
                  <Avatar className="w-10 h-10 border border-slate-200">
                    <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">{user.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{user.points} <span className="text-xs text-muted-foreground font-normal">pts</span></p>
                  </div>
                  <Badge variant="outline" className="bg-slate-50">Level {user.level}</Badge>
                </div>
              </div>
            ))}
            {rest.length === 0 && topThree.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No data available yet. Start completing tasks!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
