// LettersPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

function LettersPage({ currentUser, onNavigate, onBack }) {
    const [activeTab, setActiveTab] = useState('my-letters');
    const [myLetters, setMyLetters] = useState([]);
    const [santaLetters, setSantaLetters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newLetter, setNewLetter] = useState({ heading: '', message: '' });
    const [editingLetter, setEditingLetter] = useState(null);
    const [viewingLetter, setViewingLetter] = useState(null);
    const [hoveredLetterId, setHoveredLetterId] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (currentUser) {
            // Сбрасываем состояния при смене вкладки
            setMyLetters([]);
            setSantaLetters([]);
            setError('');

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

            console.log('🗑️ Попытка удаления письма с ID:', letterId, 'тип:', typeof letterId);

            const response = await axios.delete(`${API_BASE}/api/letters/${letterId}`, {
                timeout: 10000
            });

            console.log('✅ Ответ от сервера при удалении:', response.data);

            if (response.data.success) {
                // Приводим оба ID к одному типу для сравнения
                setMyLetters(myLetters.filter(letter =>
                    Number(letter.id_letter) !== Number(letterId)
                ));
                console.log('✅ Письмо успешно удалено из состояния');
            } else {
                setError(response.data.message || 'Ошибка при удалении письма');
            }
        } catch (error) {
            console.error('💥 Ошибка при удалении письма:', error);

            // Детальная обработка ошибок для удаления
            if (error.code === 'ECONNABORTED') {
                setError('Таймаут при удалении письма. Сервер не отвечает');
            } else if (error.response) {
                if (error.response.status === 404) {
                    setError('Письмо не найдено или уже удалено');
                    // Обновляем список, так как письма уже нет
                    setMyLetters(myLetters.filter(letter =>
                        Number(letter.id_letter) !== Number(letterId)
                    ));
                } else {
                    setError(`Ошибка сервера при удалении: ${error.response.status} - ${error.response.data.message || 'Неизвестная ошибка'}`);
                }
            } else if (error.request) {
                setError('Сервер не отвечает при удалении письма. Проверьте подключение');
            } else {
                setError(`Неизвестная ошибка при удалении: ${error.message}`);
            }
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

    const openViewModal = (letter) => {
        setViewingLetter(letter);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingLetter(null);
        setViewingLetter(null);
        setNewLetter({ heading: '', message: '' });
        setError('');
    };

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setError('');
    };

    // Новогодние стили
    const containerStyle = {
        padding: '40px 20px',
        width: '100vw',
        height: '100vh',
        minWidth: '1280px',
        minHeight: '800px',
        margin: 0,
        background: 'linear-gradient(135deg, #0f2d1e 0%, #1a472a 25%, #2d5a3c 50%, #1a472a 75%, #0f2d1e 100%)',
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

    const tabsStyle = {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '30px',
        gap: '20px',
        position: 'relative',
        zIndex: 10
    };

    const tabStyle = (isActive) => ({
        padding: '15px 30px',
        backgroundColor: isActive ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
        border: isActive ? '3px solid #ffd700' : '3px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '15px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '18px',
        color: 'white',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
        fontFamily: 'Arial, sans-serif',
        transform: isActive ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: isActive ? '0 10px 25px rgba(0,0,0,0.3)' : '0 5px 15px rgba(0,0,0,0.2)'
    });

    const controlsStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '30px',
        gap: '15px',
        position: 'relative',
        zIndex: 10
    };

    const addButtonStyle = {
        padding: '15px 25px',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #c41e3a 100%)',
        color: 'white',
        border: '3px solid #ffd700',
        borderRadius: '50px',
        cursor: 'pointer',
        fontSize: '24px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif'
    };

    const lettersPanelStyle = {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(15px)',
        borderRadius: '20px',
        padding: '25px',
        minHeight: '400px',
        maxHeight: '400px',
        overflowY: 'auto',
        margin: '0 auto 30px auto',
        marginBottom: '30px',
        border: '3px solid rgba(255, 215, 0, 0.3)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 10,
        width: '70%',
        maxWidth: '700px'
    };

    const letterItemStyle = (isHovered) => ({
        background: isHovered
            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 107, 107, 0.2) 100%)'
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
        border: isHovered ? '2px solid rgba(255, 215, 0, 0.5)' : '2px solid transparent',
        boxShadow: isHovered ? '0 8px 25px rgba(0,0,0,0.4)' : '0 4px 15px rgba(0,0,0,0.2)'
    });

    const deleteButtonStyle = {
        background: 'linear-gradient(135deg, #8b0000 0%, #660000 100%)',
        color: 'white',
        border: '2px solid #ff6b6b',
        borderRadius: '8px',
        padding: '8px 15px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif'
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
        background: 'linear-gradient(135deg, #fffaf0 0%, #fef9e7 100%)',
        padding: '40px',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '80vh',
        overflow: 'auto',
        color: '#8b4513',
        border: '15px solid #deb887',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 30px rgba(139, 69, 19, 0.1)',
        position: 'relative',
        fontFamily: '"Courier New", monospace'
    };

    // Эффект загиба угла для модального окна
    const cornerFoldStyle = {
        position: 'absolute',
        top: '0',
        right: '0',
        width: '0',
        height: '0',
        borderStyle: 'solid',
        borderWidth: '0 50px 50px 0',
        borderColor: 'transparent #d2b48c transparent transparent'
    };

    const inputStyle = {
        width: '100%',
        padding: '15px',
        marginBottom: '20px',
        border: '2px solid #deb887',
        borderRadius: '10px',
        fontSize: '16px',
        boxSizing: 'border-box',
        background: 'rgba(255, 250, 240, 0.8)',
        fontFamily: '"Courier New", monospace',
        color: '#8b4513'
    };

    const readOnlyInputStyle = {
        ...inputStyle,
        background: 'rgba(255, 250, 240, 0.6)',
        border: '2px solid #cdb891',
        color: '#8b4513'
    };

    const textareaStyle = {
        ...inputStyle,
        height: '200px',
        resize: 'vertical',
        fontFamily: '"Courier New", monospace',
        lineHeight: '1.5'
    };

    const readOnlyTextareaStyle = {
        ...textareaStyle,
        background: 'rgba(255, 250, 240, 0.6)',
        border: '2px solid #cdb891',
        color: '#8b4513'
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
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
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
        background: 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(255,107,107,0.3) 100%)',
        color: 'white',
        border: '3px solid rgba(255, 215, 0, 0.5)',
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

    const retryButtonStyle = {
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #4ecdc4 0%, #2d5a3c 100%)',
        color: 'white',
        border: '2px solid #4ecdc4',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginLeft: '15px',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, sans-serif',
        transition: 'all 0.3s ease'
    };

    const santaLetterInfoStyle = {
        fontSize: '14px',
        opacity: '0.9',
        marginTop: '10px',
        color: '#ffd700',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
    };

    const viewLetterInfoStyle = {
        backgroundColor: 'rgba(255, 250, 240, 0.8)',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '2px solid #deb887',
        fontFamily: 'Arial, sans-serif'
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
                    textShadow: '4px 4px 8px rgba(0,0,0,0.6), 0 0 30px rgba(255,215,0,0.6)',
                    background: 'linear-gradient(45deg, #ff6b6b, #ffd700, #4ecdc4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 'bold',
                    letterSpacing: '2px'
                }}>
                    ✉ Волшебные Письма
                </h1>
                <p style={{
                    fontSize: '1.5rem',
                    color: '#ffd700',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    margin: 0
                }}>
                    Напиши письмо Деду Морозу и получи волшебный подарок!
                </p>
            </div>

            {/* Вкладки */}
            <div style={tabsStyle}>
                <div
                    style={tabStyle(activeTab === 'my-letters')}
                    onClick={() => setActiveTab('my-letters')}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'my-letters') {
                            e.target.style.transform = 'translateY(-3px)';
                            e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'my-letters') {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                        }
                    }}
                >
                    📝 Мои письма Деду Морозу
                </div>
                <div
                    style={tabStyle(activeTab === 'santa-letters')}
                    onClick={() => setActiveTab('santa-letters')}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'santa-letters') {
                            e.target.style.transform = 'translateY(-3px)';
                            e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'santa-letters') {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                        }
                    }}
                >
                    🎅 Письма от Тайного Санты
                </div>
            </div>

            {/* Панель управления (только для вкладки "Мои письма") */}
            {activeTab === 'my-letters' && (
                <div style={controlsStyle}>
                    <button
                        style={addButtonStyle}
                        onClick={() => setShowModal(true)}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.1) translateY(-3px)';
                            e.target.style.boxShadow = '0 12px 25px rgba(0,0,0,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1) translateY(0)';
                            e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                        }}
                    >
                        ✏️ Написать новое письмо
                    </button>
                </div>
            )}

            {/* Сообщения об ошибках */}
            {error && (
                <div style={errorStyle}>
                    {error}
                    <button
                        style={retryButtonStyle}
                        onClick={handleRetry}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        Попробовать снова
                    </button>
                </div>
            )}

            {/* Панель с письмами */}
            <div style={lettersPanelStyle} className="custom-scrollbar">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <p style={{ color: '#ffd700', fontSize: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                            🎄 Загрузка писем...
                        </p>
                    </div>
                ) : activeTab === 'my-letters' ? (
                    myLetters.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <p style={{ color: '#ffd700', fontSize: '18px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                                📮 У вас пока нет писем. Напишите первое письмо Деду Морозу!
                            </p>
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
                                    <h3 style={{
                                        margin: '0 0 10px 0',
                                        color: '#ffd700',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                        fontSize: '20px'
                                    }}>
                                        {letter.heading}
                                    </h3>
                                    <p style={{
                                        margin: 0,
                                        opacity: 0.9,
                                        fontSize: '16px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        color: 'white',
                                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                    }}>
                                        {letter.message}
                                    </p>
                                </div>

                                {hoveredLetterId === letter.id_letter && (
                                    <button
                                        style={deleteButtonStyle}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Вы уверены, что хотите удалить письмо "${letter.heading}"?`)) {
                                                console.log('🔄 Запуск удаления письма:', letter.id_letter);
                                                handleDeleteLetter(letter.id_letter);
                                            }
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'scale(1.1)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(139, 0, 0, 0.5)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'scale(1)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    >
                                        🗑️ Удалить
                                    </button>
                                )}
                            </div>
                        ))
                    )
                ) : (
                    // Вкладка "Письма от Тайного Санты"
                    santaLetters.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <p style={{ color: '#ffd700', fontSize: '18px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                                🎅 Вы пока не получили ни одного письма как Тайный Санта.
                            </p>
                            <p style={{ color: '#4ecdc4', fontSize: '16px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                                Участвуйте в розыгрышах комнат, чтобы получать письма!
                            </p>
                        </div>
                    ) : (
                        santaLetters.map(letter => (
                            <div
                                key={letter.id}
                                style={letterItemStyle(hoveredLetterId === letter.id)}
                                onMouseEnter={() => setHoveredLetterId(letter.id)}
                                onMouseLeave={() => setHoveredLetterId(null)}
                                onClick={() => openViewModal(letter)}
                            >
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        margin: '0 0 10px 0',
                                        color: '#ffd700',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                        fontSize: '20px'
                                    }}>
                                        {letter.letter_heading}
                                    </h3>
                                    <p style={{
                                        margin: 0,
                                        opacity: 0.9,
                                        fontSize: '16px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        color: 'white',
                                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                    }}>
                                        {letter.letter_message}
                                    </p>
                                    <div style={santaLetterInfoStyle}>
                                        <div>👤 От: {letter.receiver_name}</div>
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
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()} className="custom-scrollbar">
                        {/* Эффект загиба угла */}
                        <div style={cornerFoldStyle}></div>

                        <h2 style={{
                            marginTop: 0,
                            color: '#8b4513',
                            textAlign: 'center',
                            borderBottom: '3px double #deb887',
                            paddingBottom: '15px',
                            fontSize: '28px',
                            fontFamily: 'Arial, sans-serif'
                        }}>
                            {editingLetter ? '✏️ Редактировать письмо' : '✉️ Новое письмо Деду Морозу'}
                        </h2>

                        {error && (
                            <div style={{...errorStyle, color: '#8b0000', marginBottom: '20px', borderColor: '#8b0000'}}>
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Заголовок письма..."
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
                            placeholder="Дорогой Дедушка Мороз! 🎅\n\nВ этом году я очень старался(ась) и хотел(а) бы попросить..."
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
                                style={{
                                    ...actionButtonStyle,
                                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                                    color: 'white'
                                }}
                                onClick={closeModal}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
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
                                    opacity: (editingLetter ? editingLetter.heading : newLetter.heading) ? 1 : 0.6
                                }}
                                onClick={editingLetter ? handleUpdateLetter : handleCreateLetter}
                                disabled={!(editingLetter ? editingLetter.heading : newLetter.heading)}
                                onMouseEnter={(e) => {
                                    if ((editingLetter ? editingLetter.heading : newLetter.heading)) {
                                        e.target.style.transform = 'translateY(-2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                💾 Сохранить письмо
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно для просмотра писем от Тайного Санты */}
            {viewingLetter && (
                <div style={modalOverlayStyle} onClick={closeModal}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()} className="custom-scrollbar">
                        {/* Эффект загиба угла */}
                        <div style={cornerFoldStyle}></div>

                        <h2 style={{
                            marginTop: 0,
                            color: '#8b4513',
                            textAlign: 'center',
                            borderBottom: '3px double #deb887',
                            paddingBottom: '15px',
                            fontSize: '28px',
                            fontFamily: 'Arial, sans-serif'
                        }}>
                            📜 Письмо от {viewingLetter.receiver_name}
                        </h2>

                        <div style={viewLetterInfoStyle}>
                            <p style={{ margin: '5px 0', fontWeight: 'bold' }}>👤 Отправитель: {viewingLetter.receiver_name}</p>
                            <p style={{ margin: '5px 0' }}>📅 Дата получения: {new Date(viewingLetter.drawn_at).toLocaleString()}</p>
                        </div>

                        <input
                            type="text"
                            value={viewingLetter.letter_heading}
                            readOnly
                            style={readOnlyInputStyle}
                        />

                        <textarea
                            value={viewingLetter.letter_message}
                            readOnly
                            style={readOnlyTextareaStyle}
                        />

                        <div style={modalButtonsStyle}>
                            <button
                                style={{
                                    ...actionButtonStyle,
                                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                                    color: 'white'
                                }}
                                onClick={closeModal}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                Закрыть
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
                        radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.1) 2%, transparent 8%),
                        radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.1) 2%, transparent 8%),
                        radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.15) 3%, transparent 10%),
                        radial-gradient(circle at 30% 70%, rgba(255, 107, 107, 0.1) 2%, transparent 8%),
                        radial-gradient(circle at 70% 30%, rgba(78, 205, 196, 0.1) 2%, transparent 8%);
                    background-size: 400px 400px, 500px 500px, 600px 600px, 350px 350px, 450px 450px;
                    animation: snowflakes 25s linear infinite;
                    z-index: 0;
                }

                @keyframes snowflakes {
                    0% { 
                        background-position: 0px 0px, 0px 0px, 0px 0px, 0px 0px, 0px 0px; 
                    }
                    100% { 
                        background-position: 400px 400px, 500px 500px, 600px 600px, 350px 350px, 450px 450px; 
                    }
                }

                /* Стилизация скроллбара для всей страницы и элементов с классом custom-scrollbar */
                ::-webkit-scrollbar {
                    width: 12px;
                }

                ::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    margin: 5px;
                }

                ::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #ffd700, #ff6b6b);
                    border-radius: 10px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #ffed4e, #ff8e8e);
                }

                /* Для Firefox */
                * {
                    scrollbar-width: thin;
                    scrollbar-color: #ffd700 rgba(255, 255, 255, 0.1);
                }

                /* Гарантируем, что скроллбар всегда виден для элементов с прокруткой */
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #ffd700 rgba(255, 255, 255, 0.1);
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
                    background: linear-gradient(135deg, #ffd700, #ff6b6b);
                    border-radius: 10px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #ffed4e, #ff8e8e);
                }

                /* Адаптивность */
                @media (max-width: 1366px) {
                    .containerStyle {
                        padding: 30px 15px;
                    }
                    
                    h1 {
                        font-size: 3rem !important;
                    }
                    
                    .lettersPanelStyle {
                        max-height: 450px;
                    }
                }

                @media (max-width: 1280px) {
                    h1 {
                        font-size: 2.5rem !important;
                    }
                    
                    .tabStyle {
                        padding: 12px 20px;
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

export default LettersPage;