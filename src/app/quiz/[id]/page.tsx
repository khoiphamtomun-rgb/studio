
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
import { Quiz, UserAnswer, QuizResult, QuizQuestion } from "@/lib/types";
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
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
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
            clozeVerif[b.index] = String(userAns?.[b.index] || "").toLowerCase() === keyVal;
            clozeKeys[b.index] = keyVal;
          }
        });
        verification[i] = { clozeVerif, clozeKeys };
      }
    });

    setVerifiedResults(verification);
    setIsKeyDialogOpen(false);
    toast({ title: "Thành công", description: `Đã đối soát đáp án.` });
  };

  const handleAskGemini = () => {
    let prompt = "Chào Gemini, tôi vừa làm một bài tập và có một số câu sai. Nhờ bạn giải thích chi tiết nhé.\n\n";
    
    quiz.questions.forEach((q, i) => {
      const verif = verifiedResults?.[i];
      const isCorrect = verif ? (verif.isCorrect ?? Object.values(verif.clozeVerif || {}).every(v => v)) : (userAnswers[i] === q.correctAnswer);
      
      if (!isCorrect) {
        prompt += `Câu ${i + 1}: ${q.question}\n`;
        prompt += `- Tôi chọn: ${JSON.stringify(userAnswers[i])}\n`;
        prompt += `- Đáp án đúng: ${JSON.stringify(verif?.keyAnswer || q.correctAnswer)}\n\n`;
      }
    });

    navigator.clipboard.writeText(prompt).then(() => {
      toast({ title: "Đã sao chép Prompt!", description: "Dán vào Gemini để hỏi nhé." });
      window.open("https://gemini.google.com/app", "_blank");
    });
  };

  const currentQuestion = quiz.questions[currentIdx];
  const progress = ((currentIdx + 1) / quiz.questions.length) * 100;

  const handleNext = () => {
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setIsFinished(true);
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
          <div className="bg-card p-6 rounded-2xl border-2 border-dashed">
            {parts.map((part, i) => {
              const match = part.match(/\[\[BLANK_(\d+)\]\]/);
              if (match) {
                const blankIndex = parseInt(match[1]);
                return (
                  <span key={i} className="inline-block mx-1">
                    <span className="text-xs font-bold text-primary mr-1">({blankIndex})</span>
                    <Input 
                      className="w-24 h-8 inline-block text-center font-bold text-primary border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 px-1"
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
        isCorrect = verif ? verif.isCorrect : userAnswers[i] === q.correctAnswer;
      } else if (q.type === 'cloze') {
        isCorrect = verif ? Object.values(verif.clozeVerif).every(v => v) : false;
      }
      return { q, isCorrect, verif };
    });

    const correctCount = results.filter(r => r.isCorrect).length;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="animate-fade-in border-2 border-primary/20 overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary text-white text-center py-10">
              <CardTitle className="text-3xl font-headline mb-4">Kết quả</CardTitle>
              <div className="text-5xl font-extrabold">{correctCount} / {quiz.questions.length}</div>
            </CardHeader>

            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Chi tiết bài làm</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsKeyDialogOpen(true)}>Nhập đáp án bổ sung</Button>
                  <Button variant="secondary" size="sm" onClick={handleAskGemini} className="bg-purple-50 text-purple-700"><Sparkles className="h-4 w-4 mr-2" /> Hỏi Gemini</Button>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Câu</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Bạn đã chọn</TableHead>
                      <TableHead>Kết quả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((res, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{res.q.question.substring(0, 100)}...</TableCell>
                        <TableCell>
                          {res.q.type === 'cloze' ? 
                            Object.entries(userAnswers[i] || {}).map(([k, v]) => `(${k}): ${v}`).join(', ') : 
                            String(userAnswers[i] || "-")
                          }
                        </TableCell>
                        <TableCell>
                          {res.isCorrect ? 
                            <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Đúng</span> : 
                            <span className="text-red-600 font-bold flex items-center gap-1"><XCircle className="h-4 w-4" /> Sai</span>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="p-8 flex gap-4">
              <Button className="flex-1" onClick={() => router.push('/dashboard')}><Home className="mr-2 h-4 w-4" /> Về Dashboard</Button>
              <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>Làm lại</Button>
            </CardFooter>
          </Card>
        </main>

        <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nhập bảng đáp án</DialogTitle>
              <DialogDescription>Dán chuỗi đáp án (Ví dụ: 1-a, 2-b, 3-word...)</DialogDescription>
            </DialogHeader>
            <Textarea 
              placeholder="1-a, 2-b, 3-as..." 
              className="min-h-[150px] font-mono"
              value={answerKeyInput}
              onChange={(e) => setAnswerKeyInput(e.target.value)}
            />
            <DialogFooter>
              <Button onClick={handleApplyAnswerKey} className="w-full">Đối soát tự động</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="w-full bg-muted h-1.5"><div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} /></div>
      <main className="container mx-auto px-4 py-8 max-w-4xl flex-grow">
        <div className="flex items-center justify-between mb-8">
          <span className="text-sm font-bold text-primary uppercase tracking-widest">Câu {currentIdx + 1} / {quiz.questions.length}</span>
          <div className="flex items-center gap-2">
            {currentQuestion.type === 'cloze' ? <FileText className="h-4 w-4 text-primary" /> : <BrainCircuit className="h-4 w-4 text-primary" />}
            <span className="text-xs font-bold uppercase">{currentQuestion.type}</span>
          </div>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden">
          <CardContent className="p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-headline font-bold leading-tight">
              {currentQuestion.type === 'cloze' ? "Điền vào chỗ trống trong đoạn văn sau:" : currentQuestion.question}
            </h2>
            {renderQuestionContent(currentQuestion, currentIdx)}
          </CardContent>

          <CardFooter className="p-8 border-t bg-muted/10 flex justify-between">
            <Button variant="ghost" onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Trước
            </Button>
            <Button size="lg" className="px-10" onClick={handleNext}>
              {currentIdx === quiz.questions.length - 1 ? "Hoàn thành" : "Tiếp theo"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
