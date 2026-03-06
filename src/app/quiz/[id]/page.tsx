"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, BrainCircuit, Sparkles, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { storage } from "@/lib/storage";
import { Quiz, UserAnswer, QuizResult } from "@/lib/types";
import { explainAnswer } from "@/ai/flows/provide-ai-answer-explanations";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | boolean>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const q = storage.getQuizById(id);
    if (!q) {
      toast({ variant: "destructive", title: "Error", description: "Quiz not found." });
      router.push("/dashboard");
      return;
    }
    setQuiz(q);
  }, [id, router, toast]);

  if (!quiz) return null;

  // Handle case where no questions were extracted
  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
          <Card className="p-12 space-y-6 shadow-xl border-2 border-dashed">
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-headline font-bold">Không tìm thấy câu hỏi</CardTitle>
              <CardDescription className="text-lg">
                Hệ thống không thể trích xuất được câu hỏi nào từ tài liệu "{quiz.documentSource}". 
                Vui lòng thử tài liệu khác có chứa các bài tập hoặc câu hỏi rõ ràng.
              </CardDescription>
            </div>
            <Button size="lg" onClick={() => router.push('/dashboard')} className="w-full h-14">
              <Home className="mr-2 h-5 w-5" />
              Quay lại Dashboard
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIdx];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentIdx + 1) / totalQuestions) * 100;

  // Additional safety guard
  if (!currentQuestion) return null;

  const handleOptionSelect = (val: string | boolean) => {
    if (submittedAnswers[currentIdx]) return;
    setUserAnswers(prev => ({ ...prev, [currentIdx]: val }));
  };

  const handleCheckAnswer = async () => {
    if (userAnswers[currentIdx] === undefined) {
      toast({ title: "Vui lòng chọn đáp án", description: "Bạn cần chọn một câu trả lời trước khi kiểm tra." });
      return;
    }

    setSubmittedAnswers(prev => ({ ...prev, [currentIdx]: true }));
    
    setLoadingExplanation(currentIdx);
    try {
      const isCorrect = userAnswers[currentIdx] === currentQuestion.correctAnswer;
      const explanationResult = await explainAnswer({
        question: currentQuestion.question,
        userAnswer: String(userAnswers[currentIdx]),
        isCorrect: isCorrect,
        documentContent: `Câu hỏi trích từ tài liệu: ${quiz.quizTitle}`
      });
      setExplanations(prev => ({ ...prev, [currentIdx]: explanationResult.explanation }));
    } catch (err) {
      console.error(err);
      setExplanations(prev => ({ ...prev, [currentIdx]: "Xin lỗi, hiện tại AI không thể đưa ra lời giải thích." }));
    } finally {
      setLoadingExplanation(null);
    }
  };

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    const finalAnswers: UserAnswer[] = quiz.questions.map((q, i) => ({
      questionIndex: i,
      answer: userAnswers[i],
      isCorrect: userAnswers[i] === q.correctAnswer,
      explanation: explanations[i]
    }));

    const score = finalAnswers.filter(a => a.isCorrect).length;
    const result: QuizResult = {
      quizId: id,
      score,
      totalQuestions,
      answers: finalAnswers,
      completedAt: new Date().toISOString()
    };

    storage.saveResult(result);
    setIsFinished(true);
  };

  if (isFinished) {
    const score = quiz.questions.filter((q, i) => userAnswers[i] === q.correctAnswer).length;
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-3xl">
          <Card className="animate-fade-in border-2 border-primary/20 overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary text-white text-center py-12 space-y-4">
              <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-4xl font-headline">Hoàn thành bài tập!</CardTitle>
              <CardDescription className="text-primary-foreground/80 text-lg">
                Chúc mừng bạn đã hoàn thành "{quiz.quizTitle}"
              </CardDescription>
            </CardHeader>
            <CardContent className="p-12 space-y-12 bg-white">
              <div className="grid grid-cols-2 gap-8 text-center">
                <div className="space-y-1">
                  <div className="text-5xl font-extrabold text-primary">{percentage}%</div>
                  <div className="text-muted-foreground uppercase tracking-widest text-xs font-bold">Độ chính xác</div>
                </div>
                <div className="space-y-1">
                  <div className="text-5xl font-extrabold text-foreground">{score}/{totalQuestions}</div>
                  <div className="text-muted-foreground uppercase tracking-widest text-xs font-bold">Điểm số</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-headline font-bold text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Tổng kết hiệu suất
                </h3>
                <div className="space-y-3">
                  {quiz.questions.map((q, i) => (
                    <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${userAnswers[i] === q.correctAnswer ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex-1 pr-4">
                        <p className="font-medium text-sm line-clamp-1">{q.question}</p>
                      </div>
                      {userAnswers[i] === q.correctAnswer ? (
                        <CheckCircle2 className="text-green-500 h-5 w-5 shrink-0" />
                      ) : (
                        <XCircle className="text-red-500 h-5 w-5 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-muted/20 border-t flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="w-full sm:flex-1 h-14" onClick={() => router.push('/dashboard')}>
                <Home className="mr-2 h-5 w-5" />
                Về Dashboard
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:flex-1 h-14" onClick={() => window.location.reload()}>
                Làm lại
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  const isChecked = !!submittedAnswers[currentIdx];
  const isCorrect = userAnswers[currentIdx] === currentQuestion.correctAnswer;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="w-full bg-white h-1.5">
        <div className="bg-primary h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl flex-grow">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-grow space-y-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-primary uppercase tracking-wider">Câu {currentIdx + 1} / {totalQuestions}</span>
              <span className="text-sm text-muted-foreground">{currentQuestion.type.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}</span>
            </div>

            <Card className="shadow-xl border-none">
              <CardContent className="p-8 sm:p-12 space-y-8">
                <h2 className="text-2xl sm:text-3xl font-headline font-bold leading-tight">{currentQuestion.question}</h2>

                {currentQuestion.type === 'multiple-choice' && (
                  <RadioGroup 
                    value={String(userAnswers[currentIdx])} 
                    onValueChange={handleOptionSelect}
                    disabled={isChecked}
                    className="grid gap-4"
                  >
                    {currentQuestion.options.map((option, i) => (
                      <Label
                        key={i}
                        className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer hover:bg-muted/50 ${
                          isChecked 
                            ? option === currentQuestion.correctAnswer 
                              ? 'border-green-500 bg-green-50' 
                              : userAnswers[currentIdx] === option 
                                ? 'border-red-500 bg-red-50' 
                                : 'opacity-50'
                            : userAnswers[currentIdx] === option 
                              ? 'border-primary bg-primary/5' 
                              : 'border-transparent bg-muted/30'
                        }`}
                      >
                        <RadioGroupItem value={option} className="sr-only" />
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          userAnswers[currentIdx] === option ? 'border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {userAnswers[currentIdx] === option && <div className="w-3 h-3 rounded-full bg-primary" />}
                        </div>
                        <span className="text-lg font-medium">{option}</span>
                        {isChecked && option === currentQuestion.correctAnswer && <CheckCircle2 className="ml-auto text-green-500 h-5 w-5" />}
                        {isChecked && userAnswers[currentIdx] === option && option !== currentQuestion.correctAnswer && <XCircle className="ml-auto text-red-500 h-5 w-5" />}
                      </Label>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.type === 'true-false' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[true, false].map((val) => (
                      <Button
                        key={String(val)}
                        variant={userAnswers[currentIdx] === val ? "default" : "outline"}
                        disabled={isChecked}
                        className={`h-24 text-xl font-headline ${
                          isChecked 
                            ? val === currentQuestion.correctAnswer 
                              ? 'bg-green-500 text-white border-none' 
                              : userAnswers[currentIdx] === val ? 'bg-red-500 text-white border-none' : 'opacity-50'
                            : ''
                        }`}
                        onClick={() => handleOptionSelect(val)}
                      >
                        {val ? "Đúng" : "Sai"}
                      </Button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'short-answer' && (
                  <div className="space-y-4">
                    <Input 
                      placeholder="Nhập câu trả lời của bạn..." 
                      className="h-16 text-lg" 
                      value={String(userAnswers[currentIdx] || "")}
                      onChange={(e) => handleOptionSelect(e.target.value)}
                      disabled={isChecked}
                    />
                    {isChecked && (
                      <div className={`p-4 rounded-lg flex items-start gap-3 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                        {isCorrect ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />}
                        <div>
                          <p className="font-bold">Đáp án đúng:</p>
                          <p>{currentQuestion.correctAnswer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-8 sm:p-12 border-t bg-muted/10 flex justify-between items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Trước đó
                </Button>
                
                {!isChecked ? (
                  <Button size="lg" className="h-12 px-8" onClick={handleCheckAnswer}>
                    Kiểm tra đáp án
                  </Button>
                ) : (
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90" onClick={handleNext}>
                    {currentIdx === totalQuestions - 1 ? "Hoàn thành" : "Câu tiếp theo"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>

            {isChecked && (
              <Card className="animate-fade-in border-accent/20 bg-accent/5 overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="bg-accent/20 p-2 rounded-lg">
                    <BrainCircuit className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Giải thích từ AI</CardTitle>
                    <CardDescription>Dựa trên nội dung tài liệu của bạn</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="prose prose-blue max-w-none">
                  {loadingExplanation === currentIdx ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang tạo phân tích chi tiết...</span>
                    </div>
                  ) : (
                    <div className="text-foreground leading-relaxed">
                      {explanations[currentIdx] || currentQuestion.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
