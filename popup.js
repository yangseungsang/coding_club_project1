document.addEventListener('DOMContentLoaded', () => {
  const targetUrlInput = document.getElementById('target-url');
  const saveUrlButton = document.getElementById('save-url');
  const urlStatus = document.getElementById('url-status');
  const refreshDataButton = document.getElementById('refresh-data');
  const attendanceChart = document.getElementById('attendance-chart');
  
  // chart 변수 선언
  let chart = null;
  
  // 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
      }
      body {
        min-width: 600px;
        box-sizing: border-box;
        overflow-y: auto;
        overflow-x: hidden;
      }
      .container {
        width: 100%;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding: 10px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        min-height: 40px;
      }
      .header h1 {
        margin: 0;
        font-size: 1.2em;
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
      }
      #refresh-data {
        padding: 4px 8px;
        font-size: 0.9em;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        margin-left: auto;
      }
      #refresh-data:hover {
        background-color: #e0e0e0;
      }
      .url-section {
        display: flex;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        position: sticky;
        top: 0;
        background: white;
        padding: 5px 0;
        z-index: 100;
        min-height: 40px;
      }
      .url-section label {
        white-space: nowrap;
        min-width: 80px;
      }
      .url-input-container {
        display: flex;
        flex: 1;
        min-width: 0;
      }
      #target-url {
        flex: 1;
        min-width: 0;
      }
      #save-url {
        white-space: nowrap;
        min-width: 60px;
      }
      #url-status {
        margin: 0;
        white-space: nowrap;
        min-width: 120px;
      }
      .chart-container {
        width: 100%;
        height: 300px;
        position: relative;
        box-sizing: border-box;
        min-height: 300px;
      }
      .tables-container {
        display: flex;
        gap: 10px;
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 10px;
      }
      .table-wrapper {
        flex: 1;
        min-width: 0;
        box-sizing: border-box;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      th, td {
        padding: 6px;
        text-align: left;
        border: 1px solid #ddd;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      th {
        background-color: #f5f5f5;
        position: sticky;
        top: 0;
      }
  `;
  document.head.appendChild(style);
  
  // 컨테이너 구조 수정
  const container = document.createElement('div');
  container.className = 'container';
  
  // 헤더 생성
  const header = document.createElement('div');
  header.className = 'header';
  
  // 타이틀과 새로고침 버튼을 헤더에 추가
  const title = document.querySelector('h1');
  const refreshButton = document.getElementById('refresh-data');
  if (title) header.appendChild(title);
  if (refreshButton) header.appendChild(refreshButton);
  
  // 기존 요소들을 컨테이너로 이동
  while (document.body.firstChild) {
    if (document.body.firstChild !== title && document.body.firstChild !== refreshButton) {
      container.appendChild(document.body.firstChild);
    }
  }
  
  // 헤더를 컨테이너의 맨 앞에 추가
  container.insertBefore(header, container.firstChild);
  document.body.appendChild(container);
  
  // URL 저장
  saveUrlButton.addEventListener('click', () => {
    const url = targetUrlInput.value.trim();
    if (!url) {
      urlStatus.textContent = '유효한 URL을 입력해주세요.';
      urlStatus.style.color = '#e74c3c';
      return;
    }
    
    chrome.storage.sync.set({ targetUrl: url }, () => {
      urlStatus.textContent = 'URL이 저장되었습니다.';
      urlStatus.style.color = '#27ae60';
    });
  });
  
  // 저장된 URL 불러오기
  chrome.storage.sync.get('targetUrl', (data) => {
    if (data.targetUrl) {
      targetUrlInput.value = data.targetUrl;
    }
  });
  
  // 데이터 새로고침
  refreshDataButton.addEventListener('click', fetchAndAnalyzeData);
  
  // 처음 팝업이 열릴 때 데이터 자동 새로고침
  fetchAndAnalyzeData();
  
  // content script로부터 메시지 받기
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'commentDataCollected') {
      analyzeComments(message.data);
      sendResponse({ success: true });
    }
    return true; // 비동기 응답 사용
  });
  
  // 데이터 가져오기 및 분석
  function fetchAndAnalyzeData() {
    chrome.storage.sync.get('targetUrl', (data) => {
      if (!data.targetUrl) {
        urlStatus.textContent = '분석할 URL을 먼저 저장해주세요.';
        urlStatus.style.color = '#e74c3c';
        return;
      }
      urlStatus.textContent = '데이터를 가져오는 중...';
      urlStatus.style.color = '#3498db';

      // URL에서 직접 데이터 가져오기
      fetch(data.targetUrl)
        .then(response => response.text())
        .then(html => {
          // HTML 파싱
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          // 댓글 데이터 수집
          const comments = [];
          
          // 댓글 데이터가 없을 경우 테이블에서 추출 시도
          if (comments.length === 0) {
            const tables = doc.querySelectorAll('table');
            tables.forEach(table => {
              const rows = table.querySelectorAll('tr');
              // 첫 번째 행은 헤더일 수 있으므로 건너뜀
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll('td');
                
                if (cells.length >= 2) {
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
          
          if (comments.length > 0) {
            // 댓글 분석 및 차트 업데이트
            analyzeComments(comments);
            urlStatus.textContent = `${comments.length}개의 댓글 분석 완료!`;
            urlStatus.style.color = '#27ae60';
          } else {
            urlStatus.textContent = '댓글을 찾을 수 없습니다.';
            urlStatus.style.color = '#e74c3c';
          }
        })
        .catch(error => {
          console.error('데이터 가져오기 실패:', error);
          urlStatus.textContent = '데이터를 가져오는 중 오류가 발생했습니다.';
          urlStatus.style.color = '#e74c3c';
        });
    });
  }
  
  // 댓글 분석
  function analyzeComments(comments) {
    console.log('댓글 분석 시작. 댓글 수:', comments.length);
    const attendees = new Map(); // 참석자: Map<이름, {시간, 상태}>
    
    // 각 댓글 분석
    comments.forEach((comment, index) => {
      console.log(`댓글 ${index + 1} 분석:`, comment);
      const { name, time, content } = comment;
      
      // 참석자 목록에서 찾기
      const attendPattern = /@참석\s+([^@]+)/g;
      const cancelPattern = /@취소\s+([^@]+)/g;
      
      // 참석자 추출
      let attendMatches;
      while ((attendMatches = attendPattern.exec(content)) !== null) {
        const names = attendMatches[1].split(',').map(n => n.trim()).filter(n => n);
        console.log('참석 패턴 매치:', names);
        
        names.forEach(attendeeName => {
          // 자신이 작성한 경우, 작성자 이름을 사용
          if (attendeeName === '본인' || attendeeName === '저' || attendeeName === '나') {
            attendeeName = name;
          }
          
          // 이미 등록된 참석자인 경우 업데이트, 아니면 추가
          attendees.set(attendeeName, { time, status: '참석' });
        });
      }
      
      // 취소 추출
      let cancelMatches;
      while ((cancelMatches = cancelPattern.exec(content)) !== null) {
        const names = cancelMatches[1].split(',').map(n => n.trim()).filter(n => n);
        console.log('취소 패턴 매치:', names);
        
        names.forEach(cancelName => {
          // 자신이 작성한 경우, 작성자 이름을 사용
          if (cancelName === '본인' || cancelName === '저' || cancelName === '나') {
            cancelName = name;
          }
          
          // 취소로 상태 업데이트
          attendees.set(cancelName, { time, status: '취소' });
        });
      }
      
      // 특별한 패턴이 없는 경우, 작성자를 참석으로 간주
      if (!content.includes('@참석') && !content.includes('@취소')) {
        if (content.includes('참석') || content.includes('참가')) {
          console.log('일반 텍스트에서 참석 단어 발견:', name);
          attendees.set(name, { time, status: '참석' });
        }
      }
    });
    
    // 참석자 상태별로 분류
    const attending = [];
    const notAttending = [];
    
    attendees.forEach((info, name) => {
      if (info.status === '참석') {
        attending.push({ name, time: info.time });
      } else if (info.status === '취소') {
        notAttending.push({ name, time: info.time });
      }
    });
    
    console.log('분석 결과 - 참석자:', attending.length, '명, 불참자:', notAttending.length, '명');
    console.log('참석자 명단:', attending);
    console.log('불참자 명단:', notAttending);
    
    // 테이블 업데이트
    updateTable('attend-list', attending);
    updateTable('absent-list', notAttending);
    
    // 차트 업데이트
    updateChart(attending.length, notAttending.length);
  }
  
  // 테이블 업데이트
  function updateTable(tableId, data) {
    console.log(`테이블 ${tableId} 업데이트:`, data);
    const tableBody = document.querySelector(`#${tableId} tbody`);
    if (!tableBody) {
      console.error(`테이블 요소를 찾을 수 없음: #${tableId} tbody`);
      return;
    }
    
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 2;
      emptyCell.textContent = '데이터가 없습니다.';
      emptyCell.style.textAlign = 'center';
      emptyRow.appendChild(emptyCell);
      tableBody.appendChild(emptyRow);
      return;
    }
    
    data.forEach(item => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.textContent = item.name;
      
      const timeCell = document.createElement('td');
      timeCell.textContent = item.time;
      
      row.appendChild(nameCell);
      row.appendChild(timeCell);
      
      tableBody.appendChild(row);
    });
  }
  
  // 차트 업데이트 - 수평 바차트로 변경
  function updateChart(attendingCount, notAttendingCount) {
    console.log('차트 업데이트 시도:', attendingCount, notAttendingCount);
    const canvas = document.getElementById('attendance-chart');
    const debugEl = document.getElementById('chart-debug');
    
    // 디버깅 정보 표시
    // debugEl.style.display = 'block';
    debugEl.textContent = `차트 데이터: 참석 ${attendingCount}명, 불참 ${notAttendingCount}명`;
    
    if (!canvas) {
      console.error('차트 캔버스 요소를 찾을 수 없음: #attendance-chart');
      debugEl.textContent += ' - 캔버스 요소 없음!';
      return;
    }
    
    // 예외 처리: 데이터가 모두 0인 경우
    if (attendingCount === 0 && notAttendingCount === 0) {
      console.log('차트 데이터가 없어 기본 데이터로 설정');
      attendingCount = 1; // 기본값 설정
      debugEl.textContent += ' (기본값으로 설정됨)';
    }
    
    // Chart.js 사용 시도
    if (typeof Chart === 'undefined') {
      console.error('Chart.js 라이브러리를 찾을 수 없습니다');
      debugEl.textContent += ' - Chart.js 로드 안됨!';
      return;
    }
    
    try {
      // 이전 차트가 있으면 제거
      if (chart) {
        try {
          chart.destroy();
          console.log('이전 차트 제거됨');
        } catch (e) {
          console.error('차트 제거 중 오류:', e);
          debugEl.textContent += ' - 차트 제거 오류!';
        }
      }
      
      // 캔버스 컨텍스트 가져오기
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('캔버스 컨텍스트를 가져올 수 없습니다');
        debugEl.textContent += ' - 캔버스 컨텍스트 오류!';
        return;
      }
      
      // 수평 바차트 생성
      chart = new Chart(ctx, {
        type: 'bar', // 수평 바차트
        data: {
          labels: ['참석 상태'],
          datasets: [
            {
              label: '참석',
              data: [attendingCount],
              backgroundColor: 'rgba(46, 204, 113, 0.8)',
              borderColor: 'rgba(39, 174, 96, 1.0)',
              borderWidth: 1,
              barPercentage: 0.8,
              categoryPercentage: 0.9
            },
            {
              label: '불참',
              data: [notAttendingCount],
              backgroundColor: 'rgba(231, 76, 60, 0.8)',
              borderColor: 'rgba(192, 57, 43, 1.0)',
              borderWidth: 1,
              barPercentage: 0.8,
              categoryPercentage: 0.9
            }
          ]
        },
        options: {
          indexAxis: 'y', // 수평 방향 바차트로 설정
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              left: 10,
              right: 25,
              top: 20,
              bottom: 10
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              ticks: {
                precision: 0
              }
            },
            y: {
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 10,
                boxHeight: 10,
                padding: 20,
                font: {
                  size: 14,
                  family: "'Noto Sans KR', sans-serif"
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.parsed.x;
                  const total = attendingCount + notAttendingCount;
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value}명 (${percentage}%)`;
                }
              },
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: 10,
              cornerRadius: 6,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 14
              }
            },
            // 총인원 표시 텍스트
            title: {
              display: true,
              text: `총 ${attendingCount + notAttendingCount}명`,
              color: '#333',
              font: {
                size: 16,
                weight: 'bold',
                family: "'Noto Sans KR', sans-serif"
              },
              padding: {
                top: 10,
                bottom: 20
              }
            }
          },
          // 바차트 애니메이션
          animation: {
            duration: 1000,
            easing: 'easeOutQuad'
          }
        }
      });
      
      console.log('Chart.js로 수평 바차트 생성 완료');
      debugEl.textContent += ' - 차트 생성 성공!';
    } catch (error) {
      console.error('Chart.js 사용 중 오류:', error);
      debugEl.textContent += ` - Chart.js 오류: ${error.message}`;
    }
  }
}); 