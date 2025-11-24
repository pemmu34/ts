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
        if (roomId && currentUser) {
            fetchRoomDetails();
            fetchUserLetters();
            checkDrawResult();
            connectToRoomEvents();
        }

        return () => {
            // Закрываем SSE соединение при размонтировании
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [roomId, currentUser]);

    // Подключение к событиям комнаты через SSE
    const connectToRoomEvents = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(`${API_BASE}/api/rooms/${roomId}/events?user_id=${currentUser.id}`);
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
            // Пытаемся переподключиться через 5 секунд
            setTimeout(() => {
                if (roomId && currentUser) {
                    connectToRoomEvents();
                }
            }, 5000);
        };

        eventSource.onopen = () => {
            console.log('✅ SSE соединение установлено');
        };
    };

    // Обработчик событий комнаты
    const handleRoomEvent = (event) => {
        switch (event.type) {
            case 'participant_joined':
            case 'participant_left':
            case 'letter_selected':
            case 'ready_status_changed':
                // Обновляем данные комнаты
                setRoom(event.room);
                setParticipants(event.participants);
                setReadyCount(event.ready_count);
                setTotalParticipants(event.total_participants);

                // Обновляем статус текущего пользователя
                const currentParticipant = event.participants.find(p => p.id == currentUser.id);
                if (currentParticipant) {
                    setIsReady(currentParticipant.is_ready);
                    if (currentParticipant.selected_letter_id) {
                        setSelectedLetter(currentParticipant.selected_letter_id);
                    }
                }
                setIsCreator(event.room.created_by == currentUser.id);
                break;

            case 'draw_completed':
                // Показываем результат розыгрыша
                checkDrawResult();
                // Обновляем данные комнаты
                fetchRoomDetails(false);
                break;

            case 'room_deleted':
                alert('Комната была удалена создателем');
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

            const response = await axios.get(`${API_BASE}/api/rooms/${roomId}`);

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
            } else {
                setError('Ошибка загрузки комнаты');
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
                // Состояние обновится через SSE событие
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
                // Результат будет показан через SSE событие
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
                    alert('Комната удалена, так как вы были создателем');
                } else {
                    alert('Вы вышли из комнаты');
                }
                onNavigate('rooms');
            }
        } catch (error) {
            console.error('❌ Ошибка при выходе из комнаты:', error);
            alert('Ошибка при выходе из комнаты: ' + (error.response?.data?.message || error.message));
        }
    };

    // Стили (аналогичные предыдущим)
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

    const panelStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    };

    const comboBoxStyle = {
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '16px',
        backgroundColor: 'white',
        color: '#333',
        marginBottom: '15px'
    };

    const buttonStyle = {
        padding: '12px 24px',
        backgroundColor: '#ff6b6b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        marginRight: '10px',
        marginBottom: '10px'
    };

    const readyButtonStyle = {
        ...buttonStyle,
        backgroundColor: isReady ? '#28a745' : '#dc3545'
    };

    const drawButtonStyle = {
        ...buttonStyle,
        backgroundColor: readyCount === totalParticipants && totalParticipants >= 2 ? '#ffc107' : '#6c757d',
        color: readyCount === totalParticipants && totalParticipants >= 2 ? '#212529' : 'white'
    };

    const participantStyle = (isCurrentUser, isCreatorUser, isReady) => ({
        backgroundColor: isCurrentUser ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.2)',
        padding: '10px 15px',
        borderRadius: '8px',
        border: isCurrentUser ? '2px solid #ffd700' : 'none',
        fontWeight: isCurrentUser ? 'bold' : 'normal',
        opacity: isReady ? 1 : 0.6
    });

    const readyIndicatorStyle = {
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: '#28a745',
        marginLeft: '8px'
    };

    if (loading) {
        return (
            <div style={containerStyle}>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <p>Загрузка комнаты...</p>
                </div>
            </div>
        );
    }

    if (error || !room) {
        return (
            <div style={containerStyle}>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <p style={{ color: '#ff6b6b', marginBottom: '20px' }}>{error || 'Комната не найдена'}</p>
                    <button
                        style={buttonStyle}
                        onClick={() => onNavigate('rooms')}
                    >
                        Назад к комнатам
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {/* Заголовок */}
            <div style={headerStyle}>
                <h1 style={{
                    fontSize: '2.5rem',
                    marginBottom: '10px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                    🎄 {room.name_room}
                </h1>
                <p style={{ fontSize: '1.1rem', opacity: '0.9' }}>
                    Создатель: {room.creator_name}
                </p>
                {isCreator && (
                    <p style={{
                        color: '#ffd700',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(255, 215, 0, 0.2)',
                        padding: '5px 10px',
                        borderRadius: '5px',
                        display: 'inline-block'
                    }}>
                        👑 Вы создатель этой комнаты
                    </p>
                )}
            </div>

            {/* Сообщения об ошибках */}
            {error && (
                <div style={{
                    color: '#ff6b6b',
                    textAlign: 'center',
                    marginBottom: '15px',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '10px',
                    borderRadius: '8px'
                }}>
                    {error}
                </div>
            )}

            {/* Результат розыгрыша */}
            {showDrawResult && drawResult && (
                <div style={{
                    ...panelStyle,
                    border: '2px solid #28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)'
                }}>
                    <h2 style={{ color: '#28a745', textAlign: 'center' }}>
                        🎁 Результат розыгрыша!
                    </h2>
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <p>Вы - Тайный Санта для: <strong>{drawResult.receiver_name}</strong></p>
                    </div>
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        padding: '15px',
                        borderRadius: '8px'
                    }}>
                        <h4>📜 Письмо от {drawResult.receiver_name}:</h4>
                        <p style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5',
                            fontSize: '1.1rem'
                        }}>
                            {drawResult.letter_message}
                        </p>
                    </div>
                    <p style={{ textAlign: 'center', marginTop: '15px', opacity: '0.8' }}>
                        Розыгрыш проведен: {new Date(drawResult.drawn_at).toLocaleString()}
                    </p>
                </div>
            )}

            {/* Выбор письма и кнопка готовности */}
            {!showDrawResult && (
                <div style={panelStyle}>
                    <h3>✉️ Выберите письмо для Тайного Санты:</h3>
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
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '15px'
                        }}>
                            <h4>📜 Ваше письмо:</h4>
                            <p style={{
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.5'
                            }}>
                                {userLetters.find(letter => letter.id_letter == selectedLetter)?.message}
                            </p>
                        </div>
                    )}

                    <button
                        style={readyButtonStyle}
                        onClick={handleToggleReady}
                        disabled={!selectedLetter}
                    >
                        {isReady ? '✅ Готов' : '❌ Не готов'}
                    </button>

                    {!selectedLetter && (
                        <p style={{ color: '#ff6b6b', marginTop: '10px' }}>
                            Выберите письмо, чтобы отметить готовность
                        </p>
                    )}
                </div>
            )}

            {/* Кнопка розыгрыша для создателя */}
            {isCreator && !showDrawResult && (
                <div style={panelStyle}>
                    <h3>🎲 Запуск розыгрыша</h3>
                    <p>Готовы: {readyCount} из {totalParticipants} участников</p>
                    <button
                        style={drawButtonStyle}
                        onClick={handleStartDraw}
                        disabled={readyCount !== totalParticipants || totalParticipants < 2}
                    >
                        {readyCount === totalParticipants && totalParticipants >= 2
                            ? '🎁 Начать розыгрыш!'
                            : `Ожидание готовности (${readyCount}/${totalParticipants})`}
                    </button>
                    {totalParticipants < 2 && (
                        <p style={{ color: '#ff6b6b', marginTop: '10px' }}>
                            Для розыгрыша нужно как минимум 2 участника
                        </p>
                    )}
                </div>
            )}

            {/* Участники */}
            <div style={panelStyle}>
                <h3 style={{ margin: 0, marginBottom: '15px' }}>
                    👥 Участники комнаты ({participants.length}):
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {participants.map(participant => (
                        <div
                            key={participant.id}
                            style={participantStyle(
                                participant.id == currentUser.id,
                                participant.id == room.created_by,
                                participant.is_ready
                            )}
                        >
                            {participant.username}
                            {participant.id == currentUser.id && ' (Вы)'}
                            {participant.id == room.created_by && ' (создатель)'}
                            {participant.is_ready && <span style={readyIndicatorStyle} title="Готов"></span>}
                            {participant.selected_letter_heading && (
                                <div style={{ fontSize: '0.8rem', opacity: '0.8', marginTop: '5px' }}>
                                    📜 {participant.selected_letter_heading}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {participants.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: '0.7' }}>
                        В комнате пока нет участников
                    </p>
                )}
            </div>

            {/* Информация о комнате */}
            <div style={panelStyle}>
                <h3>ℹ️ Информация о комнате:</h3>
                <p><strong>🔑 Пароль для входа:</strong> {room.pass_room}</p>
                <p><strong>👥 Количество участников:</strong> {participants.length}</p>
                <p><strong>🏗️ Создана:</strong> {room.creator_name}</p>
            </div>

            {/* Кнопки управления - только выход для всех */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button
                    style={buttonStyle}
                    onClick={handleLeaveRoom}
                >
                    🚪 Покинуть комнату
                </button>

                <button
                    style={{...buttonStyle, backgroundColor: '#6c757d'}}
                    onClick={() => onNavigate('rooms')}
                >
                    ↩️ Назад к комнатам
                </button>
            </div>
        </div>
    );
}

export default RoomDetailsPage;