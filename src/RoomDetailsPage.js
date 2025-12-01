// RoomDetailsPage.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

function RoomDetailsPage({ currentUser, roomId, onNavigate, onBack }) {
    const [room, setRoom] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [userLetters, setUserLetters] = useState([]);
    const [selectedLetter, setSelectedLetter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreator, setIsCreator] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [readyCount, setReadyCount] = useState(0);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [drawResult, setDrawResult] = useState(null);
    const [showDrawResult, setShowDrawResult] = useState(false);

    const eventSourceRef = useRef(null);

    useEffect(() => {
        if (!currentUser || !currentUser.id) {
            setError('Пользователь не авторизован');
            setLoading(false);
            return;
        }

        if (!roomId) {
            setError('ID комнаты не указан');
            setLoading(false);
            return;
        }

        fetchRoomDetails();
        fetchUserLetters();
        checkDrawResult();
        connectToRoomEvents();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [roomId, currentUser]);

    const connectToRoomEvents = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // Правильный URL для SSE
        const eventSource = new EventSource(
            `${API_BASE}/api/rooms/${roomId}/events?user_id=${currentUser.id}`
        );

        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('🔔 Получено событие:', data.type);
                handleRoomEvent(data);
            } catch (error) {
                console.error('❌ Ошибка обработки события:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('❌ Ошибка SSE соединения:', error);
            // Переподключение через 5 секунд
            setTimeout(() => {
                if (roomId && currentUser) {
                    console.log('🔄 Переподключение SSE...');
                    connectToRoomEvents();
                }
            }, 5000);
        };

        eventSource.onopen = () => {
            console.log('✅ SSE соединение установлено для комнаты', roomId);
        };
    };

    const handleRoomEvent = (event) => {
        switch (event.type) {
            case 'participant_joined':
            case 'participant_left':
            case 'letter_selected':
            case 'ready_status_changed':
                if (event.room && event.participants) {
                    setRoom(event.room);
                    setParticipants(event.participants);
                    setReadyCount(event.ready_count || 0);
                    setTotalParticipants(event.total_participants || event.participants.length);

                    const currentParticipant = event.participants.find(p => p.id == currentUser.id);
                    if (currentParticipant) {
                        setIsReady(!!currentParticipant.is_ready);
                        if (currentParticipant.selected_letter_id) {
                            setSelectedLetter(currentParticipant.selected_letter_id);
                        }
                    }
                    setIsCreator(event.room.created_by == currentUser.id);
                }
                break;

            case 'draw_completed':
                checkDrawResult();
                fetchRoomDetails(false);
                break;

            case 'room_deleted':
                console.log('🔔 Получено событие удаления комнаты:', event);
                alert('Комната была удалена создателем');
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                }
                onNavigate('rooms');
                break;

            case 'connected':
                console.log('✅ Подключено к событиям комнаты');
                break;

            default:
                console.log('ℹ️ Неизвестное событие:', event.type);
        }
    };

    const fetchRoomDetails = async (showLoading = true) => {
        try {
            if (showLoading) {
                setLoading(true);
            }
            setError('');

            // Добавляем user_id в query параметры
            const response = await axios.get(`${API_BASE}/api/rooms/${roomId}?user_id=${currentUser.id}`);

            if (response.data.success) {
                setRoom(response.data.room);
                setParticipants(response.data.participants || []);
                setIsCreator(response.data.room.created_by == currentUser.id);

                const readyParticipants = response.data.participants.filter(p => p.is_ready);
                setReadyCount(readyParticipants.length);
                setTotalParticipants(response.data.participants.length);

                const currentParticipant = response.data.participants.find(p => p.id == currentUser.id);
                if (currentParticipant) {
                    setIsReady(currentParticipant.is_ready);
                    setSelectedLetter(currentParticipant.selected_letter_id || '');
                }
            } else {
                setError('Ошибка загрузки комнаты: ' + (response.data.message || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки комнаты:', error);
            if (error.response?.status === 404) {
                setError('Комната не найдена');
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Ошибка загрузки комнаты: ' + error.message);
            }
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    const fetchUserLetters = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/user/letters`, {
                params: { user_id: currentUser.id }
            });

            if (response.data.success) {
                setUserLetters(response.data.letters || []);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки писем:', error);
        }
    };

    const checkDrawResult = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/rooms/${roomId}/draw-result`, {
                params: { user_id: currentUser.id }
            });

            if (response.data.success) {
                if (response.data.has_result) {
                    setDrawResult(response.data.result);
                    setShowDrawResult(true);
                } else {
                    setShowDrawResult(false);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка проверки результата розыгрыша:', error);
        }
    };

    const handleLetterSelect = async (letterId) => {
        setSelectedLetter(letterId);

        try {
            await axios.post(`${API_BASE}/api/rooms/${roomId}/select-letter`, {
                user_id: currentUser.id,
                letter_id: letterId
            });
            console.log('✅ Письмо выбрано:', letterId);
        } catch (error) {
            console.error('❌ Ошибка при выборе письма:', error);
            setError('Ошибка при выборе письма');
        }
    };

    const handleToggleReady = async () => {
        if (!selectedLetter) {
            setError('Сначала выберите письмо!');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE}/api/rooms/${roomId}/toggle-ready`, {
                user_id: currentUser.id
            });

            if (response.data.success) {
                console.log('✅ Статус готовности изменен');
            }
        } catch (error) {
            console.error('❌ Ошибка при изменении готовности:', error);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Ошибка при изменении статуса готовности');
            }
        }
    };

    const handleStartDraw = async () => {
        if (readyCount !== totalParticipants) {
            setError('Не все участники готовы!');
            return;
        }

        if (totalParticipants < 2) {
            setError('Для розыгрыша нужно как минимум 2 участника');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE}/api/rooms/${roomId}/draw`, {
                user_id: currentUser.id
            });

            if (response.data.success) {
                console.log('✅ Розыгрыш запущен');
            }
        } catch (error) {
            console.error('❌ Ошибка при запуске розыгрыша:', error);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Ошибка при запуске розыгрыша');
            }
        }
    };

    const handleDeleteRoom = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить эту комнату? Это действие нельзя отменить!')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE}/api/rooms/${roomId}`, {
                data: {
                    user_id: currentUser.id
                }
            });

            if (response.data.success) {
                alert('Комната успешно удалена!');
                onNavigate('rooms');
            } else {
                setError('Ошибка при удалении комнаты: ' + (response.data.message || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('❌ Ошибка при удалении комнаты:', error);
            if (error.response?.data?.message) {
                setError('Ошибка при удалении комнаты: ' + error.response.data.message);
            } else {
                setError('Ошибка при удалении комнаты: ' + error.message);
            }
        }
    };

    const handleLeaveRoom = async () => {
        try {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const response = await axios.post(`${API_BASE}/api/rooms/leave`, {
                room_id: roomId,
                user_id: currentUser.id
            });

            if (response.data.success) {
                if (response.data.roomDeleted) {
                    alert('Комната успешно удалена!');
                } else {
                    alert('Вы вышли из комнаты');
                }
                onNavigate('rooms');
            } else {
                alert('Ошибка при выходе из комнаты: ' + (response.data.message || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('❌ Ошибка при выходе из комнаты:', error);
            alert('Ошибка при выходе из комнаты: ' + (error.response?.data?.message || error.message));
        }
    };

    // Обновленные стили - узкие панели
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

    const contentStyle = {
        maxWidth: '800px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10
    };

    const headerStyle = {
        textAlign: 'center',
        marginBottom: '40px'
    };

    const panelStyle = {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(15px)',
        borderRadius: '20px',
        padding: '25px',
        margin: '0 auto',
        marginBottom: '25px',
        border: '3px solid rgba(100, 150, 255, 0.3)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
        width: '80%',
        position: 'relative'
    };

    const comboBoxStyle = {
        width: '100%',
        padding: '15px',
        border: '2px solid rgba(100, 150, 255, 0.5)',
        borderRadius: '10px',
        fontSize: '16px',
        boxSizing: 'border-box',
        background: 'rgba(255, 255, 255, 0.9)',
        fontFamily: 'Arial, sans-serif',
        color: '#333',
        marginBottom: '15px'
    };

    const buttonStyle = {
        padding: '15px 25px',
        background: 'linear-gradient(135deg, #6496ff 0%, #4a7dff 100%)',
        color: 'white',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '15px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif',
        backdropFilter: 'blur(10px)',
        marginRight: '15px',
        marginBottom: '10px'
    };

    const readyButtonStyle = {
        ...buttonStyle,
        background: isReady
            ? 'linear-gradient(135deg, #4ecdc4 0%, #2d5a3c 100%)'
            : 'linear-gradient(135deg, #ff6b6b 0%, #c41e3a 100%)'
    };

    const drawButtonStyle = {
        ...buttonStyle,
        background: readyCount === totalParticipants && totalParticipants >= 2
            ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
            : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
        color: readyCount === totalParticipants && totalParticipants >= 2 ? '#212529' : 'white'
    };

    const participantStyle = (isCurrentUser, isCreatorUser, isReady) => ({
        background: isCurrentUser
            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.2) 100%)'
            : isCreatorUser
                ? 'linear-gradient(135deg, rgba(100, 150, 255, 0.3) 0%, rgba(74, 125, 255, 0.2) 100%)'
                : 'rgba(255, 255, 255, 0.1)',
        padding: '15px 20px',
        borderRadius: '12px',
        border: isCurrentUser ? '2px solid #ffd700' : isCreatorUser ? '2px solid #6496ff' : '2px solid transparent',
        fontWeight: isCurrentUser ? 'bold' : 'normal',
        opacity: isReady ? 1 : 0.7,
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
        marginBottom: '10px'
    });

    const readyIndicatorStyle = {
        display: 'inline-block',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #4ecdc4 0%, #2d5a3c 100%)',
        marginLeft: '10px',
        boxShadow: '0 0 10px rgba(78, 205, 196, 0.5)'
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
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
    };

    if (loading) {
        return (
            <div style={containerStyle}>
                <div className="background-pattern"></div>
                <div style={contentStyle}>
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <p style={{ color: '#a8d8ff', fontSize: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                            🎄 Загрузка комнаты...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !room) {
        return (
            <div style={containerStyle}>
                <div className="background-pattern"></div>
                <div style={contentStyle}>
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <p style={{
                            color: '#ff6b6b',
                            fontSize: '18px',
                            marginBottom: '20px',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            {error || 'Комната не найдена'}
                        </p>
                        <button
                            style={buttonStyle}
                            onClick={() => onNavigate('rooms')}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-3px)';
                                e.target.style.boxShadow = '0 12px 25px rgba(0,0,0,0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                            }}
                        >
                            ↩️ Назад к комнатам
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {/* Фоновый узор */}
            <div className="background-pattern"></div>

            <div style={contentStyle}>
                {/* Заголовок */}
                <div style={headerStyle}>
                    <h1 style={{
                        fontSize: '3rem',
                        marginBottom: '20px',
                        textShadow: '4px 4px 8px rgba(0,0,0,0.6), 0 0 30px rgba(100, 150, 255, 0.6)',
                        background: 'linear-gradient(45deg, #6496ff, #a8d8ff, #4ecdc4)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontFamily: 'Arial, sans-serif',
                        fontWeight: 'bold',
                        letterSpacing: '2px'
                    }}>
                        Комната:{room.name_room}
                    </h1>
                    <p style={{
                        fontSize: '1.2rem',
                        color: '#a8d8ff',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                        margin: '0 0 15px 0'
                    }}>
                        Создатель: {room.creator_name}
                    </p>
                    {isCreator && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%)',
                            padding: '15px',
                            borderRadius: '10px',
                            border: '2px solid rgba(255, 215, 0, 0.5)',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                color: '#ffd700',
                                fontWeight: 'bold',
                                margin: 0,
                                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                            }}>
                                👑 Вы создатель этой комнаты. При выходе комната будет полностью удалена.
                            </p>
                        </div>
                    )}
                </div>

                {/* Сообщения об ошибках */}
                {error && (
                    <div style={errorStyle}>
                        {error}
                    </div>
                )}

                {/* Результат розыгрыша */}
                {showDrawResult && drawResult && (
                    <div style={{
                        ...panelStyle,
                        border: '3px solid rgba(78, 205, 196, 0.5)',
                        background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.15) 0%, rgba(45, 90, 60, 0.15) 100%)',
                        textAlign: 'center'
                    }}>
                        <h2 style={{
                            color: '#4ecdc4',
                            fontSize: '2rem',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                            marginBottom: '20px'
                        }}>
                            🎁 Результат розыгрыша!
                        </h2>
                        <div style={{
                            marginBottom: '20px',
                            fontSize: '1.1rem',
                            color: '#a8d8ff'
                        }}>
                            <p>Вы - Тайный Санта для: <strong style={{ color: '#ffd700' }}>{drawResult.receiver_name}</strong></p>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '20px',
                            borderRadius: '15px',
                            border: '2px solid rgba(100, 150, 255, 0.3)',
                            marginBottom: '20px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <h4 style={{
                                color: '#ffd700',
                                marginBottom: '15px',
                                fontSize: '1.2rem'
                            }}>
                                📜 Письмо от {drawResult.receiver_name}
                            </h4>
                            <p style={{
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6',
                                fontSize: '1rem',
                                color: 'white',
                                textAlign: 'left'
                            }}>
                                {drawResult.letter_message}
                            </p>
                        </div>
                        <p style={{
                            textAlign: 'center',
                            marginTop: '15px',
                            opacity: '0.8',
                            color: '#a8d8ff',
                            fontSize: '0.9rem'
                        }}>
                            🕒 Розыгрыш проведен: {new Date(drawResult.drawn_at).toLocaleString()}
                        </p>
                    </div>
                )}

                {/* Выбор письма и кнопка готовности */}
                {!showDrawResult && (
                    <div style={panelStyle}>
                        <h3 style={{
                            color: '#a8d8ff',
                            fontSize: '1.5rem',
                            marginBottom: '20px',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            ✉️ Выберите письмо для Тайного Санты:
                        </h3>
                        <select
                            value={selectedLetter}
                            onChange={(e) => handleLetterSelect(e.target.value)}
                            style={comboBoxStyle}
                            disabled={isReady}
                        >
                            <option value="">-- {userLetters.length === 0 ? 'У вас нет писем' : 'Выберите письмо'} --</option>
                            {userLetters.map(letter => (
                                <option key={letter.id_letter} value={letter.id_letter}>
                                    {letter.heading}
                                </option>
                            ))}
                        </select>

                        {selectedLetter && (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                padding: '20px',
                                borderRadius: '15px',
                                border: '2px solid rgba(100, 150, 255, 0.3)',
                                marginBottom: '20px',
                                color: '#333'
                            }}>
                                <h4 style={{
                                    color: '#6496ff',
                                    marginBottom: '15px',
                                    fontSize: '1.2rem'
                                }}>
                                    📜 Ваше письмо:
                                </h4>
                                <p style={{
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.6',
                                    fontSize: '1rem',
                                    textAlign: 'left'
                                }}>
                                    {userLetters.find(letter => letter.id_letter == selectedLetter)?.message}
                                </p>
                            </div>
                        )}

                        <button
                            style={readyButtonStyle}
                            onClick={handleToggleReady}
                            disabled={!selectedLetter}
                            onMouseEnter={(e) => {
                                if (selectedLetter) {
                                    e.target.style.transform = 'translateY(-3px)';
                                    e.target.style.boxShadow = '0 12px 25px rgba(0,0,0,0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                            }}
                        >
                            {isReady ? '✅ Готов' : '❌ Не готов'}
                        </button>

                        {!selectedLetter && (
                            <p style={{
                                color: '#ff6b6b',
                                marginTop: '15px',
                                fontSize: '1rem',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                            }}>
                                Выберите письмо, чтобы отметить готовность
                            </p>
                        )}
                    </div>
                )}

                {/* Кнопка розыгрыша для создателя */}
                {isCreator && !showDrawResult && (
                    <div style={panelStyle}>
                        <h3 style={{
                            color: '#a8d8ff',
                            fontSize: '1.5rem',
                            marginBottom: '20px',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            🎲 Запуск розыгрыша
                        </h3>
                        <p style={{
                            color: 'white',
                            fontSize: '1.1rem',
                            marginBottom: '15px'
                        }}>
                            Готовы: <span style={{ color: '#4ecdc4', fontWeight: 'bold' }}>{readyCount}</span> из <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{totalParticipants}</span> участников
                        </p>
                        <button
                            style={drawButtonStyle}
                            onClick={handleStartDraw}
                            disabled={readyCount !== totalParticipants || totalParticipants < 2}
                            onMouseEnter={(e) => {
                                if (readyCount === totalParticipants && totalParticipants >= 2) {
                                    e.target.style.transform = 'translateY(-3px)';
                                    e.target.style.boxShadow = '0 12px 25px rgba(0,0,0,0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                            }}
                        >
                            {readyCount === totalParticipants && totalParticipants >= 2
                                ? '🎁 Начать розыгрыш!'
                                : `⏳ Ожидание готовности (${readyCount}/${totalParticipants})`}
                        </button>
                        {totalParticipants < 2 && (
                            <p style={{
                                color: '#ff6b6b',
                                marginTop: '15px',
                                fontSize: '1rem'
                            }}>
                                Для розыгрыша нужно как минимум 2 участника
                            </p>
                        )}
                    </div>
                )}

                {/* Участники */}
                <div style={panelStyle}>
                    <h3 style={{
                        color: '#a8d8ff',
                        fontSize: '1.5rem',
                        marginBottom: '20px',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        👥 Участники комнаты ({participants.length}):
                    </h3>
                    <div>
                        {participants.map(participant => (
                            <div
                                key={participant.id}
                                style={participantStyle(
                                    participant.id == currentUser.id,
                                    participant.id == room.created_by,
                                    participant.is_ready
                                )}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '8px'
                                }}>
                                    <span style={{
                                        color: participant.id == currentUser.id ? '#ffd700' :
                                            participant.id == room.created_by ? '#6496ff' : 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}>
                                        {participant.name || participant.username}
                                        {participant.id == currentUser.id && ' (Вы)'}
                                        {participant.id == room.created_by && ' 👑'}
                                    </span>
                                    {participant.is_ready && <span style={readyIndicatorStyle} title="Готов"></span>}
                                </div>
                                {participant.selected_letter_id && (
                                    <div style={{
                                        fontSize: '0.9rem',
                                        opacity: '0.9',
                                        marginTop: '5px',
                                        color: '#4ecdc4',
                                        fontStyle: 'italic'
                                    }}>
                                        ✅ Выбрал письмо
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {participants.length === 0 && (
                        <p style={{
                            textAlign: 'center',
                            opacity: '0.7',
                            color: '#a8d8ff',
                            fontSize: '1rem',
                            marginTop: '20px'
                        }}>
                            В комнате пока нет участников
                        </p>
                    )}
                </div>

                {/* Информация о комнате */}
                <div style={panelStyle}>
                    <h3 style={{
                        color: '#a8d8ff',
                        fontSize: '1.5rem',
                        marginBottom: '20px',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        ℹ️ Информация о комнате:
                    </h3>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '15px',
                            borderRadius: '10px',
                            border: '1px solid rgba(100, 150, 255, 0.2)'
                        }}>
                            <p style={{ margin: '0 0 8px 0', color: '#a8d8ff' }}><strong>🔑 Пароль для входа:</strong></p>
                            <p style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{room.pass_room}</p>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '15px',
                            borderRadius: '10px',
                            border: '1px solid rgba(100, 150, 255, 0.2)'
                        }}>
                            <p style={{ margin: '0 0 8px 0', color: '#a8d8ff' }}><strong>👥 Количество участников:</strong></p>
                            <p style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{participants.length}</p>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '15px',
                            borderRadius: '10px',
                            border: '1px solid rgba(100, 150, 255, 0.2)'
                        }}>
                            <p style={{ margin: '0 0 8px 0', color: '#a8d8ff' }}><strong>🏗️ Создана:</strong></p>
                            <p style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{room.creator_name}</p>
                        </div>
                    </div>
                </div>

                {/* Кнопки управления */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    {isCreator && (
                        <button
                            style={{
                                ...buttonStyle,
                                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                                marginRight: '15px'
                            }}
                            onClick={handleDeleteRoom}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-3px)';
                                e.target.style.boxShadow = '0 12px 25px rgba(0,0,0,0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                            }}
                        >
                            🗑️ Удалить комнату
                        </button>
                    )}

                    <button
                        style={{
                            ...buttonStyle,
                            background: 'linear-gradient(135deg, #ff6b6b 0%, #c41e3a 100%)'
                        }}
                        onClick={handleLeaveRoom}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-3px)';
                            e.target.style.boxShadow = '0 12px 25px rgba(0,0,0,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                        }}
                    >
                        🚪 {isCreator ? 'Удалить и выйти' : 'Покинуть комнату'}
                    </button>

                    <button
                        style={{
                            ...buttonStyle,
                            background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
                        }}
                        onClick={() => onNavigate('rooms')}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-3px)';
                            e.target.style.boxShadow = '0 12px 25px rgba(0,0,0,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                        }}
                    >
                        ↩️ Назад к комнатам
                    </button>
                </div>
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
                `}
            </style>
        </div>
    );
}

export default RoomDetailsPage;