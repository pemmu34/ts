// MainPage.js
import React, { useState } from 'react';

// Компонент для отдельной панели
const MenuPanel = ({ title, description, icon, onClick, color }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isClicked, setIsClicked] = useState(false);

    const handleClick = () => {
        // Эффект нажатия
        setIsClicked(true);
        setTimeout(() => {
            setIsClicked(false);
            // Вызываем переданную функцию после анимации
            setTimeout(() => {
                onClick();
            }, 50);
        }, 200);
    };

    const panelStyle = {
        backgroundColor: color || '#4e54c8',
        padding: '30px 20px',
        borderRadius: '15px',
        cursor: 'pointer',
        textAlign: 'center',
        color: 'white',
        boxShadow: isHovered
            ? '0 10px 25px rgba(0,0,0,0.2)'
            : '0 4px 15px rgba(0,0,0,0.1)',
        transform: isClicked
            ? 'scale(0.95) translateY(5px)'
            : isHovered
                ? 'scale(1.05)'
                : 'scale(1)',
        filter: isClicked ? 'brightness(0.9)' : 'brightness(1)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        border: 'none',
        width: '100%',
        maxWidth: '280px',
        margin: '15px',
        position: 'relative',
        overflow: 'hidden'
    };

    const iconStyle = {
        fontSize: '48px',
        marginBottom: '15px',
        display: 'block',
        transform: isHovered ? 'rotate(5deg)' : 'rotate(0)',
        transition: 'transform 0.3s ease'
    };

    const titleStyle = {
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '8px'
    };

    const descriptionStyle = {
        fontSize: '14px',
        opacity: '0.9'
    };

    return (
        <button
            style={panelStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            className="menu-panel"
        >
            <div style={iconStyle}>{icon}</div>
            <div style={titleStyle}>{title}</div>
            <div style={descriptionStyle}>{description}</div>
        </button>
    );
};

function MainPage({ currentUser, onLogout, onNavigate }) {
    const containerStyle = {
        padding: '40px 20px',
        maxWidth: '1000px',
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    const headerStyle = {
        textAlign: 'center',
        color: 'white',
        marginBottom: '50px'
    };

    const panelsContainerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
    };

    const userInfoStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '15px 25px',
        borderRadius: '50px',
        display: 'inline-block',
        marginBottom: '10px',
        backdropFilter: 'blur(10px)'
    };

    // Временные функции для навигации (заглушки)
    const handleLettersClick = () => {
        console.log('Переход на страницу писем');
        onNavigate('letters'); // Теперь это работает!
    };

    const handleRoomsClick = () => {
        console.log('Переход на страницу комнат');
        onNavigate('rooms');
    };

    const handleProfileClick = () => {
        console.log('Переход на страницу профиля');
        onNavigate('profile'); // Теперь передаем конкретную страницу
    };

    return (
        <div style={containerStyle}>
            {/* Кнопка выхода */}
            <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                <button
                    onClick={onLogout}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                >
                    Выйти
                </button>
            </div>

            <div style={headerStyle}>
                <div style={userInfoStyle}>
                    <h2 style={{ margin: 0 }}>Добро пожаловать, {currentUser?.username}!</h2>
                </div>
                <h1 style={{
                    fontSize: '3rem',
                    margin: '20px 0',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                    🎅 Тайный Санта
                </h1>
                <p style={{
                    fontSize: '1.2rem',
                    opacity: '0.9',
                    maxWidth: '600px',
                    margin: '0 auto'
                }}>
                    Выберите раздел для управления вашими рождественскими чудесами
                </p>
            </div>

            <div style={panelsContainerStyle}>
                <MenuPanel
                    title="Мои письма"
                    description="Просмотр и управление вашими письмами"
                    icon="✉️"
                    color="#ff6b6b"
                    onClick={handleLettersClick}
                />

                <MenuPanel
                    title="Комнаты"
                    description="Создание и участие в комнатах"
                    icon="🏠"
                    color="#4ecdc4"
                    onClick={handleRoomsClick}
                />

                <MenuPanel
                    title="Профиль"
                    description="Настройки и личная информация"
                    icon="👤"
                    color="#45b7d1"
                    onClick={handleProfileClick}
                />
            </div>

            {/* Добавляем глобальные стили для анимаций */}
            <style>
                {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          .menu-panel:hover {
            animation: pulse 2s infinite;
          }
        `}
            </style>
        </div>
    );
}

export default MainPage;