
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, BrainCircuit, Home, AlertCircle, Info, ClipboardList, Check, Upload, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { storage } from "@/lib/storage";
import { Quiz, UserAnswer, QuizResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | boolean>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  
  // State cho việc đối soát đáp án sau khi làm xong
  const [answerKeyInput, setAnswerKeyInput] = useState("");
  const [verifiedResults, setVerifiedResults] = useState<Record<number, { isCorrect: boolean, keyAnswer: string }> | null>(null);

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

  const handleApplyAnswerKey = () => {
    if (!answerKeyInput.trim()) return;

    // Regex bóc tách định dạng: 1-a, 2-b hoặc 1.a 2.b...
    const regex = /(\d+)\s*[-.]\s*([a-zA-Z])/g;
    const keyMap: Record<number, string> = {};
    let match;
    
    while ((match = regex.exec(answerKeyInput)) !== null) {
      const num = parseInt(match[1]) - 1; // Chuyển sang index 0
      const letter = match[2].toLowerCase();
      keyMap[num] = letter;
    }

    if (Object.keys(keyMap).length === 0) {
      toast({ variant: "destructive", title: "Lỗi định dạng", description: "Không tìm thấy đáp án hợp lệ. Vui lòng nhập theo mẫu: 1-a, 2-b..." });
      return;
    }

    const verification: Record<number, { isCorrect: boolean, keyAnswer: string }> = {};
    quiz.questions.forEach((q, i) => {
      const userAns = String(userAnswers[i] || "").toLowerCase();
      const keyLetter = keyMap[i];
      
      if (keyLetter && (q as any).options) {
        const keyIndex = keyLetter.charCodeAt(0) - 97; // a -> 0, b -> 1
        const correctOptionText = (q as any).options[keyIndex];
        
        verification[i] = {
          isCorrect: userAns === String(correctOptionText || "").toLowerCase(),
          keyAnswer: correctOptionText || `Lựa chọn ${keyLetter.toUpperCase()}`
        };
      }
    });

    setVerifiedResults(verification);
    toast({ title: "Thành công", description: `Đã đối soát ${Object.keys(verification).length} câu hỏi.` });
  };

  const handleAskGemini = () => {
    const results = quiz.questions.map((q, i) => ({
      question: q.question,
      userAnswer: userAnswers[i],
      isCorrect: verifiedResults ? verifiedResults[i]?.isCorrect : userAnswers[i] === q.correctAnswer,
      correctAnswer: verifiedResults ? verifiedResults[i]?.keyAnswer : q.correctAnswer,
    }));

    const wrongQuestions = results.filter(r => !r.isCorrect);

    if (wrongQuestions.length === 0) {
      toast({ title: "Chúc mừng!", description: "Bạn đã làm đúng hết, không cần hỏi Gemini đâu!" });
      return;
    }

    let prompt = "Chào Gemini, tôi vừa làm một bài tập trắc nghiệm và có một số câu làm sai. Nhờ bạn giải thích chi tiết tại sao đáp án của tôi lại sai và tại sao đáp án đúng lại là đáp án đó nhé.\n\nDưới đây là danh sách các câu tôi làm sai:\n\n";
    
    wrongQuestions.forEach((q, i) => {
      prompt += `Câu ${i + 1}: ${q.question}\n`;
      prompt += `- Đáp án tôi chọn: ${q.userAnswer}\n`;
      prompt += `- Đáp án đúng: ${q.correctAnswer}\n\n`;
    });

    prompt += "Hãy giải thích từng câu một cách dễ hiểu, tập trung vào kiến thức ngữ pháp hoặc từ vựng liên quan. Cảm ơn bạn!";

    // Sao chép vào clipboard
    navigator.clipboard.writeText(prompt).then(() => {
      toast({
        title: "Đã sao chép Prompt!",
        description: "Bạn có thể dán (Ctrl+V) ngay vào Gemini để hỏi.",
      });
      // Mở Gemini trong tab mới
      window.open("https://gemini.google.com/app", "_blank");
    }).catch(err => {
      console.error("Lỗi khi copy:", err);
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể tự động sao chép prompt." });
    });
  };

  const currentQuestion = quiz.questions[currentIdx];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentIdx + 1) / totalQuestions) * 100;

  const handleOptionSelect = (val: string | boolean) => {
    if (submittedAnswers[currentIdx]) return;
    setUserAnswers(prev => ({ ...prev, [currentIdx]: val }));
    
    if (currentQuestion.isAnswerGuessed) {
      setSubmittedAnswers(prev => ({ ...prev, [currentIdx]: true }));
    }
  };

  const handleCheckAnswer = () => {
    if (userAnswers[currentIdx] === undefined) {
      toast({ title: "Vui lòng chọn đáp án" });
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

    const result: QuizResult = {
      quizId: id,
      score: finalAnswers.filter(a => !a.isAnswerGuessed && a.isCorrect).length,
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
    const correctCount = verifiedResults 
      ? Object.values(verifiedResults).filter(v => v.isCorrect).length 
      : results.filter(r => !r.isAnswerGuessed && r.isCorrect).length;

    const wrongCount = totalQuestions - correctCount;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="animate-fade-in border-2 border-primary/20 overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary text-white text-center py-10 space-y-4">
              <CardTitle className="text-3xl font-headline">Hoàn thành!</CardTitle>
              <div className="flex flex-col items-center gap-2">
                <div className="text-5xl font-extrabold">{correctCount} / {totalQuestions}</div>
                <div className="text-primary-foreground/80 font-medium">Câu trả lời chính xác</div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-10 space-y-10 bg-white">
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="font-headline font-bold text-xl flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Bảng đối chiếu nhanh
                  </h3>
                  
                  <div className="flex flex-wrap gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Upload className="h-4 w-4" />
                          Nhập đáp án
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nhập bảng đáp án đối soát</DialogTitle>
                          <DialogDescription>
                            Dán chuỗi đáp án của bạn vào đây (Ví dụ: 1-a, 2-b, 3-c...)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Textarea 
                            placeholder="1-a, 2-b, 3-c, 4-a..." 
                            className="min-h-[150px] font-mono"
                            value={answerKeyInput}
                            onChange={(e) => setAnswerKeyInput(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button onClick={handleApplyAnswerKey} className="w-full">Đối soát tự động</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {wrongCount > 0 && (
                      <Button onClick={handleAskGemini} variant="secondary" size="sm" className="gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200">
                        <Sparkles className="h-4 w-4" />
                        Hỏi Gemini về câu sai
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="bg-muted/30 p-8 rounded-2xl border-2 border-dashed border-muted grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-6">
                  {results.map((res, i) => {
                    const optionIndex = res.options.indexOf(String(res.userAnswer));
                    const letter = optionIndex !== -1 ? getOptionLetter(optionIndex) : "-";
                    const verification = verifiedResults?.[i];
                    
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-muted-foreground text-xs font-mono">{i + 1}.</span>
                          <span className={`text-xl font-headline font-extrabold ${
                            verification ? (verification.isCorrect ? 'text-green-600' : 'text-red-600') : 'text-primary'
                          }`}>
                            {letter}
                          </span>
                        </div>
                        {verification && !verification.isCorrect && (
                          <span className="text-[10px] font-bold text-green-600">→ {
                            res.options.indexOf(verification.keyAnswer) !== -1 
                            ? getOptionLetter(res.options.indexOf(verification.keyAnswer))
                            : "?"
                          }</span>
                        )}
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
                        <TableHead>Bạn chọn</TableHead>
                        <TableHead>Kết quả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((res, i) => {
                        const verification = verifiedResults?.[i];
                        const showStatus = verification || !isSelfCheckQuiz;
                        const isCorrect = verification ? verification.isCorrect : res.isCorrect;

                        return (
                          <TableRow key={i}>
                            <TableCell className="text-center font-bold">{i + 1}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{res.question}</TableCell>
                            <TableCell className="font-medium text-primary">
                              {res.options.indexOf(String(res.userAnswer)) !== -1 
                                ? `${getOptionLetter(res.options.indexOf(String(res.userAnswer)))}. ${res.userAnswer}`
                                : String(res.userAnswer || "-")}
                            </TableCell>
                            <TableCell>
                              {showStatus ? (
                                isCorrect ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                    <CheckCircle2 className="h-3 w-3" /> Đúng
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold w-fit">
                                      <XCircle className="h-3 w-3" /> Sai
                                    </span>
                                    {verification && (
                                      <span className="text-[10px] text-green-700 font-medium">Đúng: {verification.keyAnswer}</span>
                                    )}
                                  </div>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Tự đối soát</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                  Trước
                </Button>
                
                {isSelfCheck ? (
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90" onClick={handleNext} disabled={userAnswers[currentIdx] === undefined}>
                    {currentIdx === totalQuestions - 1 ? "Xong" : "Tiếp theo"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : !isChecked ? (
                  <Button size="lg" className="h-12 px-8" onClick={handleCheckAnswer} disabled={userAnswers[currentIdx] === undefined}>
                    Check
                  </Button>
                ) : (
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90" onClick={handleNext}>
                    {currentIdx === totalQuestions - 1 ? "Xong" : "Tiếp theo"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>

            {isChecked && !isSelfCheck && (
              <Card className="animate-fade-in border-accent/20 bg-accent/5">
                <CardHeader className="flex flex-row items-center gap-3">
                  <BrainCircuit className="h-5 w-5 text-accent-foreground" />
                  <CardTitle className="text-lg">Giải thích</CardTitle>
                </CardHeader>
                <CardContent className="leading-relaxed">
                  {currentQuestion.explanation}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

