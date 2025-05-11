// 메인 기능은 popup.js에 구현되어 있으며, content.js는 최소한의 코드만 포함합니다.

// 페이지 구조 분석을 위한 디버깅 정보 수집
try {
  // 테이블 구조 확인
  const tables = document.querySelectorAll('table');
  console.log(`페이지 내 테이블 수: ${tables.length}`);

  if (tables.length > 0) {
    // 각 테이블 분석
    tables.forEach((table, index) => {
      const rows = table.querySelectorAll('tr');
      console.log(`테이블 #${index + 1}: ${rows.length}개 행 발견`);
      
      if (rows.length > 0) {
        const firstRow = rows[0];
        const headers = firstRow.querySelectorAll('th');
        const cells = firstRow.querySelectorAll('td');
        console.log(`- 첫 번째 행: ${headers.length}개 헤더, ${cells.length}개 셀`);
        
        // 헤더 텍스트 확인
        if (headers.length > 0) {
          const headerTexts = Array.from(headers).map(h => h.textContent.trim());
          console.log(`- 헤더: ${headerTexts.join(' | ')}`);
        }
      }
    });
  } else {
    console.log('테이블 태그를 찾을 수 없습니다.');
    
    // 댓글 관련 요소 찾기
    const commentElements = document.querySelectorAll('.comment, .reply, [class*="comment"], [id*="comment"]');
    console.log(`댓글 관련 요소 수: ${commentElements.length}`);
  }
  
  // 페이지의 전체 HTML 구조 요약 출력
  console.log('페이지 구조 요약:');
  const bodyChildren = document.body.children;
  Array.from(bodyChildren).forEach((child, index) => {
    if (index < 10) { // 처음 10개 요소만 표시
      console.log(`- ${child.tagName}: class="${child.className}", id="${child.id}"`);
    }
  });
  
} catch (error) {
  console.error('콘텐츠 스크립트 분석 중 오류:', error);
}

// 댓글 데이터 수집 함수
function collectCommentData() {
  try {
    console.log('댓글 데이터 수집 시작');
    const comments = [];
    
    // 페이지 분석을 통해 댓글 요소 찾기
    const commentElements = document.querySelectorAll('.comment, .reply, [class*="comment"], [id*="comment"], .post');
    
    console.log(`발견된 댓글 관련 요소 수: ${commentElements.length}`);
    
    // 각 댓글 요소에서 데이터 추출
    commentElements.forEach((element, index) => {
      if (index > 50) return; // 처음 50개만 처리
      
      // 댓글 작성자 이름 추출
      let name = '';
      const nameElement = element.querySelector('.author, .name, .writer, [class*="author"], [class*="name"], [class*="writer"], strong');
      if (nameElement) {
        name = nameElement.textContent.trim();
      }
      
      // 댓글 작성 시간 추출
      let time = '';
      const timeElement = element.querySelector('.time, .date, [class*="time"], [class*="date"]');
      if (timeElement) {
        time = timeElement.textContent.trim();
      }
      
      // 댓글 내용 추출
      let content = '';
      const contentElement = element.querySelector('.content, .text, .body, [class*="content"], [class*="text"], [class*="body"], p');
      if (contentElement) {
        content = contentElement.textContent.trim();
      }
      
      // 유효한 데이터가 있을 경우에만 추가
      if (name && (content || time)) {
        comments.push({ name, time, content });
        console.log(`댓글 ${index + 1} 추출: ${name}, ${time.substring(0, 10)}...`);
      }
    });
    
    // 댓글 데이터가 없을 경우 테이블에서 추출 시도
    if (comments.length === 0) {
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        // 첫 번째 행은 헤더일 수 있으므로 건너뜀
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll('td');
          
          if (cells.length >= 2) {
            // 테이블 구조에 따라 이름과 내용을 추출
            const name = cells[0]?.textContent.trim() || '이름 없음';
            const content = cells[cells.length - 1]?.textContent.trim() || '';
            const time = cells[1]?.textContent.trim() || new Date().toLocaleDateString();
            
            if (name && content) {
              comments.push({ name, time, content });
            }
          }
        }
      });
    }
    
    console.log(`최종 수집된 댓글 수: ${comments.length}`);
    
    // 수집된 데이터를 popup.js로 전송
    chrome.runtime.sendMessage({
      action: 'commentDataCollected',
      data: comments
    });
    
    return comments;
  } catch (error) {
    console.error('댓글 데이터 수집 중 오류:', error);
    return [];
  }
}

// 페이지 로드 완료 시 댓글 데이터 수집
window.addEventListener('load', () => {
  setTimeout(collectCommentData, 1000); // 페이지가 완전히 로드된 후 1초 후에 실행
});

// 메시지 수신 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collectComments') {
    const comments = collectCommentData();
    sendResponse({ success: true, count: comments.length });
    return true; // 비동기 응답 사용
  }
}); 