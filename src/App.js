// App.js - добавляем глобальные стили
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import Register from './Register';
import MainPage from './MainPage';
import Profile from './Profile';
import LettersPage from './LettersPage';
import RoomsPage from './RoomsPage';
import RoomDetailsPage from './RoomDetailsPage';

const API_BASE = 'localhost:5000';

function App() {
    const [message, setMessage] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [currentPage, setCurrentPage] = useState('main');
    const [currentRoom, setCurrentRoom] = useState(null);
    const [pageProps, setPageProps] = useState({});
    const [showRegister, setShowRegister] = useState(false);

    // Функция для авторизации пользователя
    const handleLogin = async (username, password) => {
        try {
            const response = await axios.post(`${API_BASE}/api/login`, {
                username,
                password
            });

            if (response.data.success) {
                setMessage('Пользователь успешно залогинился');
                setShowSuccessNotification(true);
                setCurrentUser(response.data.user);

                // НЕМЕДЛЕННО логиним пользователя без задержки
                setIsLoggedIn(true);
                setCurrentPage('main');

                // Скрываем уведомление через 3 секунды
                setTimeout(() => {
                    setShowSuccessNotification(false);
                    setMessage('');
                }, 3000);

            } else {
                setMessage('Неверный логин/почта или пароль, попробуйте ещё раз');
            }
        } catch (error) {
            console.error("Ошибка при авторизации:", error);
            setMessage('Ошибка сервера. Попробуйте позже');
        }
    };

    // Функция для регистрации и автоматического входа
    const handleRegister = async (formData) => {
        try {
            const response = await axios.post(`${API_BASE}/api/register`, formData);

            if (response.data.success) {
                setMessage('Регистрация прошла успешно! Выполняется вход...');
                setShowSuccessNotification(true);

                // Автоматически логиним пользователя после успешной регистрации
                const loginResponse = await axios.post(`${API_BASE}/api/login`, {
                    username: formData.username,
                    password: formData.password
                });

                if (loginResponse.data.success) {
                    setCurrentUser(loginResponse.data.user);
                    setIsLoggedIn(true);
                    setCurrentPage('main');
                    setShowRegister(false);

                    // Скрываем уведомление через 3 секунды
                    setTimeout(() => {
                        setShowSuccessNotification(false);
                        setMessage('');
                    }, 3000);
                } else {
                    setMessage('Регистрация успешна, но не удалось войти. Пожалуйста, войдите вручную.');
                }

            } else {
                setMessage(response.data.message || 'Ошибка при регистрации');
            }
        } catch (error) {
            console.error("Ошибка при регистрации:", error);
            if (error.response && error.response.data) {
                setMessage(error.response.data.message);
            } else {
                setMessage('Ошибка сервера. Попробуйте позже');
            }
        }
    };

    // Функция выхода
    const handleLogout = () => {
        setIsLoggedIn(false);
        setMessage('');
        setCurrentUser(null);
        setShowSuccessNotification(false);
        setCurrentPage('main');
        setCurrentRoom(null);
        setPageProps({});
        setShowRegister(false);
    };

    // Функция навигации
    const handleNavigate = (page, roomId = null) => {
        setCurrentPage(page);
        if (roomId) {
            setCurrentRoom(roomId);
            setPageProps({ roomId });
        } else {
            setCurrentRoom(null);
            setPageProps({});
        }
    };

    // Функция возврата на главную
    const handleBackToMain = () => {
        setCurrentPage('main');
        setCurrentRoom(null);
        setPageProps({});
    };

    // Переключение между формой входа и регистрации
    const handleShowRegister = () => {
        setShowRegister(true);
        setMessage('');
    };

    const handleBackToLogin = () => {
        setShowRegister(false);
        setMessage('');
    };

    // Автоматически скрываем уведомление через 3 секунды
    useEffect(() => {
        if (showSuccessNotification) {
            const timer = setTimeout(() => {
                setShowSuccessNotification(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessNotification]);

    // Рендерим соответствующую страницу в зависимости от состояния
    const renderCurrentPage = () => {
        if (!isLoggedIn) {
            return (
                <div className="auth-container">
                    {showRegister ? (
                        <Register
                            onRegister={handleRegister}
                            onBackToLogin={handleBackToLogin}
                            message={message}
                        />
                    ) : (
                        <Login
                            onLogin={handleLogin}
                            onShowRegister={handleShowRegister}
                            message={message}
                        />
                    )}
                </div>
            );
        }

        switch (currentPage) {
            case 'profile':
                return (
                    <Profile
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onNavigate={handleNavigate}
                        onBack={handleBackToMain}
                    />
                );
            case 'letters':
                return (
                    <LettersPage
                        currentUser={currentUser}
                        onNavigate={handleNavigate}
                        onBack={handleBackToMain}
                    />
                );
            case 'rooms':
                return (
                    <RoomsPage
                        currentUser={currentUser}
                        onNavigate={handleNavigate}
                        onBack={handleBackToMain}
                    />
                );
            case 'room-details':
                return (
                    <RoomDetailsPage
                        currentUser={currentUser}
                        roomId={currentRoom || pageProps.roomId}
                        onNavigate={handleNavigate}
                        onBack={() => handleNavigate('rooms')}
                    />
                );
            case 'main':
            default:
                return (
                    <MainPage
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onNavigate={handleNavigate}
                    />
                );
        }
    };

    return (
        <div className="App">
            {/* Уведомление об успешном входе/регистрации */}
            {showSuccessNotification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span>{message}</span>
                    </div>
                    <div style={{
                        marginTop: '8px',
                        height: '3px',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            backgroundColor: 'white',
                            animation: 'progress 3s linear forwards'
                        }}></div>
                    </div>
                </div>
            )}

            {/* Основной контент */}
            {renderCurrentPage()}

            {/* Глобальные стили для новогодней темы */}
            <style jsx global>{`
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Arial', sans-serif;
                    overflow: hidden;
                }

                .auth-container {
                    width: 100vw;
                    height: 100vh;
                    background: linear-gradient(135deg, 
                        #1a472a 0%, 
                        #2d5a3c 25%, 
                        #0f2d1e 50%, 
                        #1e3d2f 75%, 
                        #2d5a3c 100%);
                    background-size: 400% 400%;
                    animation: gradientShift 15s ease infinite;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    overflow: hidden;
                }

                .auth-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: 
                        radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 2%, transparent 5%),
                        radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 2%, transparent 5%),
                        radial-gradient(circle at 40% 40%, rgba(255, 215, 0, 0.1) 3%, transparent 6%);
                    background-size: 300px 300px, 400px 400px, 500px 500px;
                    animation: snowflakes 20s linear infinite;
                }

                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                @keyframes snowflakes {
                    0% { background-position: 0px 0px, 0px 0px, 0px 0px; }
                    100% { background-position: 300px 300px, 400px 400px, 500px 500px; }
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }

                @keyframes candyStripe {
                    0% { background-position: 0 0; }
                    100% { background-position: 40px 0; }
                }
            `}</style>
        </div>
    );
}

export default App;