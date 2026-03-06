"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, History, Search, Loader2, Sparkles, Plus, Type } from "lucide-react";
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

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualText, setManualText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setQuizzes(storage.getQuizzes());
  }, []);

  const handleProcessText = async (content: string, sourceName: string) => {
    setIsGenerating(true);
    try {
      const quizOutput = await generateQuizFromDocument({ documentContent: content });
      
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
        description: "Bài tập của bạn đã được tạo.",
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
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    handleProcessText(text, file.name);
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) {
      toast({
        variant: "destructive",
        title: "Thông báo",
        description: "Vui lòng nhập nội dung văn bản.",
      });
      return;
    }
    handleProcessText(manualText, "Văn bản nhập tay");
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.quizTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.documentSource?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-12 space-y-4">
          <h1 className="text-4xl font-headline font-bold">Bảng điều khiển</h1>
          <p className="text-muted-foreground text-lg">Tải lên tài liệu hoặc dán văn bản để tạo bài tập thông minh với AI.</p>
        </header>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-white p-1 border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">Tổng quan</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-white">Lịch sử</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-fade-in">
            <section className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Card className="border-dashed border-2 hover:border-primary transition-colors group relative overflow-hidden">
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isGenerating ? (
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      ) : (
                        <Upload className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-headline font-bold">Tải lên tài liệu</h3>
                      <p className="text-sm text-muted-foreground">PDF, DOCX, hoặc TXT</p>
                    </div>
                    <Button disabled={isGenerating} size="sm" className="w-full relative overflow-hidden">
                      <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                        <input type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileUpload} />
                        {isGenerating ? "Đang xử lý..." : "Chọn File"}
                      </label>
                    </Button>
                  </CardContent>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Card className="border-dashed border-2 hover:border-accent transition-colors group relative cursor-pointer">
                      <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Type className="h-8 w-8 text-accent-foreground" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-headline font-bold">Dán văn bản</h3>
                          <p className="text-sm text-muted-foreground">Nhập trực tiếp nội dung</p>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Nhập văn bản
                        </Button>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Tạo bài tập từ văn bản</DialogTitle>
                      <DialogDescription>
                        Dán nội dung tài liệu hoặc các câu hỏi của bạn vào đây. AI sẽ tự động phân tích và tạo quiz.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Textarea 
                        placeholder="Dán nội dung tại đây..." 
                        className="min-h-[300px] text-base"
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                      <Button onClick={handleManualSubmit} disabled={isGenerating || !manualText.trim()}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Bắt đầu tạo
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="bg-primary text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  <Sparkles className="h-32 w-32" />
                </div>
                <CardContent className="p-12 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-headline font-bold">Thống kê học tập</h3>
                    <p className="opacity-90">Xem lại hiệu suất làm bài của bạn qua các bài tập đã tạo.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-xl">
                      <div className="text-3xl font-bold">{quizzes.length}</div>
                      <div className="text-sm opacity-70">Tổng số Quiz</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl">
                      <div className="text-3xl font-bold">84%</div>
                      <div className="text-sm opacity-70">Điểm trung bình</div>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full">Xem chi tiết</Button>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-headline font-bold">Bài tập gần đây</h2>
                <Button variant="link" onClick={() => router.push('#history')}>Xem tất cả</Button>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.slice(0, 3).map((quiz) => (
                  <Card key={quiz.id} className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden" onClick={() => router.push(`/quiz/${quiz.id}`)}>
                    <CardHeader className="bg-muted/30 group-hover:bg-primary/5 transition-colors">
                      <CardTitle className="line-clamp-1">{quiz.quizTitle}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {quiz.documentSource || 'Không rõ nguồn'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 pb-6">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                        <span className="font-medium text-primary">{quiz.questions.length} Câu hỏi</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {quizzes.length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <History className="text-muted-foreground h-8 w-8" />
                    </div>
                    <p className="text-muted-foreground">Chưa có bài tập nào. Hãy tải file hoặc dán văn bản để bắt đầu!</p>
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="history" className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Tìm kiếm theo tiêu đề hoặc nguồn..." 
                  className="pl-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push(`/quiz/${quiz.id}`)}>
                  <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1 text-center sm:text-left">
                      <h3 className="font-headline font-bold text-lg">{quiz.quizTitle}</h3>
                      <p className="text-sm text-muted-foreground">Nguồn: {quiz.documentSource || 'Không rõ'} • Ngày tạo {new Date(quiz.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="font-bold">{quiz.questions.length} Câu hỏi</div>
                        <div className="text-xs text-muted-foreground">Loại: Tổng hợp</div>
                      </div>
                      <Button variant="outline">Làm lại</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredQuizzes.length === 0 && (
                <div className="text-center py-20 border rounded-xl bg-muted/20">
                  <p className="text-muted-foreground">Không tìm thấy kết quả phù hợp.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
