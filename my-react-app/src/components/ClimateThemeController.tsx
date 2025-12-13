// 기후 데이터 기반 동적 테마 컨트롤러
import { useEffect, useRef } from 'react';
import { useClimateTheme } from '../hooks/useClimateTheme';

interface ClimateThemeControllerProps {
  lat: number | null;
  lng: number | null;
  enabled: boolean;
}

export default function ClimateThemeController({ lat, lng, enabled }: ClimateThemeControllerProps) {
  const theme = useClimateTheme(lat, lng, enabled);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // 감성적 날씨 시각화 (배경 애니메이션)
  useEffect(() => {
    if (!enabled || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 파티클 시스템
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    // 파티클 생성
    const createParticles = () => {
      particles.length = 0;
      const particleCount = theme.mood === 'danger' ? 200 : theme.mood === 'active' ? 100 : theme.mood === 'unstable' ? 150 : 50;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * (theme.mood === 'danger' ? 3 : theme.mood === 'active' ? 2 : 1),
          vy: (Math.random() - 0.5) * (theme.mood === 'danger' ? 3 : theme.mood === 'active' ? 2 : 1),
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    };

    createParticles();

    // 애니메이션 루프
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 배경 그라데이션
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, theme.primaryColor + '20');
      gradient.addColorStop(1, theme.secondaryColor + '10');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 파티클 그리기
      particles.forEach((particle) => {
        // 위치 업데이트
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 경계 처리
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // 파티클 그리기
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = theme.primaryColor + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, theme]);

  if (!enabled) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
          opacity: 0.3,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '0.85rem',
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ fontWeight: '600', color: theme.primaryColor, marginBottom: '0.25rem' }}>
          {theme.moodLabel}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#666' }}>
          기후 연동 테마 활성화
        </div>
      </div>
    </>
  );
}

