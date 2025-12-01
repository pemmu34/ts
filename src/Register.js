// Register.js - КНОПКИ ОТДЕЛЬНО НАВЕРХУ
import React, { useState } from 'react';

function Register({ onRegister, onBackToLogin, message }) {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        mail: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Имя обязательно';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'Логин обязателен';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Логин должен содержать минимум 3 символа';
        }

        if (!formData.mail.trim()) {
            newErrors.mail = 'Почта обязательна';
        } else if (!/\S+@\S+\.\S+/.test(formData.mail)) {
            newErrors.mail = 'Некорректный формат почты';
        }

        if (!formData.password) {
            newErrors.password = 'Пароль обязателен';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Пароль должен содержать минимум 6 символов';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Подтверждение пароля обязательно';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Пароли не совпадают';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            await onRegister(formData);
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            setErrors({ general: 'Ошибка при отправке формы' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container">
            {/* Кнопки переключения отдельно сверху */}
            <div className="auth-tabs">
                <button
                    className="tab-button outline"
                    onClick={onBackToLogin}
                    disabled={isLoading}
                >
                    🎅 Вход
                </button>
                <button className="tab-button active candy-stripe">
                    ✨ Регистрация
                </button>
            </div>

            {/* Панель формы */}
            <div className="form-panel candy-stripe extended">
                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Имя */}
                    <div className="input-group">
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Отображаемое имя"
                            disabled={isLoading}
                            className="auth-input"
                        />
                        {errors.name && (
                            <div className="field-error">
                                {errors.name}
                            </div>
                        )}
                    </div>

                    {/* Логин */}
                    <div className="input-group">
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Логин (уникальный)"
                            disabled={isLoading}
                            className="auth-input"
                        />
                        {errors.username && (
                            <div className="field-error">
                                {errors.username}
                            </div>
                        )}
                    </div>

                    {/* Почта */}
                    <div className="input-group">
                        <input
                            type="email"
                            name="mail"
                            value={formData.mail}
                            onChange={handleChange}
                            placeholder="Почта"
                            disabled={isLoading}
                            className="auth-input"
                        />
                        {errors.mail && (
                            <div className="field-error">
                                {errors.mail}
                            </div>
                        )}
                    </div>

                    {/* Пароль */}
                    <div className="input-group">
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Пароль"
                            disabled={isLoading}
                            className="auth-input"
                        />
                        {errors.password && (
                            <div className="field-error">
                                {errors.password}
                            </div>
                        )}
                    </div>

                    {/* Подтверждение пароля */}
                    <div className="input-group">
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Подтверждение пароля"
                            disabled={isLoading}
                            className="auth-input"
                        />
                        {errors.confirmPassword && (
                            <div className="field-error">
                                {errors.confirmPassword}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="submit-button"
                    >
                        {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                </form>
            </div>

            {/* Новогодние украшения */}
            <div className="decoration bell">🔔</div>
            <div className="decoration gift">🎁</div>

            {/* Общие ошибки */}
            {(errors.general || message) && (
                <div className="error-message">
                    {errors.general || message}
                </div>
            )}

            <style jsx>{`
                .register-container {
                    position: relative;
                    width: 400px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    z-index: 10;
                    gap: 20px;
                }

                .auth-tabs {
                    display: flex;
                    width: 100%;
                    gap: 15px;
                    position: relative;
                    z-index: 20;
                }

                .tab-button {
                    flex: 1;
                    padding: 15px 20px;
                    font-size: 18px;
                    font-weight: bold;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    height: 60px;
                    font-family: 'Arial', sans-serif;
                    border-radius: 15px;
                }

                .tab-button.active.candy-stripe {
                    background: repeating-linear-gradient(
                            45deg,
                            #95025c,
                            #ff0000 20px,
                            #ffffff 20px,
                            #ffffff 40px
                    );
                    background-size: 56px 56px;
                    animation: moveStripes 2s linear infinite;
                    color: #1a472a;
                    border: 3px solid #1a472a;
                    box-shadow: 0 6px 20px rgba(255, 0, 0, 0.4);
                }

                .tab-button.outline {
                    background: transparent;
                    color: #ff0000;
                    border: 3px solid #ff0000;
                    box-shadow: 0 4px 15px rgba(255, 0, 0, 0.3);
                }

                .tab-button.outline:hover {
                    background: rgba(255, 0, 0, 0.1);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(255, 0, 0, 0.4);
                }

                .form-panel {
                    width: 100%;
                    background: repeating-linear-gradient(
                            45deg,
                            #95025c,
                            #ff0000 20px,
                            #ffffff 20px,
                            #ffffff 40px
                    );
                    background-size: 56px 56px;
                    animation: moveStripes 2s linear infinite;
                    padding: 30px;
                    border-radius: 15px;
                    border: 3px solid #1a472a;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    position: relative;
                    z-index: 15;
                }

                .form-panel.extended {
                    min-height: 450px;
                }

                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .input-group {
                    position: relative;
                }

                .auth-input {
                    width: 100%;
                    padding: 12px 20px;
                    font-size: 16px;
                    background: rgba(255, 255, 255, 0.95);
                    border: 2px solid #1a472a;
                    border-radius: 8px;
                    outline: none;
                    transition: all 0.3s ease;
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
                    font-family: 'Arial', sans-serif;
                }

                .auth-input:focus {
                    background: white;
                    border-color: #ffd700;
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                }

                .auth-input::placeholder {
                    color: #666;
                }

                .field-error {
                    color: #000000;
                    font-size: 12px;
                    margin-top: 5px;
                    font-weight: bold;
                    text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
                    font-family: 'Arial', sans-serif;
                }

                .submit-button {
                    padding: 15px;
                    font-size: 18px;
                    font-weight: bold;
                    background: linear-gradient(45deg, #2da657, #2d5a3c);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(26, 71, 42, 0.4);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-top: 10px;
                    font-family: 'Arial', sans-serif;
                }

                .submit-button:hover:not(:disabled) {
                    background: linear-gradient(45deg, #2d5a3c, #3d6b4a);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(26, 71, 42, 0.6);
                }

                .submit-button:disabled {
                    background: #666;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .error-message {
                    margin-top: 20px;
                    color: #ff3333;
                    font-weight: bold;
                    text-align: center;
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.9);
                    border: 2px solid #ff3333;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(255, 51, 51, 0.3);
                    animation: shake 0.5s ease-in-out;
                    font-family: 'Arial', sans-serif;
                }

                .decoration {
                    position: absolute;
                    font-size: 2em;
                    animation: float 6s ease-in-out infinite;
                    z-index: 5;
                }

                .snowflake {
                    top: 10%;
                    right: 10%;
                    animation-delay: 1.5s;
                }

                .bell {
                    bottom: 15%;
                    left: 10%;
                    animation-delay: 3s;
                }

                .gift {
                    bottom: 5%;
                    right: 5%;
                    animation-delay: 4.5s;
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px) rotate(0deg);
                    }
                    50% {
                        transform: translateY(-20px) rotate(10deg);
                    }
                }

                @keyframes shake {
                    0%, 100% {
                        transform: translateX(0);
                    }
                    25% {
                        transform: translateX(-5px);
                    }
                    75% {
                        transform: translateX(5px);
                    }
                }

                @keyframes moveStripes {
                    0% {
                        background-position: 0 0;
                    }
                    100% {
                        background-position: 56px 0;
                    }
                }
            `}</style>
        </div>
    );
}

export default Register;