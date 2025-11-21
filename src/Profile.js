// Profile.js
import React, { useState, useEffect } from 'react';

// Массив с путями к фотографиям (предположим, что они лежат в public/photo_profile/)
const profilePhotos = [
    '/photo_profile/photo1.jpg',
    '/photo_profile/photo2.jpg',
    '/photo_profile/photo3.jpg',
    '/photo_profile/photo4.jpg',
    '/photo_profile/photo5.jpg',
    // Можно добавить больше фотографий
];

function Profile({ currentUser, onLogout, onNavigate, onBack }) {
    const [randomPhoto, setRandomPhoto] = useState('');

    // Выбираем случайную фотографию при загрузке компонента
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * profilePhotos.length);
        setRandomPhoto(profilePhotos[randomIndex]);
    }, []);

    const containerStyle = {
        padding: '40px 20px',
        maxWidth: '600px',
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
    };

    const headerStyle = {
        textAlign: 'center',
        marginBottom: '40px'
    };

    const profileCardStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    };

    const photoStyle = {
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '4px solid white',
        margin: '0 auto 20px',
        display: 'block',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
    };

    const infoRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    };

    const labelStyle = {
        fontWeight: 'bold',
        fontSize: '16px'
    };

    const valueStyle = {
        fontSize: '16px',
        opacity: '0.9'
    };

    const buttonContainerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '15px',
        marginTop: '30px'
    };

    const buttonStyle = {
        flex: 1,
        padding: '15px 20px',
        fontSize: '16px',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        textAlign: 'center'
    };

    const lettersButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#4ecdc4',
        color: 'white'
    };

    const backButtonStyle = {
        ...buttonStyle,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: '2px solid rgba(255, 255, 255, 0.3)'
    };

    const logoutButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#ff6b6b',
        color: 'white'
    };

    // Функции для обработки нажатий кнопок
    const handleLettersClick = () => {
        console.log('Переход на страницу писем');
        onNavigate('letters'); // Теперь это работает!
    };

    const handleBackClick = () => {
        onBack();
    };

    const handleLogoutClick = () => {
        onLogout();
    };

    // Заполняем данные пользователя (если каких-то полей нет, используем 'test')
    const userData = {
        id: currentUser?.id || 'test_12345',
        username: currentUser?.username || 'test_user',
        email: currentUser?.email || 'test@example.com',
        name: currentUser?.name || 'Test User'
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={{
                    fontSize: '2.5rem',
                    marginBottom: '10px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                    👤 Профиль
                </h1>
                <p style={{ fontSize: '1.2rem', opacity: '0.9' }}>
                    Добро пожаловать, {userData.username}!
                </p>
            </div>

            <div style={profileCardStyle}>
                {/* Фотография профиля */}
                {randomPhoto && (
                    <img
                        src={randomPhoto}
                        alt="Profile"
                        style={photoStyle}
                        onError={(e) => {
                            // Если фото не загрузилось, показываем заглушку
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiByeD0iNzUiIGZpbGw9IiNGRjZCNkIiLz4KPHBhdGggZD0iTTc1IDQwQzc4LjgwNTIgNDAgODIuMzY0OSA0MS44NDI4IDg0LjcxOTQgNDQuNzg1N0M4Ny4wNzM5IDQ3LjcyODUgODcuOTkzOSA1MS40Mzc5IDg3LjI1IDU1Qzg2LjU0MTcgNTguNDE2NyA4NC4yNSA2MS4yNSA4MSA2My4xMjVDNzcuNzUgNjUgNzQuMjUgNjYgNzUgNjZDNzUuNzUgNjYgNzIuMjUgNjUgNjkgNjMuMTI1QzY1Ljc1IDYxLjI1IDYzLjQ1ODMgNTguNDE2NyA2Mi43NSA1NUM2Mi4wMDYxIDUxLjQzNzkgNjIuOTI2MSA0Ny43Mjg1IDY1LjI4MDYgNDQuNzg1N0M2Ny42MzUxIDQxLjg0MjggNzEuMTk0OCA0MCA3NSA0MFoiIGZpbGw9IndoaXRlIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iOTUiIHI9IjI1IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
                        }}
                    />
                )}

                {/* Информация о пользователе */}
                <div style={{ marginTop: '20px' }}>
                    <div style={infoRowStyle}>
                        <span style={labelStyle}>ID:</span>
                        <span style={valueStyle}>{userData.id}</span>
                    </div>
                    <div style={infoRowStyle}>
                        <span style={labelStyle}>Логин:</span>
                        <span style={valueStyle}>{userData.username}</span>
                    </div>
                    <div style={infoRowStyle}>
                        <span style={labelStyle}>Почта:</span>
                        <span style={valueStyle}>{userData.email}</span>
                    </div>
                    <div style={infoRowStyle}>
                        <span style={labelStyle}>Имя:</span>
                        <span style={valueStyle}>{userData.name}</span>
                    </div>
                </div>
            </div>

            {/* Кнопки действий */}
            <div style={buttonContainerStyle}>
                <button
                    style={lettersButtonStyle}
                    onClick={handleLettersClick}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    ✉️ Мои письма
                </button>

                <button
                    style={backButtonStyle}
                    onClick={handleBackClick}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    ↩️ Назад
                </button>

                <button
                    style={logoutButtonStyle}
                    onClick={handleLogoutClick}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    🚪 Выйти
                </button>
            </div>
        </div>
    );
}

export default Profile;