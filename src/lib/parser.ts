
import { Quiz } from "./types";

/**
 * Bộ bóc tách văn bản hiệu suất cao.
 * Sử dụng phương pháp duyệt từng dòng thay vì Regex toàn cục để tránh treo máy (ReDoS).
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: any[] = [];
  
  // Chia nhỏ văn bản thành các khối dựa trên 2 dấu xuống dòng trở lên
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);

  for (let block of blocks) {
    block = block.trim();
    
    // 1. Định dạng: Nội dung chính (Câu hỏi phụ: a. Lựa chọn / b. Lựa chọn)
    const inlineMatch = block.match(/^([\s\S]+?)\s*\(([\s\S]+)\)$/);
    if (inlineMatch) {
      const mainPart = inlineMatch[1].trim();
      const contentInside = inlineMatch[2].trim();
      
      // Tìm vị trí của lựa chọn 'a.' hoặc 'A.' đầu tiên
      const optionStartMatch = contentInside.match(/\b[a-dA-D][.)]\s/);
      
      let subQuestion = "";
      let optionsPart = contentInside;

      if (optionStartMatch && optionStartMatch.index !== undefined) {
        subQuestion = contentInside.substring(0, optionStartMatch.index).trim();
        optionsPart = contentInside.substring(optionStartMatch.index);
      }
      
      const fullQuestion = subQuestion ? `${mainPart} ${subQuestion}` : mainPart;
      
      // Tách options dựa trên dấu '/' hoặc dòng mới
      const optionsRaw = optionsPart.split(/[\/\n|]/);
      const options: string[] = [];
      let correctAnswer = "";
      let isAnswerGuessed = true;

      optionsRaw.forEach((opt) => {
        let cleanOpt = opt.trim();
        if (!cleanOpt) return;

        const isMarked = cleanOpt.startsWith('*');
        if (isMarked) {
          cleanOpt = cleanOpt.substring(1).trim();
          isAnswerGuessed = false;
        }

        // Xóa ký hiệu a. b. c. ở đầu
        cleanOpt = cleanOpt.replace(/^[a-zA-Z0-9][.)]\s*/, '').trim();
        
        if (cleanOpt) {
          options.push(cleanOpt);
          if (isMarked) correctAnswer = cleanOpt;
        }
      });

      if (options.length >= 2) {
        questions.push({
          type: 'multiple-choice',
          question: fullQuestion,
          options,
          correctAnswer: correctAnswer || options[0],
          isAnswerGuessed,
          explanation: "Được bóc tách tự động từ định dạng đóng ngoặc."
        });
        continue;
      }
    }

    // 2. Định dạng: Danh sách câu hỏi nhiều dòng (Block Format)
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length >= 2) {
      const optionStartIndex = lines.findIndex(l => /^[a-dA-D][.)]\s/.test(l));
      
      if (optionStartIndex !== -1) {
        const questionText = lines.slice(0, optionStartIndex).join(' ');
        const optionsRaw = lines.slice(optionStartIndex);
        const options: string[] = [];
        let correctAnswer = "";
        let isAnswerGuessed = true;

        optionsRaw.forEach(line => {
          let cleanLine = line.trim();
          const isMarked = cleanLine.includes('*');
          if (isMarked) {
            cleanLine = cleanLine.replace('*', '').trim();
            isAnswerGuessed = false;
          }
          const optText = cleanLine.replace(/^[a-zA-Z0-9][.)]\s*/, '').trim();
          if (optText) {
            options.push(optText);
            if (isMarked) correctAnswer = optText;
          }
        });

        if (options.length >= 2) {
          questions.push({
            type: 'multiple-choice',
            question: questionText.replace(/^\d+[.)]\s*/, ''),
            options,
            correctAnswer: correctAnswer || options[0],
            isAnswerGuessed,
            explanation: "Được bóc tách tự động từ định dạng danh sách."
          });
        }
      }
    }
  }

  return {
    quizTitle: customTitle || "Bài tập bóc tách tự động",
    questions
  };
}
