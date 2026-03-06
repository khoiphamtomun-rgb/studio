
import { Quiz, QuizQuestion } from "./types";

/**
 * Bộ bóc tách văn bản nâng cao:
 * 1. Nhận diện tiêu đề (dòng ngắn đứng riêng).
 * 2. Phân tách Câu hỏi và Bảng đáp án.
 * 3. Tách bài tập khi số thứ tự reset về 1.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const lines = text.split('\n');
  const sections: { title: string; content: string[] }[] = [];
  const answerKeyBlocks: { title: string; keys: Record<number, string> }[] = [];
  
  let currentTitle = customTitle || "";
  let currentLines: string[] = [];

  // Bước 1: Chia văn bản thành các Section dựa trên tiêu đề (dòng ngắn 1-5 từ)
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const words = trimmed.split(/\s+/);
    // Tiêu đề: dòng ngắn và không bắt đầu bằng số câu (ví dụ: 1. hay (1))
    const isHeader = words.length >= 1 && words.length <= 5 && !/^\(?\d+[.)\s]/.test(trimmed);

    if (isHeader) {
      if (currentLines.length > 0) {
        sections.push({ title: currentTitle || "Bài tập", content: currentLines });
      }
      currentTitle = trimmed;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  });
  if (currentLines.length > 0) {
    sections.push({ title: currentTitle || "Bài tập", content: currentLines });
  }

  // Bước 2: Phân loại khối đáp án (Answers) và khối câu hỏi (Questions)
  const questionSections: typeof sections = [];
  const answerKeyRegex = /(\d+)\s*[-.)\s:]+\s*([^\s,;]+)/g;

  sections.forEach(section => {
    const contentStr = section.content.join(' ');
    const keyMatches = contentStr.match(answerKeyRegex);
    
    // Nếu tiêu đề có chữ "Đáp án" hoặc nội dung là các cặp số-chữ dày đặc
    const isAnswerBlock = 
      /đáp án|answer|key|giải/i.test(section.title) || 
      (keyMatches && keyMatches.length >= 3 && contentStr.length < keyMatches.length * 60);

    if (isAnswerBlock) {
      // Tách khối đáp án nếu nó reset về 1 bên trong (nhiều bộ đáp án dán liền nhau)
      let currentKeys: Record<number, string> = {};
      let lastNum = -1;
      let match;
      
      while ((match = answerKeyRegex.exec(contentStr)) !== null) {
        const num = parseInt(match[1]);
        const val = match[2].toLowerCase().trim();
        
        if (num <= lastNum && Object.keys(currentKeys).length > 0) {
          answerKeyBlocks.push({ title: section.title, keys: currentKeys });
          currentKeys = {};
        }
        currentKeys[num] = val;
        lastNum = num;
      }
      if (Object.keys(currentKeys).length > 0) {
        answerKeyBlocks.push({ title: section.title, keys: currentKeys });
      }
    } else {
      questionSections.push(section);
    }
  });

  // Bước 3: Xử lý Câu hỏi và Khớp đáp án theo thứ tự Exercises
  const questions: QuizQuestion[] = [];
  let exerciseCounter = 0;

  questionSections.forEach(section => {
    const blockContent = section.content.join('\n');
    // Regex tìm ô trống (1) ..... hoặc (1) [blank]
    const clozePattern = /\((\d+)\)\s*([._]{2,}|\[.*?\])/g;
    const allClozeMatches = Array.from(blockContent.matchAll(clozePattern));

    if (allClozeMatches.length > 0) {
      // Xử lý Cloze: Tách bài nếu số thứ tự reset về 1
      let currentBlanks: { index: number; matchText: string }[] = [];
      let lastNum = -1;
      let subStartIdx = 0;

      for (let i = 0; i <= allClozeMatches.length; i++) {
        const m = allClozeMatches[i];
        const num = m ? parseInt(m[1]) : -1;

        if (num <= lastNum || i === allClozeMatches.length) {
          if (currentBlanks.length > 0) {
            // Khớp với bộ đáp án thứ N
            const finalKeySet = answerKeyBlocks[exerciseCounter];
            
            const startCharIdx = subStartIdx === 0 ? 0 : allClozeMatches[subStartIdx - 1].index + allClozeMatches[subStartIdx - 1][0].length;
            const endCharIdx = i === allClozeMatches.length ? blockContent.length : m.index;
            
            let passage = blockContent.substring(startCharIdx, endCharIdx).trim();
            const blanks = currentBlanks.map(b => {
              passage = passage.replace(b.matchText, `[[BLANK_${b.index}]]`);
              return { index: b.index, correctAnswer: finalKeySet?.keys[b.index] || "" };
            });

            questions.push({
              type: 'cloze',
              question: passage,
              blanks,
              explanation: section.title
            });
            exerciseCounter++;
          }
          currentBlanks = [];
          subStartIdx = i;
        }

        if (m) {
          currentBlanks.push({ index: num, matchText: m[0] });
          lastNum = num;
        }
      }
    } else {
      // Xử lý Trắc nghiệm (giữ nguyên logic cũ nhưng cải thiện khớp đáp án)
      const lines = section.content;
      const optionPattern = /^[a-dA-D][.)]\s/;
      
      let i = 0;
      let mcLocalCounter = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        if (line && !optionPattern.test(line)) {
          const options: string[] = [];
          let correctAnswer = "";
          let j = i + 1;
          
          while (j < lines.length && (optionPattern.test(lines[j].trim()) || !lines[j].trim())) {
            const optLine = lines[j].trim();
            if (optLine) {
              const cleanOpt = optLine.replace(/^[a-zA-Z0-9][.)]\s*/, '').replace('*', '').trim();
              if (cleanOpt) options.push(cleanOpt);
            }
            j++;
          }

          if (options.length >= 2) {
            mcLocalCounter++;
            const finalKeySet = answerKeyBlocks[exerciseCounter];
            if (finalKeySet) {
              const keyVal = finalKeySet.keys[mcLocalCounter];
              if (keyVal) {
                if (keyVal.length === 1 && /^[a-d]$/i.test(keyVal)) {
                  const idx = keyVal.toLowerCase().charCodeAt(0) - 97;
                  if (options[idx]) correctAnswer = options[idx];
                } else {
                  correctAnswer = keyVal;
                }
              }
            }

            questions.push({
              type: 'multiple-choice',
              question: line.replace(/^\d+[.)]\s*/, ''),
              options,
              correctAnswer,
              explanation: section.title
            });
            i = j - 1;
          }
        }
        i++;
      }
      if (mcLocalCounter > 0) exerciseCounter++;
    }
  });

  return {
    quizTitle: customTitle || (sections[0]?.title) || "Bài tập SmartAssess",
    questions
  };
}
