// LettersPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

function LettersPage({ currentUser, onNavigate, onBack }) {
    const [letters, setLetters] = useState([]);
    const [filter, setFilter] = useState('my');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLetter, setEditingLetter] = useState(null);
    const [newLetter, setNewLetter] = useState({ heading: '', message: '' });
    const [loading, setLoading] = useState(true);
    const [hoveredLetterId, setHoveredLetterId] = useState(null);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    // Проверка здоровья сервера
    const checkServerHealth = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/health`);
            console.log('✅ Сервер доступен:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Сервер недоступен:', error);
            return false;
        }
    };

    // Загрузка писем при монтировании компонента
    useEffect(() => {
        fetchLetters();
    }, [currentUser, filter, retryCount]);

    // Функция загрузки писем из базы данных
    const fetchLetters = async () => {
        try {
            setLoading(true);
            setError('');

            // Сначала проверяем доступность сервера
            const isHealthy = await checkServerHealth();
            if (!isHealthy) {
                setError('Сервер недоступен. Проверьте, запущен ли сервер на localhost:5000');
                setLoading(false);
                return;
            }

            if (filter === 'my') {
                const response = await axios.get(`${API_BASE}/api/letters`, {
                    params: { user_id: currentUser?.id },
                    timeout: 10000 // 10 секунд таймаут
                });

                if (response.data.success) {
                    setLetters(response.data.letters || []);
                    console.log('✅ Письма успешно загружены:', response.data.letters);
                } else {
                    setError(response.data.message || 'Ошибка при загрузке писем');
                }
            } else {
                setLetters([]);
            }
        } catch (error) {
            console.error('💥 Ошибка при загрузке писем:', error);

            if (error.code === 'ECONNABORTED') {
                setError('Таймаут запроса. Сервер не отвечает');
            } else if (error.response) {
                // Сервер ответил с ошибкой
                setError(error.response.data.message || `Ошибка сервера: ${error.response.status}`);
            } else if (error.request) {
                // Запрос был сделан, но ответ не получен
                setError('Сервер не отвечает. Проверьте: 1) Запущен ли сервер, 2) Правильный ли адрес: ' + API_BASE);
            } else {
                setError('Неизвестная ошибка: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Функция создания нового письма
    const handleCreateLetter = async () => {
        try {
            setError('');

            if (!newLetter.heading.trim() || !newLetter.message.trim()) {
                setError('Заголовок и текст письма не могут быть пустыми');
                return;
            }

            const response = await axios.post(`${API_BASE}/api/letters`, {
                user_id: currentUser?.id,
                heading: newLetter.heading.trim(),
                message: newLetter.message.trim()
            }, {
                timeout: 10000
            });

            if (response.data.success) {
                setLetters([response.data.letter, ...letters]);
                setIsModalOpen(false);
                setNewLetter({ heading: '', message: '' });
                setError('');
                console.log('✅ Письмо успешно создано:', response.data.letter);
            } else {
                setError(response.data.message || 'Ошибка при создании письма');
            }
        } catch (error) {
            console.error('💥 Ошибка при создании письма:', error);
            handleApiError(error, 'создании письма');
        }
    };

    // Функция обновления письма
    const handleUpdateLetter = async () => {
        try {
            setError('');

            if (!editingLetter.heading.trim() || !editingLetter.message.trim()) {
                setError('Заголовок и текст письма не могут быть пустыми');
                return;
            }

            const response = await axios.put(`${API_BASE}/api/letters/${editingLetter.id_letter}`, {
                heading: editingLetter.heading.trim(),
                message: editingLetter.message.trim()
            }, {
                timeout: 10000
            });

            if (response.data.success) {
                setLetters(letters.map(letter =>
                    letter.id_letter === editingLetter.id_letter ? editingLetter : letter
                ));
                setEditingLetter(null);
                setError('');
                console.log('✅ Письмо успешно обновлено:', editingLetter.id_letter);
            } else {
                setError(response.data.message || 'Ошибка при обновлении письма');
            }
        } catch (error) {
            console.error('💥 Ошибка при обновлении письма:', error);
            handleApiError(error, 'обновлении письма');
        }
    };

    // Функция удаления письма
    const handleDeleteLetter = async (letterId) => {
        try {
            setError('');

            const response = await axios.delete(`${API_BASE}/api/letters/${letterId}`, {
                timeout: 10000
            });

            if (response.data.success) {
                setLetters(letters.filter(letter => letter.id_letter !== letterId));
                console.log('✅ Письмо успешно удалено:', letterId);
            } else {
                setError(response.data.message || 'Ошибка при удалении письма');
            }
        } catch (error) {
            console.error('💥 Ошибка при удалении письма:', error);
            handleApiError(error, 'удалении письма');
        }
    };

    // Обработчик ошибок API
    const handleApiError = (error, operation) => {
        if (error.code === 'ECONNABORTED') {
            setError(`Таймаут при ${operation}. Сервер не отвечает`);
        } else if (error.response) {
            setError(error.response.data.message || `Ошибка сервера при ${operation}: ${error.response.status}`);
        } else if (error.request) {
            setError(`Сервер не отвежает при ${operation}. Проверьте подключение`);
        } else {
            setError(`Неизвестная ошибка при ${operation}: ${error.message}`);
        }
    };

    // Открытие модального окна для редактирования
    const openEditModal = (letter) => {
        setEditingLetter({ ...letter });
    };

    // Закрытие модального окна
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLetter(null);
        setNewLetter({ heading: '', message: '' });
        setError('');
    };

    // Повторная попытка загрузки
    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setError('');
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '15px'
    };

    const filterButtonsStyle = {
        display: 'flex',
        gap: '10px'
    };

    const filterButtonStyle = (isActive) => ({
        padding: '10px 20px',
        backgroundColor: isActive ? '#4ecdc4' : 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease'
    });

    const addButtonStyle = {
        padding: '10px 20px',
        backgroundColor: '#ff6b6b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '20px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease'
    };

    const lettersPanelStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        padding: '20px',
        height: '500px',
        overflowY: 'auto',
        marginBottom: '30px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    };

    const letterItemStyle = (isHovered) => ({
        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
    });

    const deleteButtonStyle = {
        backgroundColor: '#ff4757',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: '12px',
        opacity: hoveredLetterId ? 1 : 0,
        transition: 'opacity 0.3s ease',
        marginLeft: '10px'
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
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        color: '#333'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        marginBottom: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box'
    };

    const textareaStyle = {
        ...inputStyle,
        height: '200px',
        resize: 'vertical',
        fontFamily: 'inherit'
    };

    const modalButtonsStyle = {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '20px'
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
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #ff6b6b'
    };

    const retryButtonStyle = {
        padding: '10px 20px',
        backgroundColor: '#4ecdc4',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginLeft: '10px'
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
                    ✉️ Мои письма
                </h1>
                <p style={{ fontSize: '1.1rem', opacity: '0.9' }}>
                    Управляйте вашими письмами Тайного Санты
                </p>
            </div>

            {/* Панель управления */}
            <div style={controlsStyle}>
                <div style={filterButtonsStyle}>
                    <button
                        style={filterButtonStyle(filter === 'my')}
                        onClick={() => setFilter('my')}
                        onMouseEnter={(e) => !(filter === 'my') && (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)')}
                        onMouseLeave={(e) => !(filter === 'my') && (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
                    >
                        Мои письма
                    </button>
                    <button
                        style={filterButtonStyle(filter === 'received')}
                        onClick={() => setFilter('received')}
                        onMouseEnter={(e) => !(filter === 'received') && (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)')}
                        onMouseLeave={(e) => !(filter === 'received') && (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
                    >
                        Письма мне
                    </button>
                </div>

                <button
                    style={addButtonStyle}
                    onClick={() => setIsModalOpen(true)}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    +
                </button>
            </div>

            {/* Сообщения об ошибках */}
            {error && (
                <div style={errorStyle}>
                    {error}
                    <button style={retryButtonStyle} onClick={handleRetry}>
                        Повторить
                    </button>
                </div>
            )}

            {/* Панель с письмами */}
            <div style={lettersPanelStyle}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <p>Загрузка писем...</p>
                    </div>
                ) : letters.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <p>{filter === 'my' ? 'У вас пока нет писем. Создайте первое письмо!' : 'Писем для вас пока нет.'}</p>
                    </div>
                ) : (
                    letters.map(letter => (
                        <div
                            key={letter.id_letter}
                            style={letterItemStyle(hoveredLetterId === letter.id_letter)}
                            onMouseEnter={() => setHoveredLetterId(letter.id_letter)}
                            onMouseLeave={() => setHoveredLetterId(null)}
                            onClick={() => openEditModal(letter)}
                        >
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 5px 0' }}>{letter.heading}</h3>
                                <p style={{
                                    margin: 0,
                                    opacity: 0.8,
                                    fontSize: '14px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {letter.message}
                                </p>
                            </div>

                            {hoveredLetterId === letter.id_letter && filter === 'my' && (
                                <button
                                    style={deleteButtonStyle}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Вы уверены, что хотите удалить это письмо?')) {
                                            handleDeleteLetter(letter.id_letter);
                                        }
                                    }}
                                >
                                    Удалить
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Модальное окно для создания/редактирования */}
            {(isModalOpen || editingLetter) && (
                <div style={modalOverlayStyle} onClick={closeModal}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: '#333' }}>
                            {editingLetter ? 'Редактировать письмо' : 'Новое письмо'}
                        </h2>

                        {error && (
                            <div style={{...errorStyle, color: '#ff6b6b', marginBottom: '15px'}}>
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Заголовок письма"
                            value={editingLetter ? editingLetter.heading : newLetter.heading}
                            onChange={(e) => {
                                editingLetter
                                    ? setEditingLetter({ ...editingLetter, heading: e.target.value })
                                    : setNewLetter({ ...newLetter, heading: e.target.value });
                                setError('');
                            }}
                            style={inputStyle}
                        />

                        <textarea
                            placeholder="Текст письма..."
                            value={editingLetter ? editingLetter.message : newLetter.message}
                            onChange={(e) => {
                                editingLetter
                                    ? setEditingLetter({ ...editingLetter, message: e.target.value })
                                    : setNewLetter({ ...newLetter, message: e.target.value });
                                setError('');
                            }}
                            style={textareaStyle}
                        />

                        <div style={modalButtonsStyle}>
                            <button
                                style={{ ...actionButtonStyle, backgroundColor: '#6c757d', color: 'white' }}
                                onClick={closeModal}
                            >
                                Отмена
                            </button>
                            <button
                                style={{
                                    ...actionButtonStyle,
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    opacity: (editingLetter ? editingLetter.heading : newLetter.heading) ? 1 : 0.6
                                }}
                                onClick={editingLetter ? handleUpdateLetter : handleCreateLetter}
                                disabled={!(editingLetter ? editingLetter.heading : newLetter.heading)}
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Кнопки навигации */}
            <div style={bottomButtonsStyle}>
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
            </div>
        </div>
    );
}

export default LettersPage;