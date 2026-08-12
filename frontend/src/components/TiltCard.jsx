import React, { useState } from 'react';

export default function TiltCard({
  children,
  className = '',
  maxTilt = 12,
  glare = true,
  onClick,
  ...props
}) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, glareX, glareY });
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered 
          ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(1.01)` 
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
        transition: isHovered ? 'transform 0.1s cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        transformStyle: 'preserve-3d',
      }}
      className={`relative overflow-hidden cursor-pointer ${className}`}
      {...props}
    >
      {glare && isHovered && (
        <div
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.15) 0%, transparent 65%)`,
          }}
          className="absolute inset-0 pointer-events-none transition-opacity duration-200 z-20"
        />
      )}

      {children}
    </div>
  );
}
