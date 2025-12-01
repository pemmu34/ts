// MainPage.js
import React, { useState, useRef, useEffect, useCallback } from 'react';

// Хук для плавной анимации
const useSmoothAnimation = (duration = 300) => {
    const [progress, setProgress] = useState(0);
    const animationRef = useRef(null);
    const directionRef = useRef('stop');
    const startTimeRef = useRef(null);

    const animate = useCallback((currentTime) => {
        if (!startTimeRef.current) {
            startTimeRef.current = currentTime;
        }

        const elapsed = currentTime - startTimeRef.current;
        const rawProgress = Math.min(elapsed / duration, 1);

        let newProgress;
        if (directionRef.current === 'in') {
            newProgress = rawProgress;
        } else if (directionRef.current === 'out') {
            newProgress = 1 - rawProgress;
        } else {
            newProgress = progress;
        }

        setProgress(newProgress);

        if (rawProgress < 1 && directionRef.current !== 'stop') {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            // Анимация завершена
            if (directionRef.current === 'out') {
                setProgress(0);
            } else if (directionRef.current === 'in') {
                setProgress(1);
            }
            animationRef.current = null;
            startTimeRef.current = null;
            directionRef.current = 'stop';
        }
    }, [duration, progress]);

    const startAnimation = useCallback((direction) => {
        // Останавливаем текущую анимацию
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        directionRef.current = direction;
        startTimeRef.current = null;

        // Запускаем новую анимацию
        animationRef.current = requestAnimationFrame(animate);
    }, [animate]);

    const stopAnimation = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        directionRef.current = 'stop';
        startTimeRef.current = null;
    }, []);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return [progress, startAnimation, stopAnimation];
};

// Компонент для отдельной панели
const MenuPanel = ({ title, description, icon, onClick, gradient }) => {
    const [isClicked, setIsClicked] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    const handleClick = () => {
        setIsClicked(true);
        setTimeout(() => {
            setIsClicked(false);
            setTimeout(() => {
                onClick();
            }, 50);
        }, 200);
    };

    // Упрощенные стили как в Profile.ts
    const panelStyle = {
        background: gradient || 'linear-gradient(135deg, #ff6b6b 0%, #c41e3a 100%)',
        padding: '30px 20px',
        borderRadius: '20px',
        cursor: 'pointer',
        textAlign: 'center',
        color: 'white',
        boxShadow: isHovered
            ? '0 15px 35px rgba(0,0,0,0.4), 0 0 15px rgba(255,215,0,0.3)'
            : '0 8px 25px rgba(0,0,0,0.3), 0 0 10px rgba(255,215,0,0.2)',
        transform: isClicked
            ? 'scale(0.95) translateY(5px)'
            : isHovered
                ? 'translateY(-5px)'
                : 'translateY(0)',
        transition: 'all 0.3s ease',
        border: '3px solid rgba(255, 215, 0, 0.4)',
        width: '100%',
        maxWidth: '320px',
        minWidth: '280px',
        margin: '20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Mountains of Christmas", cursive, "Comic Sans MS", sans-serif',
        zIndex: 10
    };

    const iconStyle = {
        fontSize: '56px',
        marginBottom: '20px',
        display: 'block',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.3s ease',
        filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.4))',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
    };

    const titleStyle = {
        fontSize: '26px',
        fontWeight: 'bold',
        marginBottom: '12px',
        textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
        letterSpacing: '1px',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.3s ease'
    };

    const descriptionStyle = {
        fontSize: '16px',
        opacity: '0.95',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        lineHeight: '1.5',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.3s ease'
    };

    return (
        <button
            style={panelStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className="menu-panel"
        >
            <div style={iconStyle}>{icon}</div>
            <div style={titleStyle}>{title}</div>
            <div style={descriptionStyle}>{description}</div>

            {/* Упрощенный эффект блеска */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `radial-gradient(circle at center, transparent 30%, rgba(255,215,0,${isHovered ? 0.15 : 0}) 70%)`,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'none'
            }}></div>
        </button>
    );
};

