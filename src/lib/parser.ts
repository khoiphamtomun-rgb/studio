
import { Quiz, QuizQuestion } from "./types";

/**
 * Bộ bóc tách văn bản nâng cao:
 * 1. Nhận diện tiêu đề (dòng ngắn).
 * 2. Phân tách Câu hỏi và Bảng đáp án.
 * 3. Khớp đáp án theo tiêu đề (trùng >= 3 từ) hoặc thứ tự xuất hiện.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const lines = text.split('\n');
  const sections: { title: string; content: string[] }[] = [];
  const answerKeyBlocks: { title: string; keys: Record<number, string> }[] = [];
  
  let currentTitle = customTitle || "";
  let currentLines: string[] = [];

  // Bước 1: Chia văn bản thành các Section dựa trên tiêu đề (dòng ngắn)
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const words = trimmed.split(/\s+/);
    // Tiêu đề: dòng ngắn (1-5 từ) và không bắt đầu bằng số thứ tự câu hỏi
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

  // Bước 2: Phân loại Section nào là "Câu hỏi", Section nào là "Bảng đáp án"
  const questionSections: typeof sections = [];
  const answerKeyRegex = /(\d+)\s*[-.)\s:]+\s*([^\s,;]+)/g;

  sections.forEach(section => {
    const contentStr = section.content.join(' ');
    const keyMatches = contentStr.match(answerKeyRegex);
    
    // Nếu tiêu đề chứa từ khóa đáp án HOẶC nội dung chủ yếu là các cặp số-chữ
    const isAnswerBlock = 
      /đáp án|answer|key|giải/i.test(section.title) || 
      (keyMatches && keyMatches.length >= 3 && contentStr.length < keyMatches.length * 60);

    if (isAnswerBlock) {
      const keys: Record<number, string> = {};
      let match;
      while ((match = answerKeyRegex.exec(contentStr)) !== null) {
        keys[parseInt(match[1])] = match[2].toLowerCase().trim();
      }
      answerKeyBlocks.push({ title: section.title, keys });
    } else {
      questionSections.push(section);
    }
  });

  // Bước 3: Xử lý Câu hỏi và Khớp với Bảng đáp án
  const questions: QuizQuestion[] = [];
  let exerciseCounter = 0;

  questionSections.forEach(section => {
    // Tìm bảng đáp án khớp tiêu đề (Fuzzy matching)
    const titleWords = section.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let matchedKeySet = answerKeyBlocks.find(ak => {
      const akWords = ak.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const intersection = titleWords.filter(w => akWords.includes(w));
      return intersection.length >= 3 || (titleWords.length > 0 && section.title.toLowerCase() === ak.title.toLowerCase());
    });

    const blockContent = section.content.join('\n');
    const clozePattern = /\((\d+)\)\s*([._]{2,}|\[.*?\])/g;
    const allClozeMatches = Array.from(blockContent.matchAll(clozePattern));

    if (allClozeMatches.length > 0) {
      // Xử lý Cloze Test (Nhận diện reset số 1 trong cùng 1 section)
      let currentBlanks: { index: number; matchText: string }[] = [];
      let lastNum = -1;
      let subStartIdx = 0;

      for (let i = 0; i <= allClozeMatches.length; i++) {
        const m = allClozeMatches[i];
        const num = m ? parseInt(m[1]) : -1;

        if (num <= lastNum || i === allClozeMatches.length) {
          if (currentBlanks.length > 0) {
            // Lấy theo tiêu đề khớp hoặc theo thứ tự xuất hiện của exerciseCounter
            const finalKeySet = matchedKeySet || answerKeyBlocks[exerciseCounter];
            
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
      // Xử lý Trắc nghiệm (Multiple Choice)
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
              const isMarked = optLine.includes('*');
              const cleanOpt = optLine.replace('*', '').replace(/^[a-zA-Z0-9][.)]\s*/, '').trim();
              if (cleanOpt) {
                options.push(cleanOpt);
                if (isMarked) correctAnswer = cleanOpt;
              }
            }
            j++;
          }

          if (options.length >= 2) {
            mcLocalCounter++;
            const finalKeySet = matchedKeySet || answerKeyBlocks[exerciseCounter];
            
            if (!correctAnswer && finalKeySet) {
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
              options: options.map(o => o.replace('*', '').trim()),
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
    quizTitle: customTitle || (questionSections[0]?.title) || "Bài tập SmartAssess",
    questions
  };
}
