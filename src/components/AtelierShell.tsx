import React, { useState, useEffect, useRef } from 'react';
import { DynamicIslandNotificationCenter } from './notifications/DynamicIslandNotificationCenter';
import floatingBarberBg from '../assets/images/vintage_barber_bg_1790560739801.jpg';
import { StudioDustMotes } from './StudioDustMotes';

interface AtelierShellProps {
  id?: string;
  children: React.ReactNode;
  showStatusBar?: boolean;
  className?: string;
  bottomPadding?: string;
  onNavigateToTab?: (tab: string) => void;
  isWideLayout?: boolean;
  headerContent?: React.ReactNode;
}

export const AtelierShell: React.FC<AtelierShellProps> = ({
  id = 'atelier-page-container',
  children,
  showStatusBar = true,
  className = '',
  bottomPadding = 'pb-20 sm:pb-24',
  onNavigateToTab,
  isWideLayout = false,
  headerContent,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  
  // Multi-source parallax coordinates state with smooth spring-like lerp
  const [parallaxOffset, setParallaxOffset] = useState<{ x: number; y: number; scrollY: number }>({ x: 0, y: 0, scrollY: 0 });
  
  // Target and current refs for silky 60fps interpolation
  const targetOffsetRef = useRef<{ x: number; y: number; scrollY: number }>({ x: 0, y: 0, scrollY: 0 });
  const currentOffsetRef = useRef<{ x: number; y: number; scrollY: number }>({ x: 0, y: 0, scrollY: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Multi-input parallax listeners (Scroll, Touch, Mouse, Device Orientation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isRunning = true;

    // 1. Unified Scroll Listener (captures all scrollable child elements + window)
    const handleScroll = (e: Event) => {
      let scrollPosition = 0;
      const target = e.target;
      
      if (target === document || target === window) {
        scrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
      } else if (target instanceof HTMLElement) {
        scrollPosition = target.scrollTop || 0;
      }

      // Normalized scroll effect (capped for smooth boundaries)
      targetOffsetRef.current.scrollY = Math.min(scrollPosition, 800);
    };

    // 2. Mouse Move Listener for Desktop
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      if (innerWidth === 0 || innerHeight === 0) return;
      
      const nx = ((e.clientX / innerWidth) - 0.5) * 2;
      const ny = ((e.clientY / innerHeight) - 0.5) * 2;
      
      targetOffsetRef.current.x = Math.max(-1, Math.min(1, nx));
      targetOffsetRef.current.y = Math.max(-1, Math.min(1, ny));
    };

    const handleMouseLeave = () => {
      targetOffsetRef.current.x = 0;
      targetOffsetRef.current.y = 0;
    };

    // 3. Touch Drag & Swipe Parallax Listener for Mobile/Tablet
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = (touch.clientX - touchStartRef.current.x) / (window.innerWidth * 0.4);
      const deltaY = (touch.clientY - touchStartRef.current.y) / (window.innerHeight * 0.4);

      targetOffsetRef.current.x = Math.max(-1, Math.min(1, deltaX));
      targetOffsetRef.current.y = Math.max(-1, Math.min(1, deltaY));
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
      // Gently return touch delta to neutral
      targetOffsetRef.current.x = 0;
      targetOffsetRef.current.y = 0;
    };

    // 4. Device Orientation / Gyroscope (subtle natural tilt when tilting phone)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // gamma: left-to-right tilt in degrees [-90 to 90]
        // beta: front-to-back tilt in degrees [-180 to 180], typical holding angle ~45deg
        const tiltX = Math.max(-1, Math.min(1, e.gamma / 35));
        const tiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
        
        targetOffsetRef.current.x = tiltX;
        targetOffsetRef.current.y = tiltY;
      }
    };

    // Register event listeners
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    if (window.DeviceOrientationEvent && typeof (window.DeviceOrientationEvent as any).requestPermission !== 'function') {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    // 5. Smooth physics lerp loop with buttery damping (60-120fps)
    const animate = () => {
      if (!isRunning) return;

      const target = targetOffsetRef.current;
      const current = currentOffsetRef.current;
      
      const lerpFactor = 0.06;
      const scrollLerp = 0.08;

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const dScroll = target.scrollY - current.scrollY;

      let changed = false;

      if (Math.abs(dx) > 0.0002 || Math.abs(dy) > 0.0002) {
        current.x += dx * lerpFactor;
        current.y += dy * lerpFactor;
        changed = true;
      }

      if (Math.abs(dScroll) > 0.1) {
        current.scrollY += dScroll * scrollLerp;
        changed = true;
      }

      if (changed) {
        setParallaxOffset({ 
          x: current.x, 
          y: current.y,
          scrollY: current.scrollY 
        });
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('deviceorientation', handleOrientation);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const liveShortTimeEn = `${hours}:${minutes}`;

  const containerSizing = 'w-full h-[100dvh] min-h-[100dvh] max-w-none';

  const px = parallaxOffset.x;
  const py = parallaxOffset.y;
  const scrollOffset = parallaxOffset.scrollY;

  // Parallax translation factors
  const bgImgTranslateY = py * -14 + scrollOffset * -0.09;
  const bgImgTranslateX = px * -16;
  const bgImgRotateX = py * -2;
  const bgImgRotateY = px * 2;

  return (
    <div
      id={id}
      className={`relative w-full ${containerSizing} mx-auto glass-panel-vitality overflow-hidden rounded-none flex flex-col justify-start select-none transition-shadow duration-300 ${className}`}
    >
      {/* ─── 3D Floating Barbershop Elements Background with Multi-Layer Parallax ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-gradient-to-b from-[#f3f6fa] via-[#efeaf6] to-[#f5eee9]">
        {/* High-Resolution 3D Floating Barber Items Wallpaper with Dynamic 3D Transform */}
        <div 
          className="absolute inset-0 w-full h-full will-change-transform"
          style={{
            perspective: '1200px',
            transformStyle: 'preserve-3d',
          }}
        >
          <img
            src={floatingBarberBg}
            alt=""
            aria-hidden="true"
            className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] object-cover object-center opacity-85 mix-blend-multiply transition-transform duration-300 ease-out"
            style={{
              transform: `scale(1.08) translate3d(${bgImgTranslateX}px, ${bgImgTranslateY}px, 0) rotateX(${bgImgRotateX}deg) rotateY(${bgImgRotateY}deg)`,
            }}
          />
        </div>

        {/* Powder Blue organic blurred shape: Top Left (Far plane parallax) */}
        <div
          className="absolute -top-16 -left-14 w-80 h-80 will-change-transform opacity-60"
          style={{
            transform: `translate3d(${px * 28}px, ${py * 24 + scrollOffset * -0.15}px, 0)`,
          }}
        >
          <div className="w-full h-full rounded-full bg-[#bfddf4]/60 blur-[75px] animate-organic-1" />
        </div>

        {/* Lavender organic blurred shape: Center Right (Mid plane parallax) */}
        <div
          className="absolute top-[26%] -right-16 w-88 h-88 will-change-transform opacity-60"
          style={{
            transform: `translate3d(${px * -36}px, ${py * -28 + scrollOffset * 0.12}px, 0)`,
          }}
        >
          <div className="w-full h-full rounded-full bg-[#ded4f5]/65 blur-[80px] animate-organic-2" />
        </div>

        {/* Blush organic blurred shape: Mid-Left (Near plane parallax) */}
        <div
          className="absolute top-[50%] -left-12 w-72 h-72 will-change-transform opacity-60"
          style={{
            transform: `translate3d(${px * 24}px, ${py * -26 + scrollOffset * -0.08}px, 0)`,
          }}
        >
          <div className="w-full h-full rounded-full bg-[#f8d0de]/60 blur-[70px] animate-organic-3" />
        </div>

        {/* Warm Peach organic blurred shape: Bottom Right */}
        <div
          className="absolute -bottom-16 -right-12 w-80 h-80 will-change-transform opacity-60"
          style={{
            transform: `translate3d(${px * -28}px, ${py * 32 + scrollOffset * 0.18}px, 0)`,
          }}
        >
          <div className="w-full h-full rounded-full bg-[#fed5c1]/65 blur-[75px] animate-organic-1" />
        </div>

        {/* Interactive 3D Ambient Specular Light reflecting cursor & scroll position */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-300"
          style={{
            background: `radial-gradient(circle at ${50 + px * 25}% ${25 + py * 20 + (scrollOffset * 0.03)}%, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.1) 45%, transparent 75%)`,
          }}
        />

        {/* Ambient Floating Dust Motes in Studio Light */}
        <StudioDustMotes particleCount={48} speedMultiplier={0.65} intensity={0.9} />

        {/* Subtle top specular ambient gradient for crisp header readability */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none" />
      </div>

      {/* iOS / Mobile Main Single Header Bar */}
      {showStatusBar && (
        <header
          id="ios-status-bar"
          className="relative z-40 px-3 sm:px-5 pt-[max(0.35rem,env(safe-area-inset-top,0px))] pb-1 sm:pb-2 min-h-[40px] sm:min-h-[48px] flex items-center text-stone-800 text-xs font-semibold tracking-tight shrink-0 select-none bg-transparent"
        >
          {headerContent ? (
            <div className="w-full">{headerContent}</div>
          ) : (
            <div className="w-full flex justify-center items-center">
              <DynamicIslandNotificationCenter onNavigateToTab={onNavigateToTab} />
            </div>
          )}
        </header>
      )}

      <div className={`relative z-20 flex-1 min-h-0 flex flex-col overflow-hidden ${bottomPadding}`}>
        {children}
      </div>
    </div>
  );
};
