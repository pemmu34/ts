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
        fetchRooms();
    }, [currentUser]);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            setError('');

            console.log('🔄 Загрузка всех комнат...');

            // Используем эндпоинт для всех комнат
            const response = await axios.get(`${API_BASE}/api/rooms/all`);

            console.log('✅ Ответ от сервера:', response.data);

            if (response.data.success) {
                setRooms(response.data.rooms || []);
            } else {
                setError(response.data.message || 'Ошибка при загрузке комнат');
            }
        } catch (error) {
            console.error('❌ Ошибка при загрузке комнат:', error);

            if (error.response) {
                setError(`Ошибка сервера: ${error.response.status} - ${error.response.data?.message || 'Неизвестная ошибка'}`);
            } else if (error.request) {
                setError('Не удалось подключиться к серверу. Проверьте, запущен ли сервер на порту 5000.');
            } else {
                setError('Ошибка при настройке запроса: ' + error.message);
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

    // Стили (остаются без изменений)
    const containerStyle = {
        padding: '40px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
    };

    const headerStyle = {
        textAlign: 'center',
        marginBottom: '30px'
    };

    const controlsStyle = {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '20px'
    };

    const addButtonStyle = {
        padding: '12px 24px',
        backgroundColor: '#ff6b6b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease'
    };

    const roomsPanelStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        padding: '20px',
        height: '500px',
        overflowY: 'auto',
        marginBottom: '30px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    };

    const modalOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    };

    const modalContentStyle = {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        width: '90%',
        maxWidth: '400px',
        color: '#333'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        marginBottom: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box'
    };

    const modalButtonsStyle = {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end'
    };

    const actionButtonStyle = {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold'
    };

    const bottomButtonsStyle = {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '30px'
    };

    const bottomButtonStyle = {
        padding: '12px 25px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease'
    };

    const errorStyle = {
        color: '#ff6b6b',
        textAlign: 'center',
        marginBottom: '15px',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '10px',
        borderRadius: '8px'
    };

    return (
        <div style={containerStyle}>
            {/* Заголовок */}
            <div style={headerStyle}>
                <h1 style={{
                    fontSize: '2.5rem',
                    marginBottom: '10px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                    🏠 Комнаты
                </h1>
                <p style={{ fontSize: '1.1rem', opacity: '0.9' }}>
                    Присоединяйтесь к комнатам Тайного Санты
                </p>
            </div>

            {/* Кнопка создания комнаты */}
            <div style={controlsStyle}>
                <button
                    style={addButtonStyle}
                    onClick={openCreateRoomModal}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    + Создать комнату
                </button>
            </div>

            {/* Сообщения об ошибках */}
            {error && (
                <div style={errorStyle}>
                    {error}
                </div>
            )}

            {/* Панель с комнатами */}
            <div style={roomsPanelStyle}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <p>Загрузка комнат...</p>
                    </div>
                ) : rooms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <p>Вы пока не состоите в комнатах. Создайте новую комнату или присоединитесь по паролю!</p>
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

            {/* Модальное окно создания комнаты */}
            {showCreateRoomModal && (
                <div style={modalOverlayStyle} onClick={closeCreateRoomModal}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: '#333', textAlign: 'center' }}>
                            Создание комнаты
                        </h2>

                        {error && (
                            <div style={{...errorStyle, color: '#ff6b6b', marginBottom: '15px'}}>
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Название комнаты"
                            value={roomName}
                            onChange={(e) => {
                                setRoomName(e.target.value);
                                setError('');
                            }}
                            style={inputStyle}
                        />

                        <input
                            type="text"
                            placeholder="Пароль для входа в комнату"
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
                                style={{ ...actionButtonStyle, backgroundColor: '#6c757d', color: 'white' }}
                                onClick={closeCreateRoomModal}
                                disabled={creating}
                            >
                                Отмена
                            </button>
                            <button
                                style={{
                                    ...actionButtonStyle,
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    opacity: creating ? 0.6 : 1
                                }}
                                onClick={handleCreateRoom}
                                disabled={creating || !roomName.trim() || !roomPassword.trim()}
                            >
                                {creating ? 'Создание...' : 'Создать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно ввода пароля для входа в существующую комнату */}
            {showPasswordModal && (
                <div style={modalOverlayStyle} onClick={closePasswordModal}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: '#333', textAlign: 'center' }}>
                            Вход в комнату
                        </h2>
                        <p style={{ color: '#666', textAlign: 'center', marginBottom: '20px' }}>
                            {selectedRoom?.name_room}
                        </p>

                        {error && (
                            <div style={{...errorStyle, color: '#ff6b6b', marginBottom: '15px'}}>
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Пароль комнаты"
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
                                style={{ ...actionButtonStyle, backgroundColor: '#6c757d', color: 'white' }}
                                onClick={closePasswordModal}
                                disabled={joining}
                            >
                                Отмена
                            </button>
                            <button
                                style={{
                                    ...actionButtonStyle,
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    opacity: joining ? 0.6 : 1
                                }}
                                onClick={handleJoinRoom}
                                disabled={joining || !password.trim()}
                            >
                                {joining ? 'Вход...' : 'Войти'}
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
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    ↩️ Назад
                </button>

                <button
                    style={bottomButtonStyle}
                    onClick={() => onNavigate('letters')}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    ✉️ Мои письма
                </button>

                <button
                    style={bottomButtonStyle}
                    onClick={() => onNavigate('profile')}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    👤 Мой профиль
                </button>
            </div>
        </div>
    );
}

// Компонент для отображения отдельной комнаты
const RoomItem = ({ room, onSelect }) => {
    const [isHovered, setIsHovered] = useState(false);

    const roomItemStyle = {
        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '15px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        border: isHovered ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid transparent'
    };

    return (
        <div
            style={roomItemStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(room)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem' }}>{room.name_room}</h3>
                    <p style={{ margin: '0 0 5px 0', opacity: 0.8 }}>
                        Создатель: {room.creator_name}
                    </p>
                    <p style={{ margin: 0, opacity: 0.8 }}>
                        Участников: {room.participants_count}
                    </p>
                </div>
                <div style={{
                    fontSize: '24px',
                    transform: isHovered ? 'translateX(5px)' : 'translateX(0)',
                    transition: 'transform 0.3s ease'
                }}>
                    →
                </div>
            </div>
        </div>
    );
};

export default RoomsPage;