
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, History, Search, Loader2, Sparkles, Plus, Type, Zap, Code, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/navbar";
import { generateQuizFromDocument } from "@/ai/flows/generate-quiz-from-document";
import { storage } from "@/lib/storage";
import { Quiz } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { parseFixedFormat } from "@/lib/parser";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setQuizzes(storage.getQuizzes());
  }, []);

  const handleProcessText = async (content: string, sourceName: string, forceParser = false, customTitle?: string) => {
    setIsGenerating(true);
    
    // Sử dụng setTimeout để đảm bảo UI kịp hiển thị trạng thái "Loading"
    // trước khi trình duyệt thực hiện tính toán nặng
    setTimeout(async () => {
      try {
        let quizOutput: any;

        if (useAI && !forceParser) {
          // Chỉ dùng AI khi người dùng yêu cầu (Tránh timeout trên Netlify)
          quizOutput = await generateQuizFromDocument({ documentContent: content });
          if (customTitle) quizOutput.quizTitle = customTitle;
        } else {
          // Xử lý trực tiếp trên Client (Nhanh và không tốn Token/Timeout)
          quizOutput = parseFixedFormat(content, customTitle);
          if (quizOutput.questions.length === 0) {
            throw new Error("Không tìm thấy câu hỏi đúng định dạng. Cấu trúc yêu cầu: Câu hỏi (a. / b. / c.)");
          }
        }
        
        const newQuiz: Quiz = {
          ...quizOutput,
          id: Math.random().toString(36).substring(7),
          createdAt: new Date().toISOString(),
          documentSource: sourceName
        };

        storage.saveQuiz(newQuiz);
        setQuizzes(storage.getQuizzes());
        
        toast({
          title: "Thành công!",
          description: `Đã xử lý ${newQuiz.questions.length} câu hỏi.`,
        });

        router.push(`/quiz/${newQuiz.id}`);
      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.message || "Không thể xử lý nội dung. Vui lòng thử lại.",
        });
      } finally {
        setIsGenerating(false);
        setIsDialogOpen(false);
        setManualText("");
        setManualTitle("");
      }
    }, 50);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    handleProcessText(text, file.name, false);
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) {
      toast({ variant: "destructive", title: "Thông báo", description: "Vui lòng nhập nội dung văn bản." });
      return;
    }
    handleProcessText(manualText, "Văn bản nhập tay", false, manualTitle.trim() || undefined);
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.quizTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.documentSource?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-12 space-y-4 text-center lg:text-left">
          <h1 className="text-4xl font-headline font-bold">Bảng điều khiển</h1>
          <p className="text-muted-foreground text-lg">Quản lý kho bài tập của bạn một cách thông minh.</p>
        </header>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 border mx-auto lg:mx-0 w-fit">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white px-8">Tổng quan</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-white px-8">Lịch sử</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-12 animate-fade-in">
            <section className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Card className="border-dashed border-2 hover:border-primary transition-all group relative overflow-hidden bg-card/40 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      {isGenerating ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <Upload className="h-8 w-8 text-primary" />}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-headline font-bold">Tải tài liệu</h3>
                      <p className="text-sm text-muted-foreground">PDF, TXT hoặc Word</p>
                    </div>
                    <Button disabled={isGenerating} size="sm" className="w-full relative overflow-hidden h-10">
                      <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                        <input type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileUpload} />
                        {isGenerating ? "Đang xử lý..." : "Chọn File"}
                      </label>
                    </Button>
                  </CardContent>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Card className="border-dashed border-2 hover:border-accent transition-all group relative cursor-pointer bg-card/40 backdrop-blur-sm shadow-xl">
                      <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Code className="h-8 w-8 text-accent-foreground" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-headline font-bold">Dán văn bản</h3>
                          <p className="text-sm text-muted-foreground">Tạo bài tập từ text bất kỳ</p>
                        </div>
                        <Button variant="outline" size="sm" className="w-full h-10">Nhập trực tiếp</Button>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[650px]">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Tạo bài tập mới</DialogTitle>
                      <DialogDescription>Nhập tiêu đề và nội dung bài tập của bạn để hệ thống tự động bóc tách.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-muted-foreground">TIÊU ĐỀ BÀI TẬP (TÙY CHỌN)</Label>
                        <Input 
                          placeholder="Ví dụ: Luyện nghe Unit 1 - TOEIC" 
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                          className="h-12 bg-muted/20 border-none focus-visible:ring-primary"
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="space-y-1">
                          <Label className="flex items-center gap-2 cursor-pointer font-bold">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Sử dụng AI thông minh
                          </Label>
                          <p className="text-[10px] text-muted-foreground">Bật AI nếu định dạng của bạn không theo chuẩn (Chậm hơn)</p>
                        </div>
                        <Switch checked={useAI} onCheckedChange={setUseAI} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-muted-foreground">NỘI DUNG CÂU HỎI</Label>
                        <Textarea 
                          placeholder={`Định dạng chuẩn:\nMan: "Hello!" Woman: "Hi!" (What does she mean? a. Greeting / b. Saying goodbye)`} 
                          className="min-h-[250px] font-mono text-sm bg-muted/20 border-none focus-visible:ring-primary p-4"
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-12 px-8">Hủy</Button>
                      <Button onClick={handleManualSubmit} disabled={isGenerating || !manualText.trim()} className="h-12 px-8 gap-2 shadow-lg shadow-primary/20">
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Bắt đầu xử lý
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="bg-primary text-white overflow-hidden relative shadow-2xl border-none">
                <div className="absolute -top-12 -right-12 p-8 opacity-20"><Sparkles className="h-48 w-48" /></div>
                <CardContent className="p-12 space-y-8 relative z-10">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-headline font-bold">Thống kê kho lưu trữ</h3>
                    <p className="text-primary-foreground/70 text-sm">Tổng quan về các bài học đã tạo</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors">
                      <div className="text-4xl font-extrabold">{quizzes.length}</div>
                      <div className="text-xs opacity-70 mt-1 uppercase tracking-wider font-bold">Bài tập đã lưu</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors">
                      <div className="text-4xl font-extrabold">95%</div>
                      <div className="text-xs opacity-70 mt-1 uppercase tracking-wider font-bold">Độ chính xác</div>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full h-12 text-primary font-bold shadow-xl">Xem chi tiết kho lưu trữ</Button>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-headline font-bold">Bài tập vừa tạo</h2>
                <Button variant="link" className="text-primary font-bold">Xem tất cả</Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.slice(0, 3).map((quiz) => (
                  <Card key={quiz.id} className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border-none bg-card/40 backdrop-blur-sm" onClick={() => router.push(`/quiz/${quiz.id}`)}>
                    <CardHeader className="bg-muted/30 group-hover:bg-primary/5 transition-colors border-b">
                      <CardTitle className="line-clamp-1 text-lg">{quiz.quizTitle}</CardTitle>
                      <CardDescription className="flex items-center gap-2"><FileText className="h-3 w-3" />{quiz.documentSource}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 pb-6">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold text-xs">
                          {quiz.questions.length} Câu hỏi
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="history" className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm kiếm bài tập..." className="pl-10 h-11 bg-muted/30 border-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Hiển thị {filteredQuizzes.length} kết quả</p>
            </div>
            <div className="grid gap-4">
              {filteredQuizzes.length > 0 ? filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:border-primary/50 transition-all duration-300 cursor-pointer group bg-card/40 backdrop-blur-sm" onClick={() => router.push(`/quiz/${quiz.id}`)}>
                  <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div className="flex-1 space-y-1 text-center sm:text-left">
                      <h3 className="font-headline font-bold text-xl">{quiz.quizTitle}</h3>
                      <p className="text-sm text-muted-foreground">Lưu lúc: {new Date(quiz.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="font-bold text-primary">{quiz.questions.length}</div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Câu hỏi</div>
                      </div>
                      <Button variant="outline" className="h-10 px-6 font-bold hover:bg-primary hover:text-white transition-colors">Làm bài</Button>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="py-20 text-center space-y-4">
                  <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto opacity-50">
                    <Search className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-muted-foreground">Không tìm thấy bài tập nào</h3>
                  <Button onClick={() => setIsDialogOpen(true)} variant="link">Tạo bài tập mới ngay</Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