function MainPage({ currentUser, onLogout, onNavigate }) {
    const [isSnowing, setIsSnowing] = useState(true);

    const containerStyle = {
        padding: '40px 20px',
        width: '100vw',
        height: '100vh',
        minWidth: '1280px',
        minHeight: '800px',
        margin: 0,
        background: 'linear-gradient(135deg, #1a472a 0%, #2d5a3c 25%, #0f2d1e 50%, #1e3d2f 75%, #2d5a3c 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Mountains of Christmas", cursive, "Georgia", serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    };

    const headerStyle = {
        textAlign: 'center',
        color: '#ffd700',
        marginBottom: '80px',
        position: 'relative',
        zIndex: 10,
        width: '100%'
    };

    const panelsContainerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '40px',
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '1200px'
    };

    const userInfoStyle = {
        background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.1) 100%)',
        padding: '25px 40px',
        borderRadius: '60px',
        display: 'inline-block',
        marginBottom: '30px',
        backdropFilter: 'blur(15px)',
        border: '3px solid rgba(255, 215, 0, 0.4)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
    };

    const handleLettersClick = () => {
        onNavigate('letters');
    };

    const handleRoomsClick = () => {
        onNavigate('rooms');
    };

    const handleProfileClick = () => {
        onNavigate('profile');
    };

    // Создаем снежинки
    const snowflakes = Array.from({ length: 40 }, (_, i) => (
        <div
            key={i}
            className="snowflake"
            style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 3 + 5}s`,
                fontSize: `${Math.random() * 10 + 16}px`
            }}
        >❄</div>
    ));

    // Градиенты для кнопок
    const gradients = {
        letters: 'linear-gradient(135deg, #ff6b6b 0%, #c41e3a 50%, #8b0000 100%)',
        rooms: 'linear-gradient(135deg, #2d5a3c 0%, #1e3d2f 50%, #0f2d1e 100%)',
        profile: 'linear-gradient(135deg, #1e3d59 0%, #0f2d4d 50%, #001a33 100%)'
    };

    return (
        <div style={containerStyle}>
            {/* Снег */}
            {isSnowing && snowflakes}

            {/* Фоновый узор */}
            <div className="background-pattern"></div>

            <div style={headerStyle}>
                <div style={userInfoStyle}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '32px',
                        textShadow: '3px 3px 6px rgba(0,0,0,0.6)',
                        color: '#ffd700',
                        background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Хо-хо-хо, приветствую тебя, мой дорогой друг {currentUser?.name}!
                    </h2>
                    <p style={{
                        margin: '15px 0 0 0',
                        fontSize: '22px',
                        color: '#ffffff',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                        fontWeight: 'bold'
                    }}>
                        Желаю тебе приятного времяпрепровождения с друзьями!
                    </p>
                </div>
                <h1 style={{
                    fontSize: '5rem',
                    margin: '40px 0',
                    textShadow: '4px 4px 8px rgba(0,0,0,0.6), 0 0 30px rgba(255,215,0,0.6)',
                    background: 'linear-gradient(45deg, #ff6b6b, #ffd700, #4ecdc4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 'bold',
                    letterSpacing: '2px'
                }}>
                    Главное Меню
                </h1>
            </div>

            <div style={panelsContainerStyle}>
                <MenuPanel
                    title="🎁 Мои письма"
                    description="Напиши письмо Деду Морозу и управляй своими пожеланиями"
                    icon="📮"
                    gradient={gradients.letters}
                    onClick={handleLettersClick}
                />

                <MenuPanel
                    title="❄️ Комнаты"
                    description="Создай волшебную комнату для обмена подарками с друзьями"
                    icon="🏡"
                    gradient={gradients.rooms}
                    onClick={handleRoomsClick}
                />

                <MenuPanel
                    title="🎄 Профиль"
                    description="Настрой свой новогодний профиль и личную информацию"
                    icon="🌟"
                    gradient={gradients.profile}
                    onClick={handleProfileClick}
                />
            </div>

            {/* Стили */}
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap');

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                html, body, #root {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }

                /* Анимации */
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                /* Снежинки */
                .snowflake {
                    position: absolute;
                    top: -30px;
                    color: white;
                    opacity: 0.9;
                    animation: fall linear infinite;
                    z-index: 1;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }

                @keyframes fall {
                    0% {
                        transform: translateY(-30px) rotate(0deg);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }

                /* Фоновый узор */
                .background-pattern {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: 
                        radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.15) 2%, transparent 8%),
                        radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.15) 2%, transparent 8%),
                        radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.2) 3%, transparent 10%),
                        radial-gradient(circle at 30% 70%, rgba(255, 107, 107, 0.15) 2%, transparent 8%),
                        radial-gradient(circle at 70% 30%, rgba(78, 205, 196, 0.15) 2%, transparent 8%);
                    background-size: 400px 400px, 500px 500px, 600px 600px, 350px 350px, 450px 450px;
                    animation: snowflakes 25s linear infinite;
                    z-index: 0;
                }

                @keyframes snowflakes {
                    0% { 
                        background-position: 0px 0px, 0px 0px, 0px 0px, 0px 0px, 0px 0px; 
                    }
                    100% { 
                        background-position: 400px 400px, 500px 500px, 600px 600px, 350px 350px, 450px 450px; 
                    }
                }

                /* Адаптивность для очень маленьких экранов */
                @media (max-width: 1366px) {
                    .menu-panel {
                        max-width: 280px;
                        min-width: 250px;
                    }
                    
                    h1 {
                        font-size: 4rem !important;
                    }
                    
                    .userInfoStyle h2 {
                        font-size: 28px !important;
                    }
                }

                @media (max-width: 1280px) {
                    .menu-panel {
                        max-width: 260px;
                        min-width: 240px;
                        padding: 25px 15px;
                    }
                    
                    h1 {
                        font-size: 3.5rem !important;
                    }
                    
                    .panelsContainerStyle {
                        gap: 25px;
                    }
                }
                `}
            </style>
        </div>
    );
}

export default MainPage;