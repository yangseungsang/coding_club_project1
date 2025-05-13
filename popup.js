// 행사 참석 분석기 - 메인 코드
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== 팝업 초기화 시작 ===');
  
  // ============================
  // 모듈 정의
  // ============================
  
  // 디버깅 모듈
  const DebugModule = (() => {
    const isDebugMode = true; // 디버그 모드 활성화 여부
    const logHistory = []; // 로그 기록
    let isDebugVisible = false; // 디버그 창 표시 상태
    
    // 디버그 로그 출력 함수
    function log(...args) {
      if (!isDebugMode) return;
      
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      // 콘솔에 로그 출력
      console.log(`[${timeString}]`, ...args);
      
      // 로그 문자열 생성
      const logMessage = `[${timeString}] ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
      ).join(' ')}`;
      
      // 로그 기록에 추가
      logHistory.push(logMessage);
      
      // 최대 로그 수 제한 (최신 100개만 유지)
      if (logHistory.length > 100) {
        logHistory.shift();
      }
      
      // UI에 로그 표시
      updateDebugUI();
    }
    
    // 디버그 UI 업데이트
    function updateDebugUI() {
      const debugElement = document.getElementById('debug-log');
      if (!debugElement) return;
      
      debugElement.textContent = logHistory.join('\n');
      
      // 자동 스크롤
      debugElement.scrollTop = debugElement.scrollHeight;
      
      // 디버그 로그 영역 표시
      debugElement.style.display = isDebugVisible ? 'block' : 'none';
    }
    
    // 디버그 창 상태 저장
    async function saveDebugState() {
      try {
        await StorageModule.saveData('debugVisible', isDebugVisible);
        DebugModule.log('디버그 창 상태 저장:', isDebugVisible);
      } catch (error) {
        console.error('디버그 창 상태 저장 실패:', error);
      }
    }
    
    // 디버그 창 상태 복원
    async function loadDebugState() {
      try {
        const savedState = await StorageModule.loadData('debugVisible');
        if (savedState !== undefined) {
          isDebugVisible = savedState;
          DebugModule.log('디버그 창 상태 복원:', isDebugVisible);
        }
      } catch (error) {
        console.error('디버그 창 상태 복원 실패:', error);
      }
    }
    
    // 초기화 함수
    async function initialize() {
      log('디버그 모듈 초기화 시작');
      
      // 저장된 디버그 창 상태 로드
      await loadDebugState();
      
      // 디버그 로그 토글 버튼 추가
      const container = document.querySelector('.container');
      if (container) {
        const toggleButton = document.createElement('button');
        toggleButton.textContent = isDebugVisible ? '디버그 로그 숨기기' : '디버그 로그 표시';
        toggleButton.style.marginTop = '10px';
        toggleButton.style.fontSize = '12px';
        toggleButton.style.padding = '4px 8px';
        
        toggleButton.addEventListener('click', async () => {
          const debugElement = document.getElementById('debug-log');
          if (debugElement) {
            isDebugVisible = !isDebugVisible;
            debugElement.style.display = isDebugVisible ? 'block' : 'none';
            toggleButton.textContent = isDebugVisible ? '디버그 로그 숨기기' : '디버그 로그 표시';
            
            // 상태 저장
            await saveDebugState();
          }
        });
        
        container.appendChild(toggleButton);
      }
      
      // 초기 상태 적용
      updateDebugUI();
      
      log('디버그 모듈 초기화 완료');
      return true;
    }
    
    return {
      log,
      initialize
    };
  })();
  
  // 스토리지 모듈
  const StorageModule = (() => {
    // 데이터 저장 함수 (실패 시 재시도 로직 포함)
    function saveData(key, data, maxRetries = 3) {
      return new Promise((resolve, reject) => {
        let retries = 0;
        
        function attemptSave() {
          DebugModule.log(`${key} 저장 시도 (시도 ${retries + 1}/${maxRetries})`, data);
          
          chrome.storage.sync.set({ [key]: data }, () => {
            if (chrome.runtime.lastError) {
              DebugModule.log(`${key} 저장 실패:`, chrome.runtime.lastError);
              retries++;
              if (retries < maxRetries) {
                setTimeout(attemptSave, 300);
              } else {
                reject(chrome.runtime.lastError);
              }
            } else {
              DebugModule.log(`${key} 저장 성공`);
              resolve();
            }
          });
        }
        
        attemptSave();
      });
    }
    
    // 데이터 로드 함수
    function loadData(key) {
      return new Promise((resolve, reject) => {
        DebugModule.log(`${key} 로드 시도`);
        
        chrome.storage.sync.get(key, (result) => {
          if (chrome.runtime.lastError) {
            DebugModule.log(`${key} 로드 실패:`, chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            DebugModule.log(`${key} 로드 성공:`, result[key]);
            resolve(result[key]);
          }
        });
      });
    }
    
    // 초기화 함수
    async function initialize() {
      DebugModule.log('스토리지 모듈 초기화 시작');
      
      try {
        // 저장된 URL 로드
        const savedUrl = await loadData('targetUrl');
        if (savedUrl) {
          DebugModule.log('저장된 URL 로드 성공:', savedUrl);
        } else {
          DebugModule.log('저장된 URL이 없습니다.');
        }
        
        DebugModule.log('스토리지 모듈 초기화 완료');
      } catch (error) {
        DebugModule.log('스토리지 모듈 초기화 실패:', error);
      }
    }
    
    return {
      saveData,
      loadData,
      initialize
    };
  })();
  
  // UI 모듈
  const UIModule = (() => {
    // DOM 요소 참조
    const elements = {
      targetUrlInput: document.getElementById('target-url'),
      saveUrlButton: document.getElementById('save-url'),
      refreshDataButton: document.getElementById('refresh-data'),
      statusMessage: document.getElementById('status-message'),
      dateCheckboxGroup: document.getElementById('date-filter-container'),
      attendTable: document.getElementById('attend-list'),
      absentTable: document.getElementById('absent-list'),
      chartCanvas: document.getElementById('attendance-chart'),
      clearDatesButton: document.getElementById('clear-dates-btn'),
      debugLog: document.getElementById('debug-log'),
      newDateInput: document.getElementById('new-date-input'),
      addDateButton: document.getElementById('add-date')
    };
    
    // 상태 메시지 표시 함수
    function showStatus(message, isSuccess = true) {
      if (!elements.statusMessage) return;
      
      elements.statusMessage.textContent = message;
      elements.statusMessage.style.color = isSuccess ? '#28a745' : '#dc3545';
      elements.statusMessage.style.display = 'block';
      elements.statusMessage.style.marginBottom = '15px';
      elements.statusMessage.style.padding = '8px';
      elements.statusMessage.style.borderRadius = '4px';
      elements.statusMessage.style.backgroundColor = isSuccess ? '#d4edda' : '#f8d7da';
    }
    
    // 기본 스타일 설정
    function setupStyles() {
      if (!elements.attendTable || !elements.absentTable) return;
      
      // 테이블 기본 스타일 설정
      [elements.attendTable, elements.absentTable].forEach(table => {
        if (!table) return;
        
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';
        
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
          header.style.backgroundColor = '#f2f2f2';
          header.style.padding = '8px';
          header.style.textAlign = 'left';
          header.style.borderBottom = '1px solid #ddd';
        });
      });

      // 날짜 체크박스 컨테이너 스타일 설정
      const dateContainer = document.getElementById('date-filter-container');
      if (dateContainer) {
        dateContainer.style.display = 'grid';
        dateContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        dateContainer.style.gap = '8px';
        dateContainer.style.marginBottom = '15px';
      }

      // 체크박스 아이템 스타일 설정
      const checkboxItems = document.querySelectorAll('.checkbox-item');
      checkboxItems.forEach(item => {
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.padding = '6px';
        item.style.backgroundColor = '#f8f9fa';
        item.style.borderRadius = '4px';
        item.style.width = 'auto';
        item.style.minWidth = '0';
      });

      // 체크박스 스타일 설정
      const checkboxes = document.querySelectorAll('.date-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.style.margin = '0';
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.flexShrink = '0';
      });

      // 삭제 버튼 스타일 설정
      const deleteButtons = document.querySelectorAll('.delete-date-btn');
      deleteButtons.forEach(button => {
        button.style.padding = '2px 6px';
        button.style.fontSize = '12px';
        button.style.backgroundColor = '#dc3545';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '3px';
        button.style.cursor = 'pointer';
        button.style.marginLeft = 'auto';
        button.style.flexShrink = '0';
      });
    }
    
    // 테이블 업데이트 함수
    function updateTable(tableId, data) {
      const table = document.getElementById(tableId);
      if (!table) {
        DebugModule.log(`테이블을 찾을 수 없음: ${tableId}`);
      return;
    }
    
      // 테이블 내용 초기화
      table.innerHTML = `
        <thead>
          <tr>
            <th>날짜</th>
            <th>이름</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      `;
      
      const tbody = table.querySelector('tbody');
      
      // 날짜별로 데이터 그룹화
      const groupedByDate = {};
      data.forEach(item => {
        if (!groupedByDate[item.time]) {
          groupedByDate[item.time] = [];
        }
        groupedByDate[item.time].push(item.name);
      });
      
      // 날짜별로 정렬
      const sortedDates = Object.keys(groupedByDate).sort();
      
      // 각 날짜별로 데이터 추가
      sortedDates.forEach(date => {
        const names = groupedByDate[date];
        const formattedDate = UtilModule.formatDate(date);
        
        // 각 이름을 별도의 행으로 추가
        names.forEach(name => {
          const row = document.createElement('tr');
          
          // 날짜 셀
          const dateCell = document.createElement('td');
          dateCell.textContent = formattedDate;
          row.appendChild(dateCell);
          
          // 이름 셀
          const nameCell = document.createElement('td');
          nameCell.textContent = name;
          row.appendChild(nameCell);
          
          tbody.appendChild(row);
    });
  });
  
      // 테이블 컨테이너 찾기
      const tableContainer = table.closest('.table-container');
      if (tableContainer) {
        // 테이블 제목 찾기 (h3 태그)
        const tableTitle = tableContainer.previousElementSibling;
        if (tableTitle && tableTitle.tagName === 'H3') {
          // 기존 복사 아이콘 제거
          const existingIcon = tableTitle.querySelector('.copy-names-icon');
          if (existingIcon) {
            existingIcon.remove();
          }

          // 복사 아이콘 생성
          const copyIcon = document.createElement('span');
          copyIcon.className = 'copy-names-icon';
          copyIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align: middle; cursor: pointer;">
              <path fill="currentColor" d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          `;
          copyIcon.style.marginLeft = '8px';
          copyIcon.style.opacity = '0.6';
          copyIcon.style.transition = 'opacity 0.2s';
          copyIcon.title = '이름 복사';

          // 호버 효과
          copyIcon.addEventListener('mouseover', () => {
            copyIcon.style.opacity = '1';
          });
          copyIcon.addEventListener('mouseout', () => {
            copyIcon.style.opacity = '0.6';
          });

          // 클릭 이벤트
          copyIcon.addEventListener('click', () => {
            try {
              DebugModule.log('이름 복사 시작');
              
              // tbody에서 모든 행 가져오기
              const rows = tbody.querySelectorAll('tr');
              DebugModule.log('찾은 행 수:', rows.length);
              
              // 날짜별로 이름 그룹화
              const namesByDate = {};
              rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                  const date = cells[0].textContent.trim();
                  const name = cells[1].textContent.trim();
                  if (date && name) {
                    if (!namesByDate[date]) {
                      namesByDate[date] = new Set();
                    }
                    namesByDate[date].add(name);
                    DebugModule.log(`추출된 데이터 - 날짜: ${date}, 이름: ${name}`);
                  }
                }
              });
              
              DebugModule.log('날짜별 이름 그룹:', namesByDate);
              
              if (Object.keys(namesByDate).length === 0) {
                DebugModule.log('추출된 데이터가 없음');
                UIModule.showStatus('복사할 데이터가 없습니다.', false);
        return;
      }
              
              // 날짜별로 정렬된 텍스트 생성
              const sortedDates = Object.keys(namesByDate).sort();
              const formattedText = sortedDates.map(date => {
                const names = Array.from(namesByDate[date]).join(', ');
                return `${date} : ${names}`;
              }).join('\n');
              
              DebugModule.log('복사할 텍스트:', formattedText);
              
              // 클립보드에 복사
              navigator.clipboard.writeText(formattedText)
                .then(() => {
                  DebugModule.log('클립보드 복사 성공');
                  // 복사 성공 시 아이콘 변경
                  const originalIcon = copyIcon.innerHTML;
                  copyIcon.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align: middle; cursor: pointer;">
                      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  `;
                  copyIcon.style.color = '#28a745';
                  
                  // 2초 후 원래 아이콘으로 복귀
                  setTimeout(() => {
                    copyIcon.innerHTML = originalIcon;
                    copyIcon.style.color = '';
                  }, 2000);
                  
                  UIModule.showStatus('이름이 복사되었습니다.');
                })
                .catch(err => {
                  DebugModule.log('클립보드 복사 실패:', err);
                  UIModule.showStatus('이름 복사에 실패했습니다.', false);
                });
            } catch (error) {
              DebugModule.log('이름 복사 중 오류 발생:', error);
              UIModule.showStatus('이름 복사 중 오류가 발생했습니다.', false);
            }
          });

          // 제목에 아이콘 추가
          tableTitle.appendChild(copyIcon);
        }
      }
    }
    
    // 초기화 함수
    function initialize() {
      DebugModule.log('UI 모듈 초기화 시작');
      
      try {
        // 기본 스타일 설정
        setupStyles();
        
        DebugModule.log('UI 모듈 초기화 완료');
        return true;
      } catch (error) {
        DebugModule.log('UI 모듈 초기화 실패:', error);
        return false;
      }
    }
    
    return {
      elements,
      showStatus,
      setupStyles,
      updateTable,
      initialize
    };
  })();
  
  // 차트 모듈
  const ChartModule = (() => {
    let chart = null; // 차트 인스턴스
    
    // 차트 업데이트 함수
    function updateChart(attendanceByDate) {
      DebugModule.log('차트 업데이트 시작');
      DebugModule.log('날짜별 참석 데이터:', attendanceByDate);
      
      // 차트 캔버스 가져오기
      const chartCanvas = UIModule.elements.chartCanvas;
      if (!chartCanvas) {
        DebugModule.log('차트 캔버스를 찾을 수 없음');
        return;
      }
      
      // 날짜 정렬 및 데이터 추출
      const dates = Object.keys(attendanceByDate).sort();
      
      if (dates.length === 0) {
        DebugModule.log('표시할 날짜 데이터 없음');
        
        // 기존 차트 제거
        if (chart) {
          chart.destroy();
          chart = null;
        }
        
        // 빈 차트 표시
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('표시할 데이터가 없습니다', chartCanvas.width / 2, chartCanvas.height / 2);
        return;
      }
      
      // 차트 데이터 생성 - 참석 데이터만 추출
      const attendingData = dates.map(date => attendanceByDate[date].attending);
      
      // 날짜 라벨 포맷 변경 (YYYY-MM-DD -> MM/DD)
      const dateLabels = dates.map(date => {
        try {
          return UtilModule.formatDate(date);
        } catch (e) {
          return date;
        }
      });
      
      DebugModule.log('차트 라벨:', dateLabels);
      DebugModule.log('참석 데이터:', attendingData);
      
      // 차트 설정
      const chartData = {
        labels: dateLabels,
        datasets: [
          {
            label: '참석 인원',
            data: attendingData,
            backgroundColor: 'rgba(46, 204, 113, 0.7)',
            borderColor: 'rgba(39, 174, 96, 1)',
            borderWidth: 1
          }
        ]
      };
      
      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems) {
                const index = tooltipItems[0].dataIndex;
                return dates[index]; // 원본 날짜 표시
              },
              label: function(context) {
                return `참석 인원: ${context.raw}명`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0, // 정수만 표시
              font: {
                size: 11
              }
            },
            title: {
              display: true,
              text: '참석 인원',
              font: {
                size: 12
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 11
              }
            }
          }
        }
      };
      
      // 기존 차트 제거
      if (chart) {
        chart.destroy();
      }
      
      // 새 차트 생성
      try {
        const ctx = chartCanvas.getContext('2d');
        chart = new Chart(ctx, {
          type: 'bar',
          data: chartData,
          options: chartOptions
        });
        
        DebugModule.log('차트 업데이트 완료');
      } catch (error) {
        DebugModule.log('차트 생성 실패:', error);
      }
    }
    
    // 초기화 함수
    function initialize() {
      DebugModule.log('차트 모듈 초기화 시작');
      
      try {
        // 차트 캔버스 크기 설정
        const chartCanvas = UIModule.elements.chartCanvas;
        if (chartCanvas) {
          chartCanvas.height = 250;  // 높이를 180에서 250으로 증가
        }
        
        DebugModule.log('차트 모듈 초기화 완료');
        return true;
      } catch (error) {
        DebugModule.log('차트 모듈 초기화 실패:', error);
        return false;
      }
    }
    
    return {
      updateChart,
      initialize
    };
  })();
  
  // 유틸리티 모듈
  const UtilModule = (() => {
    // 유틸리티 함수 모음
    
    // 날짜 파싱 (예: "5.2" -> "2023-05-02")
    function parseCommentDate(dateStr) {
      DebugModule.log(`날짜 파싱 시작: ${dateStr}`);
      try {
        const numbers = dateStr.match(/\d+/g);
        if (!numbers || numbers.length < 2) throw new Error(`유효하지 않은 날짜 형식: ${dateStr}`);
        const month = parseInt(numbers[0], 10);
        const day = parseInt(numbers[1], 10);
        if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`유효하지 않은 날짜 값: ${dateStr}`);
        const year = new Date().getFullYear();
        // 타임존 문제 없이 직접 포맷팅
        const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        DebugModule.log(`날짜 파싱 성공: ${dateStr} -> ${result}`);
        return result;
      } catch (error) {
        DebugModule.log(`날짜 파싱 실패: ${error.message}`);
        return null;
      }
    }
    
    // 날짜 포맷팅 (예: "2023-05-02" -> "5월 2일")
    function formatDate(dateStr) {
      try {
        const date = new Date(dateStr);
        
        if (isNaN(date.getTime())) {
          throw new Error(`유효하지 않은 날짜: ${dateStr}`);
        }
        
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        return `${month}월 ${day}일`;
      } catch (error) {
        DebugModule.log(`날짜 포맷팅 실패: ${error.message}`);
        return dateStr;
      }
    }
    
    return {
      parseCommentDate,
      formatDate
    };
  })();
  
  // 날짜 필터 모듈
  const DateFilterModule = (() => {
    const checkedDates = new Set(); // 체크된 날짜를 저장하는 Set
    let dateChangeCallback = null; // 날짜 변경 시 호출될 콜백 함수
    
    // 날짜 변경 콜백 설정 함수
    function setDateChangeCallback(callback) {
      dateChangeCallback = callback;
    }
    
    // 체크된 날짜 로깅 함수
    function logCheckedDates() {
      DebugModule.log(`체크된 날짜 세트 크기: ${checkedDates.size}`);
      DebugModule.log('체크된 날짜들:', Array.from(checkedDates));
      
      // DOM 체크박스 상태 확인
      const checkboxes = Array.from(document.querySelectorAll('.date-checkbox'));
      const checkedBoxes = checkboxes.filter(cb => cb.checked);
      DebugModule.log(`현재 DOM에서 체크된 체크박스 수: ${checkedBoxes.length}`);
      DebugModule.log('체크된 체크박스 값들:', checkedBoxes.map(cb => cb.value));
    }
    
    // DOM과 내부 상태 동기화 함수
    function syncWithDOM(logDetails = false) {
      // DOM에서 체크된 체크박스 가져오기
      const checkboxes = Array.from(document.querySelectorAll('.date-checkbox'));
      const checkedBoxes = checkboxes.filter(cb => cb.checked);
      
      if (logDetails) {
        DebugModule.log(`동기화 전 내부 상태의 날짜 수: ${checkedDates.size}`);
        DebugModule.log(`동기화 전 DOM에서 체크된 체크박스 수: ${checkedBoxes.length}`);
      }
      
      // 내부 상태 초기화 및 DOM 기준으로 업데이트
      checkedDates.clear();
      checkedBoxes.forEach(cb => checkedDates.add(cb.value));
      
      if (logDetails) {
        DebugModule.log(`동기화 후 내부 상태의 날짜 수: ${checkedDates.size}`);
        if (checkedDates.size > 0) {
          DebugModule.log('동기화 후 체크된 날짜들:', Array.from(checkedDates));
        }
      }
      
      return Array.from(checkedDates);
    }
    
    // 체크된 날짜 목록 반환 함수
    function getCheckedDates() {
      syncWithDOM();
      return Array.from(checkedDates);
    }
    
    // 체크된 날짜 저장 함수
    async function saveCheckedDates() {
      try {
        // DOM 상태와 동기화
        syncWithDOM();
        
        const checkedDatesArray = Array.from(checkedDates);
        
        DebugModule.log(`저장할 체크된 날짜 수: ${checkedDatesArray.length}`);
        if (checkedDatesArray.length > 0) {
          DebugModule.log('저장할 체크된 날짜들:', checkedDatesArray);
        }
        
        await StorageModule.saveData('checkedDates', checkedDatesArray);
        DebugModule.log('체크된 날짜 저장 성공');
        return true;
      } catch (error) {
        DebugModule.log('체크된 날짜 저장 실패:', error);
        UIModule.showStatus('체크된 날짜 저장에 실패했습니다.', false);
        return false;
      }
    }
    
    // 새 날짜 추가 함수
    function addNewDate(date, checked = false) {
      DebugModule.log(`새 날짜 추가: ${date}, 체크 상태: ${checked}`);
      
      // 이미 존재하는 날짜인지 확인
      const existingCheckbox = Array.from(document.querySelectorAll('.date-checkbox'))
        .find(checkbox => checkbox.value === date);
      
      if (existingCheckbox) {
        DebugModule.log(`이미 존재하는 날짜: ${date}`);
        // 체크 상태 업데이트
        if (existingCheckbox.checked !== checked) {
          existingCheckbox.checked = checked;
          if (checked) {
            checkedDates.add(date);
          } else {
            checkedDates.delete(date);
          }
          logCheckedDates();
        }
        return;
      }
      
      // 새 체크박스 생성
      const dateContainer = document.getElementById('date-filter-container');
      const checkboxItem = document.createElement('div');
      checkboxItem.className = 'checkbox-item';
      
      // 체크박스 엘리먼트 생성
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'date-checkbox';
      checkbox.value = date;
      checkbox.checked = checked;
      
      // 내부 상태 업데이트
      if (checked) {
        checkedDates.add(date);
      }
      
      DebugModule.log(`체크된 날짜 세트 크기 (추가 후): ${checkedDates.size}`);
      
      // 라벨 생성
      const label = document.createElement('label');
      let formatted = date;
      
      // 날짜 포맷 변경
      try {
        formatted = UtilModule.formatDate(date);
      } catch (error) {
        DebugModule.log('날짜 포맷 변환 실패:', error);
      }
      
      label.textContent = formatted;
      
      // 삭제 버튼 생성
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-date-btn';
      deleteBtn.textContent = '×';
      deleteBtn.title = '날짜 삭제';
      
      // 체크박스 이벤트 리스너
      checkbox.addEventListener('change', async () => {
        DebugModule.log(`체크박스 상태 변경: ${date}, 체크됨: ${checkbox.checked}`);
        
        // 내부 상태 업데이트
        if (checkbox.checked) {
          checkedDates.add(date);
        } else {
          checkedDates.delete(date);
        }
        
        // 체크된 체크박스 로깅
        const checkedBoxes = Array.from(document.querySelectorAll('.date-checkbox'))
          .filter(cb => cb.checked);
        DebugModule.log(`현재 체크된 체크박스 수: ${checkedBoxes.length}`);
        DebugModule.log('체크된 체크박스 값들:', checkedBoxes.map(cb => cb.value));
        
        try {
          await saveCheckedDates();
          
          // 날짜 변경 콜백이 설정된 경우 호출
          if (dateChangeCallback) {
            DebugModule.log('날짜 변경 콜백 호출');
            dateChangeCallback();
          }
        } catch (error) {
          DebugModule.log('체크박스 변경 처리 중 오류:', error);
        }
      });
      
      // 삭제 버튼 이벤트 리스너
      deleteBtn.addEventListener('click', async () => {
        DebugModule.log(`날짜 삭제: ${date}`);
        
        // 내부 상태에서 제거
        checkedDates.delete(date);
        
        // DOM에서 제거
        dateContainer.removeChild(checkboxItem);
        
        // 날짜 목록 및 체크된 날짜 저장
        await updateDateList();
        await saveCheckedDates();
        
        UIModule.showStatus(`날짜 ${formatted} 삭제됨`);
        
        // 날짜 변경 콜백이 설정된 경우 호출
        if (dateChangeCallback) {
          DebugModule.log('날짜 삭제 후 콜백 호출');
          dateChangeCallback();
        }
      });
      
      // 엘리먼트 조합
      checkboxItem.appendChild(checkbox);
      checkboxItem.appendChild(label);
      checkboxItem.appendChild(deleteBtn);
      dateContainer.appendChild(checkboxItem);
    }
    
    // 날짜 목록 업데이트 함수
    async function updateDateList() {
      try {
        const dates = Array.from(document.querySelectorAll('.date-checkbox'))
          .map(checkbox => checkbox.value);
        
        await StorageModule.saveData('savedDates', dates);
        DebugModule.log('날짜 목록 저장 성공, 저장된 날짜 수:', dates.length);
        return true;
      } catch (error) {
        DebugModule.log('날짜 목록 저장 실패:', error);
        UIModule.showStatus('날짜 목록 저장에 실패했습니다.', false);
        return false;
      }
    }
    
    // 날짜 체크박스 정렬 함수
    function sortDateCheckboxes() {
      const dateContainer = document.getElementById('date-filter-container');
      const items = Array.from(dateContainer.querySelectorAll('.checkbox-item'));
      
      // 날짜 기준으로 정렬
      items.sort((a, b) => {
        const dateA = a.querySelector('.date-checkbox').value;
        const dateB = b.querySelector('.date-checkbox').value;
        return dateA.localeCompare(dateB);
      });
      
      // 정렬된 순서로 DOM에 다시 추가
      items.forEach(item => {
        dateContainer.appendChild(item);
      });
      
      DebugModule.log('날짜 체크박스 정렬 완료');
    }
    
    // 초기화 함수
    async function initialize() {
      DebugModule.log('날짜 필터 모듈 초기화 시작');
      
      try {
        // 저장된 날짜 목록 로드
        const savedDates = await StorageModule.loadData('savedDates') || [];
        // 저장된 체크된 날짜 로드
        const storedCheckedDates = await StorageModule.loadData('checkedDates') || [];
        
        DebugModule.log(`저장된 날짜 수: ${savedDates.length}, 체크된 날짜 수: ${storedCheckedDates.length}`);
        
        // 내부 상태 초기화
        checkedDates.clear();
        storedCheckedDates.forEach(date => checkedDates.add(date));
        
        // 날짜 체크박스 생성
        const uniqueDates = new Set([...savedDates, ...storedCheckedDates]);
        
        uniqueDates.forEach(date => {
          const isChecked = storedCheckedDates.includes(date);
          addNewDate(date, isChecked);
        });
        
        // 모든 날짜 삭제 버튼 이벤트 리스너
        const clearAllBtn = document.getElementById('clear-dates-btn');
        if (clearAllBtn) {
          clearAllBtn.addEventListener('click', async () => {
            DebugModule.log('모든 날짜 삭제 시작');
            
            // 날짜 컨테이너 비우기
            const dateContainer = document.getElementById('date-filter-container');
            dateContainer.innerHTML = '';
            
            // 내부 상태 초기화
            checkedDates.clear();
            
            // 저장소에서 날짜 데이터 삭제
            await StorageModule.saveData('savedDates', []);
            await StorageModule.saveData('checkedDates', []);
            
            UIModule.showStatus('모든 날짜가 삭제되었습니다.');
            
            // 날짜 변경 콜백이 설정된 경우 호출
            if (dateChangeCallback) {
              DebugModule.log('모든 날짜 삭제 후 콜백 호출');
              dateChangeCallback();
            }
          });
        }
        
        DebugModule.log('날짜 필터 모듈 초기화 완료');
        sortDateCheckboxes();
      } catch (error) {
        DebugModule.log('날짜 필터 모듈 초기화 실패:', error);
        UIModule.showStatus('날짜 필터 초기화에 실패했습니다.', false);
      }
    }
    
    return {
      setDateChangeCallback,
      logCheckedDates,
      syncWithDOM,
      getCheckedDates,
      saveCheckedDates,
      addNewDate,
      updateDateList,
      sortDateCheckboxes,
      initialize,
      checkedDates
    };
  })();
  
  // 데이터 처리 모듈
  const DataModule = (() => {
    let allComments = []; // 모든 댓글 데이터 저장
    let filteredComments = []; // 필터링된 댓글 데이터 저장
    
    // 날짜 필터 적용 함수
    function applyDateFilter() {
      DebugModule.log('날짜 필터 적용');
      
      // DOM과 내부 상태 동기화
      DateFilterModule.syncWithDOM(true);
      
      // 선택된 날짜 가져오기
      const selectedDates = DateFilterModule.getCheckedDates();
      
      DebugModule.log('선택된 날짜들 (최종):', selectedDates);
      
      if (selectedDates.length === 0) {
        DebugModule.log('선택된 날짜 없음, 모든 댓글 표시');
        filteredComments = allComments;
      } else {
        filteredComments = allComments.filter(comment => {
          // 댓글 내용에서 날짜 패턴 확인
          const { content, time } = comment;
          
          // 먼저 댓글 내용에서 날짜 패턴 (5.2 @참석) 확인
          const commentDatePattern = /(\d+\.\d+)\s+@/;
          const commentDateMatch = commentDatePattern.exec(content);
          
          // 댓글에 날짜 패턴이 있으면 그 날짜 사용, 없으면 댓글 작성 시간 사용
          let commentDate;
          if (commentDateMatch) {
            const dateStr = commentDateMatch[1];
            commentDate = UtilModule.parseCommentDate(dateStr);
          } else {
            const d = new Date(time);
            commentDate = d.toISOString().split('T')[0];
          }
          
          return selectedDates.includes(commentDate);
        });
      }
      
      DebugModule.log(`필터링된 댓글 수: ${filteredComments.length}`);
      analyzeComments(filteredComments);
      UIModule.showStatus(`${filteredComments.length}개의 댓글 분석 완료!`);
    }
    
    // 댓글 분석 함수
    function analyzeComments(comments) {
      DebugModule.log('댓글 분석 시작. 댓글 수:', comments.length);
      
      // 날짜별 참석 현황 객체 초기화
      const attendanceByDate = {};
      const attendees = new Map(); // 참석자: Map<이름, {시간, 상태}>
      
      // 선택된 날짜들 가져오기
      const selectedDates = DateFilterModule.getCheckedDates();
      DebugModule.log('선택된 날짜들:', selectedDates);
      
      // 선택된 날짜가 없으면 모든 댓글 분석 중단
      if (selectedDates.length === 0) {
        DebugModule.log('선택된 날짜가 없습니다.');
        UIModule.showStatus('날짜를 선택해주세요.', false);
      return;
    }
    
      // 선택된 날짜별로 객체 초기화
      selectedDates.forEach(dateStr => {
        attendanceByDate[dateStr] = { attending: 0, notAttending: 0 };
      });
    
      // 각 댓글 분석
      comments.forEach(comment => {
        const { name, time, content } = comment;
        DebugModule.log(`댓글 분석 중: ${name} - ${content}`);
        
        // 댓글에서 모든 날짜 패턴 찾기
        const datePattern = /(\d+\.\d+)\s+@(참석|취소)/g;
        let dateMatch;
        
        while ((dateMatch = datePattern.exec(content)) !== null) {
          const dateStr = dateMatch[1];
          const action = dateMatch[2];
          const parsedDate = UtilModule.parseCommentDate(dateStr);
          
          DebugModule.log(`날짜 패턴 발견: ${dateStr} -> ${parsedDate}, 액션: ${action}`);
          DebugModule.log(`선택된 날짜들: ${selectedDates.join(', ')}`);
          
          if (!parsedDate) {
            DebugModule.log(`날짜 파싱 실패: ${dateStr}`);
            continue;
          }
          
          if (!selectedDates.includes(parsedDate)) {
            DebugModule.log(`날짜 ${parsedDate}가 선택된 날짜에 없음`);
            continue;
          }
          
          // 해당 날짜 이후의 텍스트에서 이름 추출
          const remainingText = content.slice(dateMatch.index + dateMatch[0].length);
          // 마침표를 기준으로 첫 번째 문장에서 이름 추출
          const firstSentence = remainingText.split('.')[0].trim();
          
          // 이름은 쉼표로 구분된 부분만 추출
          let names = firstSentence.split(',')
            .map(n => n.trim())
            .filter(n => n && !n.includes('참석') && !n.includes('취소'));
          
          // '본인'이라는 단어가 있으면 이름으로 추가 (중복 방지)
          if (firstSentence.includes('본인') && !names.includes('본인')) {
            names.push('본인');
          }
          
          // 중복 제거
          names = [...new Set(names)];
          
          DebugModule.log(`추출된 이름들: ${names.join(', ')}`);
          
          // 이름이 추출된 경우에만 처리
          if (names.length > 0) {
            names.forEach(attendeeName => {
              // 이름과 날짜를 조합하여 고유 키 생성
              const key = `${attendeeName}_${parsedDate}`;
              attendees.set(key, {
                name: attendeeName,
                time: parsedDate,
                status: action === '참석' ? '참석' : '취소'
              });
              DebugModule.log(`참석자 추가/업데이트: ${attendeeName} - ${parsedDate} - ${action}`);
            });
          } else {
            DebugModule.log('이름이 추출되지 않아 처리하지 않음');
          }
        }
      });
      
      // 참석자 상태별로 분류
      const attending = [];
      
      // 참석자 정보 처리
      attendees.forEach((info, key) => {
        const { name, time: dateStr, status } = info;
        DebugModule.log(`참석자 처리: ${name} - ${dateStr} - ${status}`);
        DebugModule.log(`선택된 날짜들: ${selectedDates.join(', ')}`);
        
        if (status === '참석') {
          DebugModule.log(`참석자 ${name}의 날짜 ${dateStr}가 선택된 날짜에 포함되어 있는지 확인`);
          if (selectedDates.includes(dateStr)) {
            DebugModule.log(`참석자 ${name}의 날짜 ${dateStr}가 선택된 날짜에 포함됨`);
            attending.push({ name, time: dateStr });
            
            // 해당 날짜의 참석자 수 증가
            if (attendanceByDate[dateStr]) {
              attendanceByDate[dateStr].attending++;
              DebugModule.log(`날짜 ${dateStr}의 참석자 수 증가: ${attendanceByDate[dateStr].attending}`);
            }
          } else {
            DebugModule.log(`참석자 ${name}의 날짜 ${dateStr}가 선택된 날짜에 포함되지 않음`);
          }
        }
      });
      
      DebugModule.log('분석 결과 - 참석자:', attending.length, '명');
      DebugModule.log('날짜별 참석 현황:', attendanceByDate);
      DebugModule.log('참석자 목록:', attending);
    
      // 테이블 업데이트
      UIModule.updateTable('attend-list', attending);
      
      // 차트 업데이트 - 날짜별 참석 현황
      ChartModule.updateChart(attendanceByDate);

      // 분석 완료 메시지 표시
      UIModule.showStatus(`${comments.length}개의 댓글을 분석했습니다.`);
    }
    
    // 데이터 가져오기 및 분석
    async function fetchAndAnalyzeData() {
      try {
        const targetUrl = await StorageModule.loadData('targetUrl');
        DebugModule.log('가져올 URL:', targetUrl);
        
        if (!targetUrl) {
          UIModule.showStatus('분석할 URL을 먼저 저장해주세요.', false);
      return;
    }
    
        UIModule.showStatus('데이터를 가져오는 중...', true);
        UIModule.elements.statusMessage.style.color = '#3498db';
        
        // URL에서 직접 데이터 가져오기
        const response = await fetch(targetUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        DebugModule.log('HTML 데이터 길이:', html.length);
        
        // HTML 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 댓글 데이터 수집
        const comments = [];
        
        // 댓글 데이터가 없을 경우 테이블에서 추출 시도
        const tables = doc.querySelectorAll('table');
        DebugModule.log('발견된 테이블 수:', tables.length);
        
        tables.forEach((table, index) => {
          DebugModule.log(`테이블 ${index + 1} 처리 중...`);
          const rows = table.querySelectorAll('tr');
          DebugModule.log(`테이블 ${index + 1}의 행 수:`, rows.length);
          
          // 첫 번째 행은 헤더일 수 있으므로 건너뜀
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            
            if (cells.length >= 2) {
              const name = cells[0]?.textContent.trim() || '이름 없음';
              const content = cells[cells.length - 1]?.textContent.trim() || '';
              let time = cells[1]?.textContent.trim() || '';
              
              // 시간 형식이 없는 경우 현재 시간 사용
              if (!time) {
                time = new Date().toISOString();
              } else {
                try {
                  // 시간 문자열을 Date 객체로 변환
                  const date = new Date(time);
                  if (isNaN(date.getTime())) {
                    time = new Date().toISOString();
                  } else {
                    time = date.toISOString();
                  }
        } catch (e) {
                  time = new Date().toISOString();
                }
              }
              
              if (name && content) {
                comments.push({ name, time, content });
                DebugModule.log(`댓글 추가: ${name} - ${time} - ${content.substring(0, 30)}...`);
              }
            }
          }
        });
        
        DebugModule.log(`최종 수집된 댓글 수: ${comments.length}`);
        
        if (comments.length > 0) {
          // 모든 댓글 데이터 저장
          allComments = comments;
          filteredComments = comments;
          
          // 댓글 분석 및 차트 업데이트
          applyDateFilter();
        } else {
          DebugModule.log('댓글을 찾을 수 없음');
          UIModule.showStatus('댓글을 찾을 수 없습니다.', false);
        }
      } catch (error) {
        DebugModule.log('데이터 가져오기 실패:', error);
        DebugModule.log('에러 상세:', error.message);
        UIModule.showStatus('데이터를 가져오는 중 오류가 발생했습니다.', false);
      }
    }
    
    // URL 저장 함수
    async function saveUrl(url) {
      if (!url) {
        UIModule.showStatus('유효한 URL을 입력해주세요.', false);
        return false;
      }
      
      try {
        await StorageModule.saveData('targetUrl', url);
        UIModule.showStatus('URL이 저장되었습니다.');
        return true;
      } catch (error) {
        UIModule.showStatus('URL 저장에 실패했습니다.', false);
        return false;
      }
    }
    
    // 초기화 함수
    function initialize() {
      // DateFilterModule에 날짜 변경 콜백 설정
      DateFilterModule.setDateChangeCallback(applyDateFilter);
      return true;
    }
    
    return {
      applyDateFilter,
      analyzeComments,
      fetchAndAnalyzeData,
      saveUrl,
      initialize
    };
  })();
  
  // ============================
  // 이벤트 핸들러 설정
  // ============================
  // 이벤트 핸들러 등록 함수
  function setupEventListeners() {
    DebugModule.log('이벤트 리스너 설정 시작');
    
    // 날짜 추가 버튼 클릭 이벤트
    UIModule.elements.addDateButton.addEventListener('click', async () => {
      DebugModule.log('날짜 추가 버튼 클릭');
      const newDate = UIModule.elements.newDateInput.value;
      
      if (!newDate) {
        UIModule.showStatus('날짜를 선택해주세요.', false);
        return;
      }
      
      // 이미 존재하는 날짜인지 확인
      const existingCheckbox = document.querySelector(`.date-checkbox[value="${newDate}"]`);
      if (existingCheckbox) {
        UIModule.showStatus('이미 추가된 날짜입니다.', false);
        return;
      }

      // 새 날짜 추가 (기본적으로 체크됨)
      DateFilterModule.addNewDate(newDate, true);
      await DateFilterModule.updateDateList();
      await DateFilterModule.saveCheckedDates();
      
      // 날짜 정렬
      DateFilterModule.sortDateCheckboxes();
      
      // 입력 필드 초기화
      UIModule.elements.newDateInput.value = '';
      UIModule.showStatus('날짜가 추가되었습니다.');
      
      // 데이터 필터링 적용
      DataModule.applyDateFilter();
    });
    
    // 전체 날짜 삭제 버튼 클릭 이벤트
    UIModule.elements.clearDatesButton.addEventListener('click', async () => {
      const checkboxes = document.querySelectorAll('.date-checkbox');
      if (checkboxes.length === 0) {
        UIModule.showStatus('삭제할 날짜가 없습니다.', false);
        return;
      }
      
      DebugModule.log('전체 날짜 삭제');
      
      // 모든 날짜 삭제
      UIModule.elements.dateCheckboxGroup.innerHTML = '';
      DateFilterModule.checkedDates.clear();
      
      // 저장
      await StorageModule.saveData('savedDates', []);
      await DateFilterModule.saveCheckedDates();
      
      UIModule.showStatus('모든 날짜가 삭제되었습니다.');
      
      // 필터링 적용
      DataModule.applyDateFilter();
    });
    
    // URL 저장 버튼 클릭 이벤트
    UIModule.elements.saveUrlButton.addEventListener('click', async () => {
      const url = UIModule.elements.targetUrlInput.value.trim();
      if (await DataModule.saveUrl(url)) {
        await DataModule.fetchAndAnalyzeData();
      }
    });
    
    // 데이터 새로고침 버튼 클릭 이벤트
    UIModule.elements.refreshDataButton.addEventListener('click', DataModule.fetchAndAnalyzeData);
    
    DebugModule.log('이벤트 리스너 설정 완료');
  }
  
  // ============================
  // 초기화
  // ============================
  
  // 앱 초기화 함수
  async function initializeApp() {
    DebugModule.log('앱 초기화 시작');
    
    try {
      // 디버그 모듈 초기화
      DebugModule.initialize();
      DebugModule.log('디버그 모듈 초기화 완료');
      
      // UI 모듈 초기화
      UIModule.initialize();
      DebugModule.log('UI 모듈 초기화 완료');
      
      // 스토리지 모듈 초기화
      await StorageModule.initialize();
      DebugModule.log('스토리지 모듈 초기화 완료');
      
      // 차트 모듈 초기화
      ChartModule.initialize();
      DebugModule.log('차트 모듈 초기화 완료');
      
      // 날짜 필터 모듈 초기화
      await DateFilterModule.initialize();
      DebugModule.log('날짜 필터 모듈 초기화 완료');
      
      // 데이터 모듈 초기화
      DataModule.initialize();
      DebugModule.log('데이터 모듈 초기화 완료');
      
      // 이벤트 리스너 설정
      setupEventListeners();
      DebugModule.log('이벤트 리스너 설정 완료');
      
      // 저장된 URL 로드 및 표시
      const savedUrl = await StorageModule.loadData('targetUrl');
      if (savedUrl) {
        UIModule.elements.targetUrlInput.value = savedUrl;
        UIModule.showStatus('저장된 URL을 로드했습니다. 데이터를 불러오는 중...');
        // 저장된 URL이 있으면 자동으로 데이터 불러오기
        await DataModule.fetchAndAnalyzeData();
      } else {
        UIModule.showStatus('분석할 URL을 입력하고 저장 버튼을 클릭하세요.');
      }
      
      DebugModule.log('앱 초기화 완료');
    } catch (error) {
      DebugModule.log('앱 초기화 실패:', error);
      UIModule.showStatus('앱 초기화 중 오류가 발생했습니다.', false);
    }
  }
  
  // 앱 초기화 직접 호출
  initializeApp();
}); 