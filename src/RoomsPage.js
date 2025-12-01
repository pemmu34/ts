// RoomsPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

function RoomsPage({ currentUser, onNavigate, onBack }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [password, setPassword] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [joining, setJoining] = useState(false);

    // Новые состояния для создания комнаты
    const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [roomPassword, setRoomPassword] = useState('');
    const [creating, setCreating] = useState(false);

    // Загрузка комнат при монтировании
    useEffect(() => {
        if (!currentUser || !currentUser.id) {
            setError('Пользователь не авторизован');
            setLoading(false);
            return;
        }

        fetchRooms();
    }, [currentUser]);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            setError('');

            if (!currentUser?.id) {
                setError('Пользователь не авторизован');
                setLoading(false);
                return;
            }

            console.log('🔄 Загрузка комнат для пользователя:', currentUser.id);

            const response = await axios.get(`${API_BASE}/api/rooms/all`, {
                params: {
                    user_id: currentUser.id
                }
            });

            console.log('✅ Ответ от сервера:', response.data);

            if (response.data.success) {
                setRooms(response.data.rooms || []);
                if (response.data.rooms.length === 0) {
                    console.log('ℹ️ Комнат не найдено');
                }
            } else {
                setError('Ошибка загрузки комнат: ' + (response.data.message || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('❌ Ошибка при загрузке комнат:', error);
            if (error.response?.status === 400) {
                setError('ID пользователя обязателен');
            } else if (error.response?.data?.message) {
                setError('Ошибка сервера: ' + error.response.data.message);
            } else if (error.request) {
                setError('Не удалось подключиться к серверу');
            } else {
                setError('Ошибка загрузки комнат: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Открытие модального окна для ввода пароля
    const openPasswordModal = (room) => {
        setSelectedRoom(room);
        setPassword('');
        setShowPasswordModal(true);
        setError('');
    };

    // Закрытие модального окна
    const closePasswordModal = () => {
        setShowPasswordModal(false);
        setSelectedRoom(null);
        setPassword('');
        setError('');
    };

    // Открытие модального окна создания комнаты
    const openCreateRoomModal = () => {
        setRoomName('');
        setRoomPassword('');
        setShowCreateRoomModal(true);
        setError('');
    };

    // Закрытие модального окна создания комнаты
    const closeCreateRoomModal = () => {
        setShowCreateRoomModal(false);
        setRoomName('');
        setRoomPassword('');
        setError('');
    };

    // Создание новой комнаты
    const handleCreateRoom = async () => {
        if (!roomName.trim()) {
            setError('Введите название комнаты');
            return;
        }

        if (!roomPassword.trim()) {
            setError('Введите пароль комнаты');
            return;
        }

        try {
            setCreating(true);
            setError('');

            const response = await axios.post(`${API_BASE}/api/rooms`, {
                name_room: roomName.trim(),
                pass_room: roomPassword.trim(),
                created_by: currentUser?.id
            });

            if (response.data.success) {
                closeCreateRoomModal();
                // Обновляем список комнат
                fetchRooms();
                // Переходим на страницу созданной комнаты
                onNavigate('room-details', response.data.room.id_room);
            } else {
                setError(response.data.message || 'Ошибка при создании комнаты');
            }
        } catch (error) {
            console.error('Ошибка при создании комнаты:', error);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Ошибка соединения с сервером');
            }
        } finally {
            setCreating(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!password.trim()) {
            setError('Введите пароль комнаты');
            return;
        }

        // Проверяем, что выбрана комната
        if (!selectedRoom) {
            setError('Комната не выбрана');
            return;
        }

        try {
            setJoining(true);
            setError('');

            const response = await axios.post(`${API_BASE}/api/rooms/join`, {
                room_id: selectedRoom.id_room, // Передаем ID выбранной комнаты
                pass_room: password.trim(),
                user_id: currentUser?.id
            });

            if (response.data.success) {
                closePasswordModal();
                // Обновляем список комнат
                fetchRooms();
                // Переходим на страницу комнаты
                onNavigate('room-details', response.data.room.id_room);
            } else {
                setError(response.data.message || 'Ошибка при присоединении к комнате');
            }
        } catch (error) {
            console.error('Ошибка при присоединении к комнате:', error);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Ошибка соединения с сервером');
            }
        } finally {
            setJoining(false);
        }
    };

    // Новые стили в синих тонах с прозрачностью и блюром
    const containerStyle = {
        padding: '40px 20px',
        width: '100vw',
        height: '100vh',
        minWidth: '1280px',
        minHeight: '800px',
        margin: 0,
        background: 'linear-gradient(135deg, #0a0f2d 0%, #1a1f38 25%, #0c1445 50%, #1a1f38 75%, #0a0f2d 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
        position: 'relative',
        overflow: 'auto',
        fontFamily: 'Arial, sans-serif'
    };

    const headerStyle = {
        textAlign: 'center',
        marginBottom: '40px',
        position: 'relative',
        zIndex: 10
    };

    const controlsStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '30px',
        gap: '20px',
        position: 'relative',
        zIndex: 10
    };

    const addButtonStyle = {
        padding: '15px 30px',
        background: 'linear-gradient(135deg, #6496ff 0%, #4a7dff 100%)',
        color: 'white',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '15px',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif',
        backdropFilter: 'blur(10px)'
    };

    const roomsPanelStyle = {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(15px)',
        borderRadius: '20px',
        padding: '25px',
        width: '90%',
        height: '100vh',
        minHeight: '300px',
        maxHeight: '500px',
        maxWidth: '800px',
        margin: '0 auto',
        overflowY: 'auto',
        marginBottom: '30px',
        border: '3px solid rgba(100, 150, 255, 0.3)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 10
    };

    const modalOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    };

    const modalContentStyle = {
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(20px)',
        padding: '40px',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        color: 'white',
        border: '3px solid rgba(100, 150, 255, 0.5)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(100, 150, 255, 0.3)',
        position: 'relative',
        fontFamily: 'Arial, sans-serif'
    };

    const inputStyle = {
        width: '100%',
        padding: '15px',
        marginBottom: '20px',
        border: '2px solid rgba(100, 150, 255, 0.5)',
        borderRadius: '10px',
        fontSize: '16px',
        boxSizing: 'border-box',
        background: 'rgba(255, 255, 255, 0.1)',
        fontFamily: 'Arial, sans-serif',
        color: 'white',
        backdropFilter: 'blur(10px)'
    };

    const modalButtonsStyle = {
        display: 'flex',
        gap: '15px',
        justifyContent: 'flex-end',
        marginTop: '25px'
    };

    const actionButtonStyle = {
        padding: '12px 25px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        fontFamily: 'Arial, sans-serif',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)'
    };

    const bottomButtonsStyle = {
        display: 'flex',
        justifyContent: 'center',
        gap: '25px',
        marginTop: '30px',
        position: 'relative',
        zIndex: 10
    };

    const bottomButtonStyle = {
        padding: '15px 30px',
        background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.3) 0%, rgba(74, 125, 255, 0.3) 100%)',
        color: 'white',
        border: '3px solid rgba(100, 150, 255, 0.5)',
        borderRadius: '15px',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif',
        backdropFilter: 'blur(10px)'
    };

    const errorStyle = {
        color: '#ff6b6b',
        textAlign: 'center',
        marginBottom: '20px',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '15px',
        borderRadius: '10px',
        border: '2px solid #ff6b6b',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 10
    };

    return (
        <div style={containerStyle}>
            {/* Фоновый узор */}
            <div className="background-pattern"></div>

            {/* Заголовок */}
            <div style={headerStyle}>
                <h1 style={{
                    fontSize: '4rem',
                    marginBottom: '20px',
                    textShadow: '4px 4px 8px rgba(0,0,0,0.6), 0 0 30px rgba(100, 150, 255, 0.6)',
                    background: 'linear-gradient(45deg, #6496ff, #a8d8ff, #4ecdc4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 'bold',
                    letterSpacing: '2px'
                }}>
                    🏡 Волшебные Комнаты
                </h1>
                <p style={{
                    fontSize: '1.5rem',
                    color: '#a8d8ff',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    margin: 0
                }}>
                    Создай комнату или присоединись к существующей для обмена подарками!
                </p>
            </div>

            {/* Кнопка создания комнаты */}
            <div style={controlsStyle}>
                <button
                    style={addButtonStyle}
                    onClick={openCreateRoomModal}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1) translateY(-3px)';
                        e.target.style.boxShadow = '0 12px 25px rgba(0,0,0,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1) translateY(0)';
                        e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                    }}
                >
                    🎄 Создать новую комнату
                </button>
            </div>

            {/* Сообщения об ошибках */}
            {error && (
                <div style={errorStyle}>
                    {error}
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                {/* Панель с комнатами */}
                <div style={roomsPanelStyle} className="custom-scrollbar">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <p style={{ color: '#a8d8ff', fontSize: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                                🎄 Загрузка комнат...
                            </p>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <p style={{ color: '#a8d8ff', fontSize: '18px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                                🏠 Пока нет доступных комнат. Создайте первую комнату!
                            </p>
                        </div>
                    ) : (
                        rooms.map(room => (
                            <RoomItem
                                key={room.id_room}
                                room={room}
                                onSelect={openPasswordModal}
                            />
                        ))
                    )}
                </div>
            </div>


            {/* Модальное окно создания комнаты */}
            {showCreateRoomModal && (
                <div style={modalOverlayStyle} onClick={closeCreateRoomModal}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()} className="custom-scrollbar">
                        <h2 style={{
                            marginTop: 0,
                            color: '#a8d8ff',
                            textAlign: 'center',
                            borderBottom: '2px solid rgba(100, 150, 255, 0.5)',
                            paddingBottom: '15px',
                            fontSize: '28px',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            🎄 Создание комнаты
                        </h2>

                        {error && (
                            <div style={{...errorStyle, color: '#ff6b6b', marginBottom: '20px', borderColor: '#ff6b6b'}}>
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Название комнаты..."
                            value={roomName}
                            onChange={(e) => {
                                setRoomName(e.target.value);
                                setError('');
                            }}
                            style={inputStyle}
                        />

                        <input
                            type="text"
                            placeholder="Пароль для входа в комнату..."
                            value={roomPassword}
                            onChange={(e) => {
                                setRoomPassword(e.target.value);
                                setError('');
                            }}
                            style={inputStyle}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleCreateRoom();
                                }
                            }}
                        />

                        <div style={modalButtonsStyle}>
                            <button
                                style={{
                                    ...actionButtonStyle,
                                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                                    color: 'white'
                                }}
                                onClick={closeCreateRoomModal}
                                disabled={creating}
                                onMouseEnter={(e) => {
                                    if (!creating) {
                                        e.target.style.transform = 'translateY(-2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                Отмена
                            </button>
                            <button
                                style={{
                                    ...actionButtonStyle,
                                    background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
                                    color: 'white',
                                    opacity: (creating || !roomName.trim() || !roomPassword.trim()) ? 0.6 : 1
                                }}
                                onClick={handleCreateRoom}
                                disabled={creating || !roomName.trim() || !roomPassword.trim()}
                                onMouseEnter={(e) => {
                                    if (!creating && roomName.trim() && roomPassword.trim()) {
                                        e.target.style.transform = 'translateY(-2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                {creating ? '🎄 Создание...' : '✨ Создать комнату'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно ввода пароля для входа в существующую комнату */}
            {showPasswordModal && (
                <div style={modalOverlayStyle} onClick={closePasswordModal}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()} className="custom-scrollbar">
                        <h2 style={{
                            marginTop: 0,
                            color: '#a8d8ff',
                            textAlign: 'center',
                            borderBottom: '2px solid rgba(100, 150, 255, 0.5)',
                            paddingBottom: '15px',
                            fontSize: '28px',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            🚪 Вход в комнату
                        </h2>
                        <p style={{
                            color: '#a8d8ff',
                            textAlign: 'center',
                            marginBottom: '20px',
                            fontSize: '20px',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                        }}>
                            {selectedRoom?.name_room}
                        </p>

                        {error && (
                            <div style={{...errorStyle, color: '#ff6b6b', marginBottom: '20px', borderColor: '#ff6b6b'}}>
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Пароль комнаты..."
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            style={inputStyle}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleJoinRoom();
                                }
                            }}
                        />

                        <div style={modalButtonsStyle}>
                            <button
                                style={{
                                    ...actionButtonStyle,
                                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                                    color: 'white'
                                }}
                                onClick={closePasswordModal}
                                disabled={joining}
                                onMouseEnter={(e) => {
                                    if (!joining) {
                                        e.target.style.transform = 'translateY(-2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                Отмена
                            </button>
                            <button
                                style={{
                                    ...actionButtonStyle,
                                    background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
                                    color: 'white',
                                    opacity: joining ? 0.6 : 1
                                }}
                                onClick={handleJoinRoom}
                                disabled={joining || !password.trim()}
                                onMouseEnter={(e) => {
                                    if (!joining && password.trim()) {
                                        e.target.style.transform = 'translateY(-2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                {joining ? '🎄 Вход...' : '✨ Войти в комнату'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Кнопки навигации */}
            <div style={bottomButtonsStyle}>
                <button
                    style={bottomButtonStyle}
                    onClick={onBack}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                    }}
                >
                    ↩️ Назад в меню
                </button>

                <button
                    style={bottomButtonStyle}
                    onClick={() => onNavigate('letters')}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                    }}
                >
                    ✉️ Мои письма
                </button>

                <button
                    style={bottomButtonStyle}
                    onClick={() => onNavigate('profile')}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                    }}
                >
                    👤 Мой профиль
                </button>
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
                        radial-gradient(circle at 50% 50%, rgba(168, 216, 255, 0.08) 2%, transparent 6%),
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

                /* Стилизация скроллбара */
                ::-webkit-scrollbar {
                    width: 12px;
                }

                ::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    margin: 5px;
                }

                ::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #6496ff, #4a7dff);
                    border-radius: 10px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #7aa3ff, #5b88ff);
                }

                /* Для Firefox */
                * {
                    scrollbar-width: thin;
                    scrollbar-color: #6496ff rgba(255, 255, 255, 0.1);
                }

                /* Гарантируем, что скроллбар всегда виден для элементов с прокруткой */
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #6496ff rgba(255, 255, 255, 0.1);
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 12px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    margin: 5px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #6496ff, #4a7dff);
                    border-radius: 10px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #7aa3ff, #5b88ff);
                }

                /* Адаптивность */
                @media (max-width: 1366px) {
                    .containerStyle {
                        padding: 30px 15px;
                    }
                    
                    h1 {
                        font-size: 3rem !important;
                    }
                    
                    .roomsPanelStyle {
                        max-height: 450px;
                    }
                }

                @media (max-width: 1280px) {
                    h1 {
                        font-size: 2.5rem !important;
                    }
                    
                    .addButtonStyle {
                        padding: 12px 25px;
                        font-size: 16px;
                    }
                    
                    .bottomButtonStyle {
                        padding: 12px 25px;
                        font-size: 16px;
                    }
                }
                `}
            </style>
        </div>
    );
}

// Компонент для отображения отдельной комнаты
const RoomItem = ({ room, onSelect }) => {
    const [isHovered, setIsHovered] = useState(false);

    const roomItemStyle = {
        background: isHovered
            ? 'linear-gradient(135deg, rgba(100, 150, 255, 0.2) 0%, rgba(74, 125, 255, 0.2) 100%)'
            : 'rgba(255, 255, 255, 0.1)',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '15px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-5px) scale(1.02)' : 'translateY(0) scale(1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        border: isHovered ? '2px solid rgba(100, 150, 255, 0.5)' : '2px solid transparent',
        boxShadow: isHovered ? '0 8px 25px rgba(0,0,0,0.4)' : '0 4px 15px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)'
    };

    return (
        <div
            style={roomItemStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(room)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{
                        margin: '0 0 10px 0',
                        fontSize: '1.5rem',
                        color: '#a8d8ff',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        {room.name_room}
                    </h3>
                    <p style={{
                        margin: '0 0 8px 0',
                        opacity: 0.9,
                        color: 'white',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                    }}>
                        🎅 Создатель: {room.creator_name}
                    </p>
                    <p style={{
                        margin: 0,
                        opacity: 0.9,
                        color: 'white',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                    }}>
                        👥 Участников: {room.participants_count}
                    </p>
                </div>
                <div style={{
                    fontSize: '28px',
                    transform: isHovered ? 'translateX(5px) scale(1.2)' : 'translateX(0) scale(1)',
                    transition: 'transform 0.3s ease',
                    color: '#a8d8ff',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}>
                    →
                </div>
            </div>
        </div>
    );
};

export default RoomsPage;