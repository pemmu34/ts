// Profile.js
import React, { useState, useEffect } from 'react';
const API_BASE = 'http://localhost:5000';
// Массив с путями к фотографиям (предположим, что они лежат в public/photo_profile/)
const profilePhotos = [
    'https://i.pinimg.com/736x/51/ef/e4/51efe4e84874a9ab38abc516988882bc.jpg',
    'https://i.pinimg.com/736x/33/30/98/333098172641f2761696e46404f61835.jpg',
    'https://i.pinimg.com/originals/81/07/44/81074484c0dc5bf74168462b7e2403f6.jpg',
    'https://i.pinimg.com/originals/f1/51/1b/f1511b6ad3fb7b2f7aeeaa285908014c.jpg',
    'https://i.pinimg.com/736x/03/ba/f6/03baf68738c92530f2feb1f48189037e.jpg',
    'https://avatars.mds.yandex.net/i?id=bf91d7caf3b439fda830896c972880a6_l-16494489-images-thumbs&n=13'
];

function Profile({ currentUser, onLogout, onNavigate, onBack }) {
    const [randomPhoto, setRandomPhoto] = useState('');
    const [isSnowing, setIsSnowing] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userData, setUserData] = useState({
        id: currentUser?.id || 'test_12345',
        username: currentUser?.username || 'test_user',
        mail: currentUser?.mail || 'test@example.com',
        name: currentUser?.name || 'Test User'
    });

    // Выбираем случайную фотографию при загрузке компонента
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * profilePhotos.length);
        setRandomPhoto(profilePhotos[randomIndex]);
    }, []);

    // Обновляем userData при изменении currentUser
    useEffect(() => {
        setUserData({
            id: currentUser?.id || 'test_12345',
            username: currentUser?.username || 'test_user',
            mail: currentUser?.mail || 'test@example.com',
            name: currentUser?.name || 'Test User'
        });
    }, [currentUser]);

    // Функция для смены аватара
    const handlePhotoClick = () => {
        // Получаем случайный индекс, отличный от текущего
        let newRandomIndex;
        do {
            newRandomIndex = Math.floor(Math.random() * profilePhotos.length);
        } while (profilePhotos[newRandomIndex] === randomPhoto && profilePhotos.length > 1);

        setRandomPhoto(profilePhotos[newRandomIndex]);

        // Добавляем анимацию "пульсации" при смене фото
        const imgElement = document.querySelector('img[alt="Profile"]');
        if (imgElement) {
            imgElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                imgElement.style.transform = 'scale(1)';
            }, 300);
        }
    };

    const handleNameClick = () => {
        setIsEditingName(true);
        setNewName(userData.name);
    };

    const handleSaveName = async () => {
        if (!newName.trim()) {
            alert('Имя не может быть пустым');
            return;
        }

        if (newName === userData.name) {
            setIsEditingName(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/user/update-name`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userData.id,
                    new_name: newName.trim()
                })
            });

            // Проверяем Content-Type ответа
            const contentType = response.headers.get('content-type');

            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Сервер вернул не JSON:', text);
                throw new Error('Сервер вернул некорректный ответ');
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Ошибка сервера');
            }

            if (result.success) {
                setUserData(prev => ({ ...prev, name: newName.trim() }));
                // Если нужно обновить в родительском компоненте
                if (currentUser) {
                    currentUser.name = newName.trim();
                }
                console.log('✅ Имя успешно обновлено');
            } else {
                throw new Error(result.message || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Ошибка при обновлении имени:', error);
            alert('Ошибка при обновлении имени: ' + error.message);
        } finally {
            setIsLoading(false);
            setIsEditingName(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingName(false);
        setNewName('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    // ... остальные стили и функции остаются без изменений ...

    const containerStyle = {
        padding: '40px 20px',
        width: '100vw',
        height: '100vh',
        minWidth: '1280px',
        minHeight: '800px',
        margin: 0,
        background: 'linear-gradient(135deg, #0a0f2d 0%, #1a1f38 25%, #0c1445 50%, #1a1f38 75%, #0a0f2d 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 12s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    };

    const headerStyle = {
        textAlign: 'center',
        marginBottom: '40px',
        position: 'relative',
        zIndex: 10
    };

    const profileCardStyle = {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '35px 30px',
        marginBottom: '30px',
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4), 0 0 15px rgba(100, 150, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        width: '100%',
        maxWidth: '480px',
        position: 'relative',
        zIndex: 10
    };

    const photoStyle = {
        width: '160px',
        height: '160px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        margin: '0 auto 20px',
        display: 'block',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4), 0 0 10px rgba(100, 150, 255, 0.3)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
    };

    const infoRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease'
    };

    const labelStyle = {
        fontWeight: 'bold',
        fontSize: '16px',
        color: '#a8d8ff',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
    };

    const valueStyle = {
        fontSize: '16px',
        color: 'white',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        fontWeight: 'normal',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    };

    const editInputStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '6px',
        padding: '6px 10px',
        color: 'white',
        fontSize: '16px',
        width: '150px',
        outline: 'none',
        backdropFilter: 'blur(10px)'
    };

    const buttonContainerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        marginTop: '30px',
        width: '100%',
        maxWidth: '480px'
    };

    const buttonBaseStyle = {
        flex: 1,
        padding: '14px 18px',
        fontSize: '15px',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden'
    };

    const editButtonStyle = {
        background: 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        marginLeft: '8px',
        fontSize: '12px',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)'
    };



    const lettersButtonStyle = {
        ...buttonBaseStyle,
        background: 'linear-gradient(135deg, #2d5a3c 0%, #1e3d2f 50%, #0f2d1e 100%)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    };

    const backButtonStyle = {
        ...buttonBaseStyle,
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)'
    };

    const logoutButtonStyle = {
        ...buttonBaseStyle,
        background: 'linear-gradient(135deg, #8b0000 0%, #660000 50%, #450000 100%)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    };

    // Функции для обработки нажатий кнопок
    const handleLettersClick = () => {
        onNavigate('letters');
    };

    const handleBackClick = () => {
        onBack();
    };

    const handleLogoutClick = () => {
        onLogout();
    };

    // Создаем снежинки для фона
    const snowflakes = Array.from({ length: 20 }, (_, i) => (
        <div
            key={i}
            className="snowflake"
            style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 3 + 5}s`,
                fontSize: `${Math.random() * 6 + 10}px`
            }}
        >❄</div>
    ));

    // Создаем летающие эмодзи
    const flyingEmojis = [
        { emoji: '⛄', size: '2.5em', animation: 'fly1' },
        { emoji: '🎁', size: '2.2em', animation: 'fly2' },
        { emoji: '⭐', size: '2em', animation: 'fly3' },
        { emoji: '❄️', size: '1.8em', animation: 'fly4' },
        { emoji: '🔔', size: '2.3em', animation: 'fly5' },
        { emoji: '🎄', size: '2.7em', animation: 'fly6' }
    ];

    return (
        <div style={containerStyle}>
            {/* Снежинки на фоне */}
            {isSnowing && snowflakes}

            {/* Фоновый узор */}
            <div className="background-pattern"></div>

            {/* Летающие эмодзи */}
            {flyingEmojis.map((item, index) => (
                <div
                    key={index}
                    className={`flying-emoji ${item.animation}`}
                    style={{
                        fontSize: item.size,
                        animationDelay: `${index * 2}s`
                    }}
                >
                    {item.emoji}
                </div>
            ))}

            <div style={headerStyle}>
                <h1 style={{
                    fontSize: '2.8rem',
                    marginBottom: '12px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.6), 0 0 15px rgba(100, 150, 255, 0.5)',
                    color: '#a8d8ff',
                    background: 'linear-gradient(45deg, #a8d8ff, #ffffff, #a8d8ff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 'bold'
                }}>
                    Мой Профиль
                </h1>
                <p style={{
                    fontSize: '1.2rem',
                    color: '#e0e0e0',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    margin: 0
                }}>
                    Добро пожаловать, {userData.name}!
                </p>
            </div>

            <div style={profileCardStyle}>
                {/* Фотография профиля */}
                {/* Фотография профиля */}
                {randomPhoto && (
                    <img
                        src={randomPhoto}
                        alt="Profile"
                        style={photoStyle}
                        onClick={handlePhotoClick}
                        onError={(e) => {
                            e.target.src = 'https://i.pinimg.com/736x/87/33/b8/8733b8128bc7feba14e8102d10af1e49.jpg';
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                            e.target.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(100, 150, 255, 0.4)';
                            e.target.style.cursor = 'pointer';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.4), 0 0 10px rgba(100, 150, 255, 0.3)';
                        }}
                        title="Нажмите, чтобы сменить аватар"
                    />
                )}

                {/* Информация о пользователе */}
                <div style={{ marginTop: '15px' }}>
                    <div style={infoRowStyle}
                         onMouseEnter={(e) => {
                             e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                             e.target.style.transform = 'translateX(3px)';
                         }}
                         onMouseLeave={(e) => {
                             e.target.style.backgroundColor = 'transparent';
                             e.target.style.transform = 'translateX(0)';
                         }}>
                        <span style={labelStyle}>ID:</span>
                        <span style={valueStyle}>{userData.id}</span>
                    </div>
                    <div style={infoRowStyle}
                         onMouseEnter={(e) => {
                             e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                             e.target.style.transform = 'translateX(3px)';
                         }}
                         onMouseLeave={(e) => {
                             e.target.style.backgroundColor = 'transparent';
                             e.target.style.transform = 'translateX(0)';
                         }}>
                        <span style={labelStyle}>Логин:</span>
                        <span style={valueStyle}>{userData.username}</span>
                    </div>
                    <div style={infoRowStyle}
                         onMouseEnter={(e) => {
                             e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                             e.target.style.transform = 'translateX(3px)';
                         }}
                         onMouseLeave={(e) => {
                             e.target.style.backgroundColor = 'transparent';
                             e.target.style.transform = 'translateX(0)';
                         }}>
                        <span style={labelStyle}>Почта:</span>
                        <span style={valueStyle}>{userData.mail}</span>
                    </div>
                    <div style={infoRowStyle}
                         onMouseEnter={(e) => {
                             e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                             e.target.style.transform = 'translateX(3px)';
                         }}
                         onMouseLeave={(e) => {
                             e.target.style.backgroundColor = 'transparent';
                             e.target.style.transform = 'translateX(0)';
                         }}>
                        <span style={labelStyle}>Имя:</span>
                        {isEditingName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    style={editInputStyle}
                                    autoFocus
                                    disabled={isLoading}
                                />
                                {newName !== userData.name && newName.trim() && (
                                    <button
                                        onClick={handleSaveName}
                                        disabled={isLoading}
                                        style={{
                                            ...editButtonStyle,
                                            background: isLoading ? 'rgba(100, 100, 100, 0.3)' : 'rgba(76, 175, 80, 0.3)',
                                            cursor: isLoading ? 'not-allowed' : 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isLoading) {
                                                e.target.style.background = 'rgba(76, 175, 80, 0.5)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isLoading) {
                                                e.target.style.background = 'rgba(76, 175, 80, 0.3)';
                                            }
                                        }}
                                    >
                                        {isLoading ? '⏳' : '✓'}
                                    </button>
                                )}
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isLoading}
                                    style={{
                                        ...editButtonStyle,
                                        background: 'rgba(244, 67, 54, 0.3)',
                                        cursor: isLoading ? 'not-allowed' : 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading) {
                                            e.target.style.background = 'rgba(244, 67, 54, 0.5)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isLoading) {
                                            e.target.style.background = 'rgba(244, 67, 54, 0.3)';
                                        }
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <span
                                style={valueStyle}
                                onClick={handleNameClick}
                                onMouseEnter={(e) => {
                                    e.target.style.color = '#a8d8ff';
                                    e.target.style.textShadow = '0 0 8px rgba(168, 216, 255, 0.7)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.color = 'white';
                                    e.target.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
                                }}
                            >
                                {userData.name}
                            </span>
                        )}
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
                        e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                    }}
                >
                    📮 Мои письма
                </button>

                <button
                    style={backButtonStyle}
                    onClick={handleBackClick}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                >
                    ↩️ Назад
                </button>

                <button
                    style={logoutButtonStyle}
                    onClick={handleLogoutClick}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                    }}
                >
                    🚪 Выйти
                </button>
            </div>

            {/* Стили */}
            <style>
                {`
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
                    top: -20px;
                    color: rgba(255, 255, 255, 0.7);
                    animation: fall linear infinite;
                    z-index: 1;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }

                @keyframes fall {
                    0% {
                        transform: translateY(-20px) rotate(0deg);
                        opacity: 0.7;
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
                        radial-gradient(circle at 10% 20%, rgba(100, 150, 255, 0.1) 1%, transparent 5%),
                        radial-gradient(circle at 90% 80%, rgba(100, 150, 255, 0.1) 1%, transparent 5%),
                        radial-gradient(circle at 50% 50%, rgba(150, 200, 255, 0.08) 2%, transparent 6%),
                        radial-gradient(circle at 30% 70%, rgba(100, 150, 255, 0.1) 1%, transparent 5%);
                    background-size: 400px 400px, 500px 500px, 600px 600px, 350px 350px;
                    animation: snowflakes 25s linear infinite;
                    z-index: 0;
                }

                @keyframes snowflakes {
                    0% { 
                        background-position: 0px 0px, 0px 0px, 0px 0px, 0px 0px; 
                    }
                    100% { 
                        background-position: 400px 400px, 500px 500px, 600px 600px, 350px 350px; 
                    }
                }

                /* Летающие эмодзи */
                .flying-emoji {
                    position: absolute;
                    z-index: 2;
                    opacity: 0.7;
                    filter: drop-shadow(1px 1px 3px rgba(0,0,0,0.3));
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }

                @keyframes fly1 {
                    0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.7; }
                    90% { opacity: 0.7; }
                    100% { transform: translate(80vw, 70vh) rotate(360deg); opacity: 0; }
                }

                @keyframes fly2 {
                    0% { transform: translate(90vw, 10vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.7; }
                    90% { opacity: 0.7; }
                    100% { transform: translate(10vw, 80vh) rotate(-360deg); opacity: 0; }
                }

                @keyframes fly3 {
                    0% { transform: translate(50vw, 90vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.7; }
                    90% { opacity: 0.7; }
                    100% { transform: translate(70vw, 20vh) rotate(180deg); opacity: 0; }
                }

                @keyframes fly4 {
                    0% { transform: translate(20vw, 80vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.7; }
                    90% { opacity: 0.7; }
                    100% { transform: translate(80vw, 40vh) rotate(-180deg); opacity: 0; }
                }

                @keyframes fly5 {
                    0% { transform: translate(80vw, 30vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.7; }
                    90% { opacity: 0.7; }
                    100% { transform: translate(20vw, 60vh) rotate(270deg); opacity: 0; }
                }

                @keyframes fly6 {
                    0% { transform: translate(10vw, 40vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.7; }
                    90% { opacity: 0.7; }
                    100% { transform: translate(60vw, 90vh) rotate(-270deg); opacity: 0; }
                }

                .fly1 { animation-name: fly1; animation-duration: 25s; }
                .fly2 { animation-name: fly2; animation-duration: 30s; }
                .fly3 { animation-name: fly3; animation-duration: 35s; }
                .fly4 { animation-name: fly4; animation-duration: 28s; }
                .fly5 { animation-name: fly5; animation-duration: 32s; }
                .fly6 { animation-name: fly6; animation-duration: 27s; }

                /* Адаптивность */
                @media (max-width: 1366px) {
                    .profileCardStyle {
                        max-width: 440px;
                    }
                    
                    h1 {
                        font-size: 2.5rem !important;
                    }
                }

                @media (max-width: 1280px) {
                    .profileCardStyle {
                        max-width: 400px;
                        padding: 30px 25px;
                    }
                    
                    h1 {
                        font-size: 2.2rem !important;
                    }
                    
                    .buttonContainerStyle {
                        max-width: 400px;
                    }
                }
                `}
            </style>
        </div>
    );
}

export default Profile;