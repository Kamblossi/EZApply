import React, { useRef, useEffect } from 'react';
import { styled } from '@mui/material';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlowButtonProps extends Omit<HTMLMotionProps<"button">, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  children: React.ReactNode;
  glowStartColor?: string;
  glowEndColor?: string;
  backgroundColor?: string;
  textColor?: string;
  shadowColor?: string;
  shineLeftColor?: string;
  shineRightColor?: string;
}

const GlowButtonContainer = styled(motion.button, {
  shouldForwardProp: (prop) => 
    !['glowStartColor', 'glowEndColor', 'backgroundColor', 'textColor', 'shadowColor', 'shineLeftColor', 'shineRightColor'].includes(prop as string),
})<GlowButtonProps>(({ 
  theme, 
  glowStartColor = '#B000E8', 
  glowEndColor = '#009FFD',
  backgroundColor = theme.palette.mode === 'dark' ? '#09041e' : '#1a1a2e',
  textColor = theme.palette.common.white,
  shadowColor = 'rgba(33, 4, 104, 0.2)',
  shineLeftColor = 'rgba(120, 0, 245, 0.5)',
  shineRightColor = 'rgba(200, 148, 255, 0.65)'
}) => ({
  '--button-background': backgroundColor,
  '--button-color': textColor,
  '--button-shadow': shadowColor,
  '--button-shine-left': shineLeftColor,
  '--button-shine-right': shineRightColor,
  '--button-glow-start': glowStartColor,
  '--button-glow-end': glowEndColor,
  '--pointer-x': '0px',
  '--pointer-y': '0px',
  '--button-glow': 'transparent',
  '--button-glow-opacity': '0',
  '--button-glow-duration': '0.5s',

  appearance: 'none',
  outline: 'none',
  border: 'none',
  fontFamily: 'inherit',
  fontSize: '16px',
  fontWeight: 500,
  borderRadius: '11px',
  position: 'relative',
  lineHeight: '24px',
  cursor: 'pointer',
  color: 'var(--button-color)',
  padding: 0,
  margin: 0,
  background: 'none',
  zIndex: 1,
  boxShadow: '0 8px 20px var(--button-shadow)',
  transition: 'transform 0.2s ease-in-out',

  '&:hover': {
    '--button-glow-opacity': '1',
    '--button-glow-duration': '0.25s',
    transform: 'translateY(-1px)',
  },

  '&:active': {
    transform: 'translateY(1px)',
  },

  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none',
    '&:hover': {
      '--button-glow-opacity': '0',
      transform: 'none',
    },
  },

  '& .gradient': {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    overflow: 'hidden',
    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
    transform: 'scaleY(1.02) scaleX(1.005) rotate(-0.35deg)',

    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      transform: 'scale(1.05) translateY(-44px) rotate(0deg) translateZ(0)',
      paddingBottom: '100%',
      borderRadius: '50%',
      background: 'linear-gradient(90deg, var(--button-shine-left), var(--button-shine-right))',
      animation: 'glowRotate linear 2s infinite',
    },
  },

  '& .button-content': {
    zIndex: 1,
    position: 'relative',
    padding: '10px 24px',
    boxSizing: 'border-box',
    width: 'fit-content',
    minWidth: '100px',
    borderRadius: 'inherit',
    backgroundColor: 'var(--button-background)',
    overflow: 'hidden',
    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',

    '&::before': {
      content: '""',
      position: 'absolute',
      left: '-16px',
      top: '-16px',
      transform: 'translate(var(--pointer-x), var(--pointer-y)) translateZ(0)',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: 'var(--button-glow)',
      opacity: 'var(--button-glow-opacity)',
      transition: 'opacity var(--button-glow-duration)',
      filter: 'blur(20px)',
    },
  },

  '@keyframes glowRotate': {
    to: {
      transform: 'scale(1.05) translateY(-44px) rotate(360deg) translateZ(0)',
    },
  },
}));

// Helper function to interpolate between two hex colors
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  // Simple color interpolation
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const GlowButton: React.FC<GlowButtonProps> = ({ 
  children, 
  glowStartColor,
  glowEndColor,
  backgroundColor,
  textColor,
  shadowColor,
  shineLeftColor,
  shineRightColor,
  disabled,
  onClick,
  ...props 
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const button = buttonRef.current;
    
    // Update CSS custom properties for glow position
    button.style.setProperty('--pointer-x', `${x}px`);
    button.style.setProperty('--pointer-y', `${y}px`);

    // Calculate glow color based on position
    const factor = x / rect.width;
    const startColor = glowStartColor || '#B000E8';
    const endColor = glowEndColor || '#009FFD';
    const glowColor = interpolateColor(startColor, endColor, factor);
    
    button.style.setProperty('--button-glow', glowColor);
  };

  const handleMouseEnter = () => {
    // Mouse enter handled in CSS hover
  };

  const handleMouseLeave = () => {
    if (buttonRef.current) {
      buttonRef.current.style.setProperty('--button-glow-opacity', '0');
    }
  };

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    // Create gradient element
    let gradientElem = button.querySelector('.gradient') as HTMLElement;
    if (!gradientElem) {
      gradientElem = document.createElement('div');
      gradientElem.classList.add('gradient');
      button.appendChild(gradientElem);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <GlowButtonContainer
      ref={buttonRef}
      glowStartColor={glowStartColor}
      glowEndColor={glowEndColor}
      backgroundColor={backgroundColor}
      textColor={textColor}
      shadowColor={shadowColor}
      shineLeftColor={shineLeftColor}
      shineRightColor={shineRightColor}
      disabled={disabled}
      onPointerMove={handlePointerMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      <span className="button-content">
        {children}
      </span>
    </GlowButtonContainer>
  );
};

export default GlowButton;
