
import { Quiz } from "./types";

/**
 * Hàm bóc tách văn bản theo quy tắc cố định.
 * Định dạng hỗ trợ: Câu hỏi (a. Lựa chọn 1 / b. Lựa chọn 2 / c. Lựa chọn 3)
 */
export function parseFixedFormat(text: string): Quiz {
  // Regex tìm kiếm các đoạn có dạng: Nội dung (a. ... / b. ... / c. ...)
  const itemRegex = /([^()]+?)\s*\(([^)]+)\)/g;
  const questions: any[] = [];
  
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const qText = match[1].trim();
    const optionsPart = match[2];
    
    // Tách các lựa chọn bằng dấu gạch chéo / hoặc dấu sổ đứng |
    const optionsRaw = optionsPart.split(/[\\/|]/);
    const options: string[] = [];
    let correctAnswer = "";

    optionsRaw.forEach((opt, index) => {
      let cleanOpt = opt.trim();
      
      // Kiểm tra nếu đáp án được đánh dấu bằng dấu * (ví dụ: *b. Answer)
      const isMarked = cleanOpt.startsWith('*');
      if (isMarked) {
        cleanOpt = cleanOpt.substring(1).trim();
      }
      
      // Loại bỏ tiền tố như a., b., 1., 2. ở đầu mỗi option
      cleanOpt = cleanOpt.replace(/^[a-z0-9][.)]\s*/i, '').trim();
      
      if (cleanOpt) {
        options.push(cleanOpt);
        // Nếu có đánh dấu * thì chọn làm đáp án đúng, nếu không mặc định là câu đầu tiên (cho đến khi người dùng sửa)
        if (isMarked) {
          correctAnswer = cleanOpt;
        }
      }
    });

    if (options.length > 0) {
      questions.push({
        type: 'multiple-choice',
        question: qText,
        options,
        correctAnswer: correctAnswer || options[0],
        explanation: "Câu hỏi này được hệ thống tự động bóc tách từ định dạng văn bản cố định."
      });
    }
  }

  return {
    quizTitle: "Bài tập trích xuất thủ công",
    questions
  };
}
