// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к БД
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Logins',
    password: 'postgre',
    port: 5432,
});

// Проверка подключения к БД
pool.on('connect', () => {
    console.log('✅ Подключение к базе данных установлено');
});

pool.on('error', (err) => {
    console.error('❌ Ошибка подключения к базе данных:', err);
});

// Тестовый маршрут
app.get('/', (req, res) => {
    res.send('Сервер авторизации работает!');
});

// Проверка здоровья сервера
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            success: true,
            message: 'Сервер и база данных работают нормально',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка проверки здоровья:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка подключения к базе данных'
        });
    }
});

// Маршрут авторизации
app.post('/api/login', async (req, res) => {
    console.log('🔐 Получен запрос на авторизацию:', req.body);

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Логин и пароль обязательны'
        });
    }

    try {
        const result = await pool.query(
            'SELECT id, username FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            console.log('✅ Успешная авторизация для пользователя:', username);
            res.json({
                success: true,
                user: result.rows[0]
            });
        } else {
            console.log('❌ Неудачная попытка входа для:', username);
            res.json({
                success: false,
                message: 'Неверные учетные данные'
            });
        }
    } catch (err) {
        console.error('💥 Ошибка БД при авторизации:', err);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Получение всех писем пользователя
app.get('/api/letters', async (req, res) => {
    const { user_id } = req.query;
    console.log('📨 Получен запрос на получение писем для пользователя:', user_id);

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    try {
        // Сначала проверим существование таблицы
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'letters'
            )
        `);

        if (!tableExists.rows[0].exists) {
            console.error('❌ Таблица letters не существует');
            return res.status(500).json({
                success: false,
                message: 'Таблица писем не найдена в базе данных'
            });
        }

        const result = await pool.query(
            'SELECT id_letter, id, heading, message FROM letters WHERE id = $1 ORDER BY id_letter DESC',
            [user_id]
        );

        console.log(`✅ Найдено писем: ${result.rows.length} для пользователя ${user_id}`);
        res.json({
            success: true,
            letters: result.rows
        });
    } catch (err) {
        console.error('💥 Ошибка при получении писем:', err);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении писем',
            error: err.message
        });
    }
});

// Создание нового письма
app.post('/api/letters', async (req, res) => {
    const { user_id, heading, message } = req.body;
    console.log('📝 Получен запрос на создание письма:', { user_id, heading });

    if (!user_id || !heading || !message) {
        return res.status(400).json({
            success: false,
            message: 'Все поля обязательны: user_id, heading, message'
        });
    }

    try {
        const result = await pool.query(
            'INSERT INTO letters (id, heading, message) VALUES ($1, $2, $3) RETURNING id_letter, id, heading, message',
            [user_id, heading, message]
        );

        console.log('✅ Письмо успешно создано с ID:', result.rows[0].id_letter);
        res.json({
            success: true,
            letter: result.rows[0]
        });
    } catch (err) {
        console.error('💥 Ошибка при создании письма:', err);

        // Проверяем конкретные ошибки
        if (err.code === '23505') { // unique violation
            res.status(400).json({
                success: false,
                message: 'Письмо с таким заголовком уже существует'
            });
        } else if (err.code === '23503') { // foreign key violation
            res.status(400).json({
                success: false,
                message: 'Пользователь не существует'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Ошибка сервера при создании письма',
                error: err.message
            });
        }
    }
});

// Обновление письма
app.put('/api/letters/:letter_id', async (req, res) => {
    const letterId = req.params.letter_id;
    const { heading, message } = req.body;
    console.log('✏️ Получен запрос на обновление письма:', letterId);

    if (!heading || !message) {
        return res.status(400).json({
            success: false,
            message: 'Заголовок и текст письма обязательны'
        });
    }

    try {
        const result = await pool.query(
            'UPDATE letters SET heading = $1, message = $2 WHERE id_letter = $3 RETURNING id_letter, id, heading, message',
            [heading, message, letterId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Письмо не найдено'
            });
        }

        console.log('✅ Письмо успешно обновлено:', letterId);
        res.json({
            success: true,
            letter: result.rows[0]
        });
    } catch (err) {
        console.error('💥 Ошибка при обновлении письма:', err);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при обновлении письма',
            error: err.message
        });
    }
});

// Удаление письма
app.delete('/api/letters/:letter_id', async (req, res) => {
    const letterId = req.params.letter_id;
    console.log('🗑️ Получен запрос на удаление письма:', letterId);

    try {
        const result = await pool.query(
            'DELETE FROM letters WHERE id_letter = $1 RETURNING id_letter',
            [letterId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Письмо не найдено'
            });
        }

        console.log('✅ Письмо успешно удалено:', letterId);
        res.json({
            success: true,
            message: 'Письмо успешно удалено'
        });
    } catch (err) {
        console.error('💥 Ошибка при удалении письма:', err);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при удалении письма',
            error: err.message
        });
    }
});

// Обработка несуществующих маршрутов - ИСПРАВЛЕННАЯ ЧАСТЬ
// Используем app.all для обработки всех HTTP методов
/*app.all('*', (req, res) => {
    console.log('❌ Запрос к несуществующему маршруту:', req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'Маршрут не найден'
    });
});*/

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('💥 Необработанная ошибка:', err);
    res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера'
    });
});

app.listen(port, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${port}`);
    console.log(`📊 Проверка здоровья: http://localhost:${port}/api/health`);
});