// Login.js
import React, { useState } from 'react';

function Login({ onLogin, message }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await onLogin(username, password);
        setIsLoading(false);
    };

    return (
        <div>
            <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Логин (username)"
                        required
                        disabled={isLoading}
                        style={{
                            padding: '12px',
                            fontSize: '16px',
                            width: '100%',
                            boxSizing: 'border-box',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>
                <div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Пароль"
                        required
                        disabled={isLoading}
                        style={{
                            padding: '12px',
                            fontSize: '16px',
                            width: '100%',
                            boxSizing: 'border-box',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        padding: '12px',
                        fontSize: '16px',
                        backgroundColor: isLoading ? '#6c757d' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isLoading ? 'Вход...' : 'Войти'}
                </button>
            </form>

            {message && !message.includes('успешно') && (
                <p style={{
                    color: 'red',
                    fontWeight: 'bold',
                    marginTop: '15px',
                    textAlign: 'center',
                    padding: '10px',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px'
                }}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default Login;