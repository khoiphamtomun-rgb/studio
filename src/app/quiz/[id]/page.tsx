
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, BrainCircuit, Home, AlertCircle, Info, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { storage } from "@/lib/storage";
import { Quiz, UserAnswer, QuizResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | boolean>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const q = storage.getQuizById(id);
    if (!q) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không tìm thấy bài tập này." });
      router.push("/dashboard");
      return;
    }
    setQuiz(q);
  }, [id, router, toast]);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <CardTitle className="text-2xl font-headline font-bold">Không tìm thấy nội dung</CardTitle>
              <CardDescription className="text-lg">
                Hệ thống không thể trích xuất hoặc tạo câu hỏi từ tài liệu này. 
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

  if (!currentQuestion) return null;

  const handleOptionSelect = (val: string | boolean) => {
    if (submittedAnswers[currentIdx]) return;
    setUserAnswers(prev => ({ ...prev, [currentIdx]: val }));
    
    if (currentQuestion.isAnswerGuessed) {
      setSubmittedAnswers(prev => ({ ...prev, [currentIdx]: true }));
    }
  };

  const handleCheckAnswer = () => {
    if (userAnswers[currentIdx] === undefined) {
      toast({ title: "Vui lòng chọn đáp án", description: "Bạn cần chọn một câu trả lời trước khi kiểm tra." });
      return;
    }
    setSubmittedAnswers(prev => ({ ...prev, [currentIdx]: true }));
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
      explanation: q.explanation,
      isAnswerGuessed: q.isAnswerGuessed
    }));

    const score = finalAnswers.filter(a => !a.isAnswerGuessed && a.isCorrect).length;
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

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  if (isFinished) {
    const results = quiz.questions.map((q, i) => ({
      question: q.question,
      userAnswer: userAnswers[i],
      correctAnswer: q.correctAnswer,
      isAnswerGuessed: q.isAnswerGuessed,
      isCorrect: userAnswers[i] === q.correctAnswer,
      options: (q as any).options || []
    }));

    const isSelfCheckQuiz = results.some(r => r.isAnswerGuessed);

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="animate-fade-in border-2 border-primary/20 overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary text-white text-center py-10 space-y-2">
              <CardTitle className="text-3xl font-headline">Hoàn thành bài tập!</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {isSelfCheckQuiz ? "Hãy đối soát các đáp án bạn đã chọn bên dưới" : "Xem lại kết quả bài làm của bạn"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-10 space-y-10 bg-white">
              <section className="space-y-6">
                <h3 className="font-headline font-bold text-xl flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Bảng đối chiếu đáp án
                </h3>
                
                {/* Answer Key Style (1. A, 2. B...) */}
                <div className="bg-muted/30 p-8 rounded-2xl border-2 border-dashed border-muted grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                  {results.map((res, i) => {
                    const optionIndex = res.options.indexOf(String(res.userAnswer));
                    const letter = optionIndex !== -1 ? getOptionLetter(optionIndex) : "-";
                    return (
                      <div key={i} className="flex items-baseline gap-2">
                        <span className="text-muted-foreground font-mono font-medium">{i + 1}.</span>
                        <span className="text-2xl font-headline font-extrabold text-primary">{letter}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border rounded-xl overflow-hidden mt-8">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-12 text-center">Câu</TableHead>
                        <TableHead>Câu hỏi</TableHead>
                        <TableHead>Bạn đã chọn</TableHead>
                        {!isSelfCheckQuiz && <TableHead>Trạng thái</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((res, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-center font-bold">{i + 1}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{res.question}</TableCell>
                          <TableCell className="font-medium text-primary">
                            {res.options.indexOf(String(res.userAnswer)) !== -1 
                              ? `${getOptionLetter(res.options.indexOf(String(res.userAnswer)))}. ${res.userAnswer}`
                              : String(res.userAnswer || "Chưa chọn")}
                          </TableCell>
                          {!isSelfCheckQuiz && (
                            <TableCell>
                              {res.isCorrect ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                  <CheckCircle2 className="h-3 w-3" /> Chính xác
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                  <XCircle className="h-3 w-3" /> Sai
                                </span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
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
  const isSelfCheck = !!currentQuestion.isAnswerGuessed;

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
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary uppercase tracking-wider">Câu {currentIdx + 1} / {totalQuestions}</span>
                {isSelfCheck && (
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">TỰ ĐỐI CHIẾU</span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {currentQuestion.type === 'multiple-choice' ? 'Trắc nghiệm' : currentQuestion.type === 'true-false' ? 'Đúng/Sai' : 'Tự luận ngắn'}
              </span>
            </div>

            <Card className="shadow-xl border-none">
              <CardContent className="p-8 sm:p-12 space-y-8">
                <h2 className="text-2xl sm:text-3xl font-headline font-bold leading-tight">{currentQuestion.question}</h2>

                {currentQuestion.type === 'multiple-choice' && (
                  <RadioGroup 
                    value={String(userAnswers[currentIdx] || "")} 
                    onValueChange={handleOptionSelect}
                    disabled={isChecked && !isSelfCheck}
                    className="grid gap-4"
                  >
                    {currentQuestion.options.map((option, i) => {
                      const isSelected = userAnswers[currentIdx] === option;
                      let borderColor = "border-transparent bg-muted/30";
                      
                      if (isChecked && !isSelfCheck) {
                        if (option === currentQuestion.correctAnswer) borderColor = "border-green-500 bg-green-50";
                        else if (isSelected) borderColor = "border-red-500 bg-red-50";
                        else borderColor = "opacity-50 border-transparent bg-muted/30";
                      } else if (isSelected) {
                        borderColor = "border-primary bg-primary/5";
                      }

                      return (
                        <Label
                          key={i}
                          className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer hover:bg-muted/50 ${borderColor}`}
                        >
                          <RadioGroupItem value={option} className="sr-only" />
                          <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 font-bold ${
                            isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30 text-muted-foreground'
                          }`}>
                            {getOptionLetter(i)}
                          </div>
                          <span className="text-lg font-medium">{option}</span>
                          {isChecked && !isSelfCheck && option === currentQuestion.correctAnswer && <CheckCircle2 className="ml-auto text-green-500 h-5 w-5" />}
                          {isChecked && !isSelfCheck && isSelected && option !== currentQuestion.correctAnswer && <XCircle className="ml-auto text-red-500 h-5 w-5" />}
                        </Label>
                      );
                    })}
                  </RadioGroup>
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
                
                {isSelfCheck ? (
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90" onClick={handleNext} disabled={userAnswers[currentIdx] === undefined}>
                    {currentIdx === totalQuestions - 1 ? "Hoàn thành" : "Tiếp theo"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : !isChecked ? (
                  <Button size="lg" className="h-12 px-8" onClick={handleCheckAnswer} disabled={userAnswers[currentIdx] === undefined}>
                    Kiểm tra đáp án
                  </Button>
                ) : (
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90" onClick={handleNext}>
                    {currentIdx === totalQuestions - 1 ? "Hoàn thành" : "Tiếp theo"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>

            {isChecked && !isSelfCheck && (
              <Card className="animate-fade-in border-accent/20 bg-accent/5 overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="bg-accent/20 p-2 rounded-lg">
                    <BrainCircuit className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Giải thích chi tiết</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-foreground leading-relaxed">
                  {currentQuestion.explanation}
                </CardContent>
              </Card>
            )}
            
            {isSelfCheck && isChecked && (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 animate-fade-in">
                <Info className="h-5 w-5 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-800">
                  Câu hỏi này được thiết lập ở chế độ tự đối soát. Hãy làm hết bài để xem bảng tổng hợp đáp án cuối cùng.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
