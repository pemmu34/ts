// LettersPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

function LettersPage({ currentUser, onNavigate, onBack }) {
    const [activeTab, setActiveTab] = useState('my-letters'); // 'my-letters' или 'santa-letters'
    const [myLetters, setMyLetters] = useState([]);
    const [santaLetters, setSantaLetters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newLetter, setNewLetter] = useState({ heading: '', message: '' });
    const [editingLetter, setEditingLetter] = useState(null);
    const [hoveredLetterId, setHoveredLetterId] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (currentUser) {
            if (activeTab === 'my-letters') {
                fetchMyLetters();
            } else {
                fetchSantaLetters();
            }
        }
    }, [currentUser, activeTab, retryCount]);

    const fetchMyLetters = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await axios.get(`${API_BASE}/api/letters`, {
                params: { user_id: currentUser?.id },
                timeout: 10000
            });

            if (response.data.success) {
                setMyLetters(response.data.letters || []);
            } else {
                setError(response.data.message || 'Ошибка при загрузке писем');
            }
        } catch (error) {
            console.error('💥 Ошибка при загрузке писем:', error);
            handleApiError(error, 'загрузке писем');
        } finally {
            setLoading(false);
        }
    };

    const fetchSantaLetters = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await axios.get(`${API_BASE}/api/my-santa-letters`, {
                params: { user_id: currentUser?.id },
                timeout: 10000
            });

            if (response.data.success) {
                setSantaLetters(response.data.letters || []);
            } else {
                setError(response.data.message || 'Ошибка при загрузке писем');
            }
        } catch (error) {
            console.error('💥 Ошибка при загрузке писем Санты:', error);
            handleApiError(error, 'загрузке писем');
        } finally {
            setLoading(false);
        }
    };

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
                setMyLetters([response.data.letter, ...myLetters]);
                setShowModal(false);
                setNewLetter({ heading: '', message: '' });
                setError('');
            } else {
                setError(response.data.message || 'Ошибка при создании письма');
            }
        } catch (error) {
            console.error('💥 Ошибка при создании письма:', error);
            handleApiError(error, 'создании письма');
        }
    };

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
                setMyLetters(myLetters.map(letter =>
                    letter.id_letter === editingLetter.id_letter ? editingLetter : letter
                ));
                setEditingLetter(null);
                setError('');
            } else {
                setError(response.data.message || 'Ошибка при обновлении письма');
            }
        } catch (error) {
            console.error('💥 Ошибка при обновлении письма:', error);
            handleApiError(error, 'обновлении письма');
        }
    };

    const handleDeleteLetter = async (letterId) => {
        try {
            setError('');

            const response = await axios.delete(`${API_BASE}/api/letters/${letterId}`, {
                timeout: 10000
            });

            if (response.data.success) {
                setMyLetters(myLetters.filter(letter => letter.id_letter !== letterId));
            } else {
                setError(response.data.message || 'Ошибка при удалении письма');
            }
        } catch (error) {
            console.error('💥 Ошибка при удалении письма:', error);
            handleApiError(error, 'удалении письма');
        }
    };

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

    const openEditModal = (letter) => {
        setEditingLetter({ ...letter });
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingLetter(null);
        setNewLetter({ heading: '', message: '' });
        setError('');
    };

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setError('');
    };

    // Стили
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

    const tabsStyle = {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '30px',
        gap: '10px'
    };

    const tabStyle = (isActive) => ({
        padding: '12px 24px',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
        border: isActive ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid transparent',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease'
    });

    const controlsStyle = {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '15px'
    };

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
        minHeight: '500px',
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

    const santaLetterInfoStyle = {
        fontSize: '0.8rem',
        opacity: '0.8',
        marginTop: '5px'
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
            </div>

            {/* Вкладки */}
            <div style={tabsStyle}>
                <div
                    style={tabStyle(activeTab === 'my-letters')}
                    onClick={() => setActiveTab('my-letters')}
                >
                    📝 Мои письма
                </div>
                <div
                    style={tabStyle(activeTab === 'santa-letters')}
                    onClick={() => setActiveTab('santa-letters')}
                >
                    🎅 Письма мне
                </div>
            </div>

            {/* Панель управления (только для вкладки "Мои письма") */}
            {activeTab === 'my-letters' && (
                <div style={controlsStyle}>
                    <button
                        style={addButtonStyle}
                        onClick={() => setShowModal(true)}
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
            )}

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
                ) : activeTab === 'my-letters' ? (
                    myLetters.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <p>У вас пока нет писем. Создайте первое письмо!</p>
                        </div>
                    ) : (
                        myLetters.map(letter => (
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

                                {hoveredLetterId === letter.id_letter && (
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
                    )
                ) : (
                    // Вкладка "Письма мне"
                    santaLetters.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <p>Вы пока не получили ни одного письма как Тайный Санта.</p>
                            <p>Участвуйте в розыгрышах комнат, чтобы получать письма!</p>
                        </div>
                    ) : (
                        santaLetters.map(letter => (
                            <div
                                key={letter.id}
                                style={letterItemStyle(hoveredLetterId === letter.id)}
                                onMouseEnter={() => setHoveredLetterId(letter.id)}
                                onMouseLeave={() => setHoveredLetterId(null)}
                            >
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 5px 0', color: '#ffd700' }}>
                                        {letter.letter_heading}
                                    </h3>
                                    <p style={{
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: '1.5',
                                        marginBottom: '10px'
                                    }}>
                                        {letter.letter_message}
                                    </p>
                                    <div style={santaLetterInfoStyle}>
                                        <div>👤 От: {letter.receiver_name}</div>
                                        <div>🏠 Комната: {letter.name_room}</div>
                                        <div>📅 {new Date(letter.drawn_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* Модальное окно для создания/редактирования */}
            {(showModal || editingLetter) && (
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