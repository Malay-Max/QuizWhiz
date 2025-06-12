
"use client";

import type { QuizSession } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, CheckCircle, XCircle, SkipForward, Clock, Folder } from 'lucide-react'; // Added Folder
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

interface SummaryStatsProps {
  session: QuizSession | null;
}

const COLORS = {
  correct: 'hsl(var(--accent))', 
  incorrect: 'hsl(var(--destructive))', 
  skipped: 'hsl(var(--muted))', 
};

export function SummaryStats({ session }: SummaryStatsProps) {
  const router = useRouter();

  if (!session || session.status !== 'completed') {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-xl text-center">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Quiz Summary Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            No completed quiz session found. Please complete a quiz to see your summary.
          </p>
          <Button onClick={() => router.push('/')} size="lg" className="shadow-md">
            Take a Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalQuestions = session.questions.length;
  const answeredCount = session.answers.filter(a => !a.skipped).length;
  const skippedCount = totalQuestions - answeredCount; //This calculation is now more accurate: total - (correct + incorrect)
  const correctCount = session.answers.filter(a => a.isCorrect).length;
  const incorrectCount = session.answers.filter(a => !a.skipped && !a.isCorrect).length;
  
  const totalTimeSeconds = session.endTime && session.startTime 
    ? Math.round((session.endTime - session.startTime) / 1000) 
    : 0;
  const minutes = Math.floor(totalTimeSeconds / 60);
  const seconds = totalTimeSeconds % 60;

  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const chartData = [
    { name: 'Correct', value: correctCount, fill: COLORS.correct },
    { name: 'Incorrect', value: incorrectCount, fill: COLORS.incorrect },
    { name: 'Skipped', value: skippedCount, fill: COLORS.skipped },
  ].filter(item => item.value > 0);


  const StatItem = ({ icon: Icon, label, value, iconColor }: { icon: React.ElementType, label: string, value: string | number, iconColor?: string }) => (
    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
      <div className="flex items-center">
        <Icon className={`h-6 w-6 mr-3 ${iconColor || 'text-primary'}`} />
        <span className="text-md font-medium">{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-4xl mb-1">Quiz Completed!</CardTitle>
        <CardDescription className="text-lg">Here's how you performed on the <span className="font-semibold text-primary inline-flex items-center"><Folder className="h-5 w-5 mr-1.5"/>{session.category}</span> quiz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center my-4">
            <p className="text-5xl font-bold text-primary">{scorePercentage}%</p>
            <p className="text-muted-foreground">Your Score</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <StatItem icon={BarChart} label="Total Questions" value={totalQuestions} />
            <StatItem icon={CheckCircle} label="Correct Answers" value={correctCount} iconColor="text-accent" />
            <StatItem icon={XCircle} label="Incorrect Answers" value={incorrectCount} iconColor="text-destructive" />
            <StatItem icon={SkipForward} label="Skipped Questions" value={skippedCount} iconColor="text-muted-foreground" />
            <StatItem icon={Clock} label="Total Time" value={`${minutes}m ${seconds}s`} />
          </div>
          
          {chartData.length > 0 && (
            <div className="h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)' 
                    }}
                  />
                  <Legend iconSize={12} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
        <Button onClick={() => router.push('/')} size="lg" variant="outline" className="w-full sm:w-auto shadow-sm hover:bg-primary/10 transition-all">
          Take Another Quiz
        </Button>
        <Button onClick={() => router.push('/add-question')} size="lg" className="w-full sm:w-auto shadow-md hover:scale-105 transition-transform">
          Add More Questions
        </Button>
      </CardFooter>
    </Card>
  );
}
