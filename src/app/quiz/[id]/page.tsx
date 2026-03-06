
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, BrainCircuit, Home, ClipboardList, Upload, Sparkles, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/storage";
import { Quiz, QuizQuestion } from "@/lib/types";
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
  DialogFooter,
} from "@/components/ui/dialog";

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  const [isFinished, setIsFinished] = useState(false);
  
  const [answerKeyInput, setAnswerKeyInput] = useState("");
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [verifiedResults, setVerifiedResults] = useState<Record<number, any> | null>(null);

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

    // Regex thông minh để bóc tách bảng đáp án nhập tay
    const regex = /(\d+)\s*[-.)\s:]\s*([a-zA-Z0-9]+)/g;
    const keyMap: Record<number, string> = {};
    let match;
    
    while ((match = regex.exec(answerKeyInput)) !== null) {
      const num = parseInt(match[1]);
      const val = match[2].toLowerCase();
      keyMap[num] = val;
    }

    const verification: Record<number, any> = {};
    quiz.questions.forEach((q, i) => {
      const userAns = userAnswers[i];

      if (q.type === 'multiple-choice') {
        const keyLetter = keyMap[i + 1];
        if (keyLetter) {
          const keyIndex = keyLetter.charCodeAt(0) - 97;
          const correctText = q.options[keyIndex];
          verification[i] = {
            isCorrect: String(userAns || "").toLowerCase() === String(correctText || "").toLowerCase(),
            keyAnswer: correctText || `Option ${keyLetter.toUpperCase()}`
          };
        }
      } else if (q.type === 'cloze') {
        const clozeVerif: Record<number, boolean> = {};
        const clozeKeys: Record<number, string> = {};
        q.blanks.forEach(b => {
          const keyVal = keyMap[b.index];
          if (keyVal) {
            clozeVerif[b.index] = String(userAns?.[b.index] || "").toLowerCase().trim() === keyVal.trim();
            clozeKeys[b.index] = keyVal;
          }
        });
        verification[i] = { clozeVerif, clozeKeys };
      }
    });

    setVerifiedResults(verification);
    setIsKeyDialogOpen(false);
    toast({ title: "Thành công", description: `Đã đối soát đáp án dựa trên dữ liệu bạn nhập.` });
  };

  const handleAskGemini = () => {
    let prompt = "Chào Gemini, tôi vừa làm một bài tập và có một số câu sai. Nhờ bạn giải thích chi tiết tại sao đáp án của tôi chưa đúng và cung cấp kiến thức liên quan nhé.\n\n";
    
    quiz.questions.forEach((q, i) => {
      const verif = verifiedResults?.[i];
      let isCorrect = false;
      let correctAns = "";

      if (q.type === 'multiple-choice') {
        isCorrect = verif ? verif.isCorrect : (userAnswers[i] === q.correctAnswer);
        correctAns = verif?.keyAnswer || q.correctAnswer;
      } else if (q.type === 'cloze') {
        const v = verif ? Object.values(verif.clozeVerif).every(val => val) : false;
        isCorrect = v;
        correctAns = verif ? JSON.stringify(verif.clozeKeys) : JSON.stringify(q.blanks.map(b => `(${b.index}): ${b.correctAnswer}`));
      }
      
      if (!isCorrect) {
        prompt += `Câu ${i + 1}: ${q.type === 'cloze' ? "Bài điền từ vào đoạn văn" : q.question}\n`;
        prompt += `- Tôi chọn: ${JSON.stringify(userAnswers[i])}\n`;
        prompt += `- Đáp án đúng: ${correctAns}\n\n`;
      }
    });

    navigator.clipboard.writeText(prompt).then(() => {
      toast({ title: "Đã sao chép Prompt!", description: "Dán vào Gemini để nhận lời giải nhé." });
      window.open("https://gemini.google.com/app", "_blank");
    });
  };

  const currentQuestion = quiz.questions[currentIdx];
  const progress = ((currentIdx + 1) / quiz.questions.length) * 100;

  const handleNext = () => {
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsFinished(true);
    }
  };

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  const renderQuestionContent = (q: QuizQuestion, idx: number) => {
    if (q.type === 'multiple-choice') {
      return (
        <RadioGroup 
          value={String(userAnswers[idx] || "")} 
          onValueChange={(val) => setUserAnswers(prev => ({ ...prev, [idx]: val }))}
          className="grid gap-4 mt-6"
        >
          {q.options.map((option, i) => (
            <Label key={i} className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer hover:bg-muted/50 ${userAnswers[idx] === option ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'}`}>
              <RadioGroupItem value={option} className="sr-only" />
              <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 font-bold ${userAnswers[idx] === option ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                {getOptionLetter(i)}
              </div>
              <span className="text-lg font-medium">{option}</span>
            </Label>
          ))}
        </RadioGroup>
      );
    }

    if (q.type === 'cloze') {
      const parts = q.question.split(/(\[\[BLANK_\d+\]\])/g);
      return (
        <div className="text-lg leading-relaxed mt-6 space-y-4">
          <div className="bg-card p-6 sm:p-10 rounded-2xl border-2 border-dashed shadow-inner">
            {parts.map((part, i) => {
              const match = part.match(/\[\[BLANK_(\d+)\]\]/);
              if (match) {
                const blankIndex = parseInt(match[1]);
                return (
                  <span key={i} className="inline-block mx-1">
                    <span className="text-[10px] font-bold text-primary mr-0.5 align-top">({blankIndex})</span>
                    <Input 
                      className="w-28 h-8 inline-block text-center font-bold text-primary border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 px-1 bg-transparent hover:bg-primary/5 transition-colors"
                      placeholder="..."
                      value={userAnswers[idx]?.[blankIndex] || ""}
                      onChange={(e) => {
                        const currentCloze = userAnswers[idx] || {};
                        setUserAnswers(prev => ({
                          ...prev,
                          [idx]: { ...currentCloze, [blankIndex]: e.target.value }
                        }));
                      }}
                    />
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  if (isFinished) {
    const results = quiz.questions.map((q, i) => {
      const verif = verifiedResults?.[i];
      let isCorrect = false;
      if (q.type === 'multiple-choice') {
        isCorrect = verif ? verif.isCorrect : (userAnswers[i] === q.correctAnswer);
      } else if (q.type === 'cloze') {
        // Tự động chấm điểm Cloze dựa trên blanks có sẵn trong quiz object
        const userCloze = userAnswers[i] || {};
        const isAllBlanksCorrect = q.blanks.every(b => 
          String(userCloze[b.index] || "").toLowerCase().trim() === String(b.correctAnswer || "").toLowerCase().trim()
        );
        isCorrect = verif ? Object.values(verif.clozeVerif).every(v => v) : isAllBlanksCorrect;
      }
      return { q, isCorrect, verif };
    });

    const correctCount = results.filter(r => r.isCorrect).length;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="animate-fade-in border-2 border-primary/20 overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary text-white text-center py-12">
              <CardTitle className="text-3xl font-headline mb-4 uppercase tracking-widest">Hoàn thành bài tập</CardTitle>
              <div className="text-6xl font-extrabold">{correctCount} / {quiz.questions.length}</div>
              <p className="mt-4 opacity-80 font-medium">Bạn đã hoàn thành tốt bài tập này!</p>
            </CardHeader>

            <CardContent className="p-8 space-y-10">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-muted-foreground uppercase tracking-wider">Bảng đối chiếu nhanh</h3>
                <div className="flex flex-wrap gap-2">
                  {results.map((res, i) => (
                    <div 
                      key={i} 
                      className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center border-2 transition-colors ${res.isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                    >
                      <span className="text-[10px] font-bold opacity-60">{i + 1}</span>
                      <span className="font-bold uppercase">
                        {res.q.type === 'multiple-choice' ? 
                          getOptionLetter(res.q.options.indexOf(userAnswers[i] || "")) : 
                          "..."
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Chi tiết từng câu</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsKeyDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" /> Nhập đáp án
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleAskGemini} className="bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">
                    <Sparkles className="h-4 w-4 mr-2" /> Hỏi Gemini
                  </Button>
                </div>
              </div>

              <div className="border rounded-2xl overflow-hidden bg-muted/20">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">Câu</TableHead>
                      <TableHead>Nội dung câu hỏi</TableHead>
                      <TableHead className="text-center">Kết quả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((res, i) => (
                      <TableRow key={i} className="hover:bg-primary/5 transition-colors">
                        <TableCell className="font-bold text-center">{i + 1}</TableCell>
                        <TableCell className="max-w-[400px]">
                          <p className="font-medium line-clamp-2">{res.q.type === 'cloze' ? "Bài tập điền từ vào đoạn văn" : res.q.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Chọn: {res.q.type === 'cloze' ? 
                              Object.entries(userAnswers[i] || {}).map(([k, v]) => `(${k}): ${v}`).join(', ') || "Chưa điền" : 
                              String(userAnswers[i] || "Bỏ trống")
                            }
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          {res.isCorrect ? 
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> ĐÚNG
                            </div> : 
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                              <XCircle className="h-3.5 w-3.5" /> SAI
                            </div>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-muted/10 flex gap-4">
              <Button className="flex-1 h-12 font-bold" onClick={() => router.push('/dashboard')}>
                <Home className="mr-2 h-4 w-4" /> Bảng điều khiển
              </Button>
              <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => window.location.reload()}>
                Làm lại bài này
              </Button>
            </CardFooter>
          </Card>
        </main>

        <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">Nhập bảng đáp án đối soát</DialogTitle>
              <DialogDescription>Dán chuỗi đáp án của bạn (Ví dụ: 1-a, 2-b, 3-word...). Hệ thống sẽ tự động cập nhật lại điểm số.</DialogDescription>
            </DialogHeader>
            <Textarea 
              placeholder="1-a, 2-b, 3-example..." 
              className="min-h-[200px] font-mono text-sm bg-muted/30 border-none focus-visible:ring-primary"
              value={answerKeyInput}
              onChange={(e) => setAnswerKeyInput(e.target.value)}
            />
            <DialogFooter>
              <Button onClick={handleApplyAnswerKey} className="w-full h-12 font-bold shadow-lg shadow-primary/20">Bắt đầu đối soát</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="w-full bg-muted h-2"><div className="bg-primary h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
      <main className="container mx-auto px-4 py-10 max-w-4xl flex-grow animate-fade-in">
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-1">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">Câu hỏi {currentIdx + 1} / {quiz.questions.length}</span>
            <h3 className="text-sm font-medium text-muted-foreground mt-2">{quiz.quizTitle}</h3>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border">
            {currentQuestion.type === 'cloze' ? <FileText className="h-5 w-5 text-primary" /> : <BrainCircuit className="h-5 w-5 text-primary" />}
            <span className="text-xs font-bold uppercase tracking-tighter">{currentQuestion.type === 'cloze' ? "Điền từ vào đoạn văn" : "Câu hỏi trắc nghiệm"}</span>
          </div>
        </div>

        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-none overflow-hidden bg-card/60 backdrop-blur-sm">
          <CardContent className="p-8 sm:p-14">
            <h2 className="text-2xl sm:text-4xl font-headline font-bold leading-tight mb-8">
              {currentQuestion.type === 'cloze' ? "Hãy hoàn thành các ô trống trong đoạn văn sau:" : currentQuestion.question}
            </h2>
            {renderQuestionContent(currentQuestion, currentIdx)}
          </CardContent>

          <CardFooter className="p-8 border-t bg-muted/10 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0} className="h-12 px-6 font-bold hover:bg-background">
              <ArrowLeft className="mr-2 h-4 w-4" /> QUAY LẠI
            </Button>
            <Button size="lg" className="h-14 px-12 font-bold shadow-xl shadow-primary/20 rounded-xl" onClick={handleNext}>
              {currentIdx === quiz.questions.length - 1 ? "HOÀN THÀNH" : "KẾ TIẾP"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
