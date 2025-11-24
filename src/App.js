// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import MainPage from './MainPage';
import Profile from './Profile';
import LettersPage from './LettersPage';
import RoomsPage from './RoomsPage';
import RoomDetailsPage from './RoomDetailsPage';

const API_BASE = 'http://localhost:5000';

function App() {
    const [message, setMessage] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [currentPage, setCurrentPage] = useState('main');
    const [currentRoom, setCurrentRoom] = useState(null);
    const [pageProps, setPageProps] = useState({}); // Добавлено: определение pageProps

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

                // Через 3 секунды скрываем уведомление и переходим на главную страницу
                setTimeout(() => {
                    setShowSuccessNotification(false);
                    setIsLoggedIn(true);
                    setCurrentPage('main');
                    setMessage('');
                }, 3000);

            } else {
                setMessage('Неверный ввод логина/пароля, попробуйте ещё раз');
            }
        } catch (error) {
            console.error("Ошибка при авторизации:", error);
            setMessage('Ошибка сервера. Попробуйте позже');
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
        setPageProps({}); // Очищаем pageProps при выходе
    };

    // Функция навигации
    const handleNavigate = (page, roomId = null) => {
        setCurrentPage(page);
        if (roomId) {
            setCurrentRoom(roomId);
            setPageProps({ roomId }); // Сохраняем roomId в pageProps
        } else {
            setCurrentRoom(null);
            setPageProps({}); // Очищаем pageProps
        }
    };

    // Функция возврата на главную
    const handleBackToMain = () => {
        setCurrentPage('main');
        setCurrentRoom(null);
        setPageProps({}); // Очищаем pageProps
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
                <div style={{padding: '20px', maxWidth: '400px', margin: '0 auto'}}>
                    <h1>Система авторизации</h1>
                    <Login onLogin={handleLogin} message={message} />
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
                        roomId={currentRoom || pageProps.roomId} // Используем currentRoom или pageProps.roomId
                        onNavigate={handleNavigate} // Используем handleNavigate вместо navigateTo
                        onBack={() => handleNavigate('rooms')} // Используем handleNavigate вместо navigateTo
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
            {/* Уведомление об успешном входе */}
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
                        <span>Вход выполнен успешно! Перенаправляем...</span>
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

            {/* Стили для анимаций */}
            <style>
                {`
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
                `}
            </style>
        </div>
    );
}

export default App;