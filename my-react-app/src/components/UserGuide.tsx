import { useState } from 'react';

interface UserGuideProps {
  onClose?: () => void;
}

export default function UserGuide({ onClose }: UserGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '환영합니다! 🌍',
      content: (
        <div>
          <p>기후 스마트 라이프 가이드에 오신 것을 환영합니다!</p>
          <p>이 서비스는 경기도 기후위성데이터를 활용하여 지역별 기후 정보를 제공합니다.</p>
        </div>
      ),
      icon: '👋',
    },
    {
      title: '지도 탐색 🗺️',
      content: (
        <div>
          <p><strong>1. 지도 타입 선택</strong></p>
          <p>사이드바에서 원하는 지도 타입을 선택할 수 있습니다.</p>
          <p><strong>2. 지도 클릭</strong></p>
          <p>지도를 클릭하면 해당 위치의 기후 정보를 확인할 수 있습니다.</p>
          <p><strong>3. 검색 기능</strong></p>
          <p>헤더의 검색창에서 지역을 검색할 수 있습니다. (Ctrl+K)</p>
        </div>
      ),
      icon: '🗺️',
    },
    {
      title: '데이터 레이어 📊',
      content: (
        <div>
          <p><strong>레이어 선택</strong></p>
          <p>사이드바에서 기온, 강수량, 습도, 토양 등 다양한 데이터 레이어를 선택할 수 있습니다.</p>
          <p><strong>시각화</strong></p>
          <p>선택한 위치의 데이터는 차트로 시각화되어 표시됩니다.</p>
        </div>
      ),
      icon: '📊',
    },
    {
      title: '지역 비교 ⚖️',
      content: (
        <div>
          <p><strong>비교 기능</strong></p>
          <p>최대 3개 지역을 선택하여 비교할 수 있습니다.</p>
          <p><strong>사용 방법</strong></p>
          <p>1. 지도를 클릭하여 위치 선택</p>
          <p>2. "비교에 추가" 버튼 클릭</p>
          <p>3. 여러 지역의 데이터를 동시에 확인</p>
        </div>
      ),
      icon: '⚖️',
    },
    {
      title: '즐겨찾기 ⭐',
      content: (
        <div>
          <p><strong>북마크 기능</strong></p>
          <p>자주 확인하는 위치를 북마크에 저장할 수 있습니다.</p>
          <p><strong>사용 방법</strong></p>
          <p>1. 위치 선택 후 "추가" 버튼 클릭</p>
          <p>2. 북마크 이름 입력</p>
          <p>3. 저장된 북마크를 클릭하여 빠르게 이동</p>
        </div>
      ),
      icon: '⭐',
    },
    {
      title: '데이터 내보내기 💾',
      content: (
        <div>
          <p><strong>내보내기 옵션</strong></p>
          <p>• JSON 다운로드: 전체 데이터를 JSON 형식으로</p>
          <p>• CSV 다운로드: 표 형식으로 데이터 내보내기</p>
          <p>• 링크 공유: 현재 위치를 링크로 공유</p>
        </div>
      ),
      icon: '💾',
    },
    {
      title: '키보드 단축키 ⌨️',
      content: (
        <div>
          <p><strong>주요 단축키</strong></p>
          <p>• <kbd>Ctrl</kbd> + <kbd>K</kbd>: 검색창 포커스</p>
          <p>• <kbd>Esc</kbd>: 선택 해제</p>
          <p>• <kbd>?</kbd>: 도움말 보기</p>
          <p>• <kbd>Ctrl</kbd> + <kbd>E</kbd>: 데이터 내보내기</p>
        </div>
      ),
      icon: '⌨️',
    },
    {
      title: '완료! 🎉',
      content: (
        <div>
          <p>이제 모든 기능을 사용할 준비가 되었습니다!</p>
          <p>궁금한 점이 있으면 언제든지 <kbd>?</kbd> 키를 눌러 도움말을 확인하세요.</p>
          <p>행복한 탐색 되세요! 🌟</p>
        </div>
      ),
      icon: '🎉',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (onClose) {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="user-guide-modal" onClick={handleSkip}>
      <div className="user-guide-content" onClick={(e) => e.stopPropagation()}>
        <div className="guide-header">
          <div className="guide-icon">{steps[currentStep].icon}</div>
          <h2>{steps[currentStep].title}</h2>
          <button className="close-guide-button" onClick={handleSkip}>
            ✕
          </button>
        </div>

        <div className="guide-body">
          <div className="guide-step-indicator">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>

          <div className="guide-content">
            {steps[currentStep].content}
          </div>
        </div>

        <div className="guide-footer">
          <button
            className="guide-button secondary"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            이전
          </button>
          <button
            className="guide-button primary"
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? '완료' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}

