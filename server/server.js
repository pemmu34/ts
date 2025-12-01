// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к БД MySQL
const pool = mysql.createPool({
    host: 'localhost',
    user: 'postgres',
    password: 'postgre',
    database: 'logins',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Хранилище для SSE соединений
const roomConnections = new Map();

// Функция для проверки существования таблицы
const checkTableExists = async (tableName) => {
    try {
        const [rows] = await pool.execute(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
        `, [tableName]);
        return rows.length > 0;
    } catch (error) {
        console.error(`Ошибка при проверке таблицы ${tableName}:`, error);
        return false;
    }
};

// Вспомогательная функция для получения комнаты с участниками
async function getRoomWithParticipants(roomId, userId) {
    try {
        console.log(`🔍 Получение информации о комнате ${roomId} для пользователя ${userId}`);

        // Сначала получаем полную информацию о комнате
        const [roomData] = await pool.execute(
            'SELECT id_room as id, name_room, pass_room, created_by FROM rooms WHERE id_room = ?',
            [roomId]
        );

        if (roomData.length === 0) {
            throw new Error('Комната не найдена');
        }

        const room = roomData[0];

        // Получаем имя создателя
        const [creatorData] = await pool.execute(
            'SELECT name FROM users WHERE id = ?',
            [room.created_by]
        );

        room.creator_name = creatorData.length > 0 ? creatorData[0].name : 'Неизвестно';

        // Затем получаем участников
        const [participants] = await pool.execute(`
            SELECT
                u.id,
                u.name,
                u.username,
                rp.is_ready,
                rp.selected_letter_id,
                L.heading as selected_letter_heading,
                (u.id = ?) as is_current_user,
                CASE
                    WHEN u.id = ? THEN ' (Вы)'
                    WHEN u.id = ? THEN ' (создатель)'
                    ELSE ''
                END as user_role
            FROM room_participants rp
                JOIN users u ON rp.user_id = u.id
                LEFT JOIN letters L ON rp.selected_letter_id = L.id_letter
            WHERE rp.room_id = ?
            ORDER BY
                CASE WHEN u.id = ? THEN 0 ELSE 1 END,
                rp.joined_at`,
            [userId, userId, room.created_by, roomId, userId]
        );

        console.log(`✅ Найдено участников: ${participants.length} для комнаты ${roomId}`);

        return {
            room: room,
            participants: participants
        };
    } catch (error) {
        console.error('💥 Ошибка при получении информации о комнате:', error);
        throw error;
    }
}

// Функция для отправки событий всем клиентам в комнате
function broadcastToRoom(roomId, event) {
    if (roomConnections.has(roomId)) {
        const clients = roomConnections.get(roomId);
        const data = `data: ${JSON.stringify(event)}\n\n`;

        console.log(`🔔 SSE: Попытка отправки события ${event.type} для комнаты ${roomId}, клиентов: ${clients.size}`);

        clients.forEach((res, clientId) => {
            try {
                if (!res.writableEnded) {
                    res.write(data);
                    console.log(`✅ SSE: Событие ${event.type} отправлено клиенту ${clientId}`);
                } else {
                    console.log(`❌ SSE: Клиент ${clientId} отключен, удаляем из списка`);
                    clients.delete(clientId);
                }
            } catch (error) {
                console.error(`❌ Ошибка отправки события клиенту ${clientId}:`, error);
                clients.delete(clientId);
            }
        });

        // Очищаем пустые комнаты
        if (clients.size === 0) {
            roomConnections.delete(roomId);
            console.log(`🧹 SSE: Комната ${roomId} удалена из подключений (нет клиентов)`);
        }
    } else {
        console.log(`⚠️ SSE: Нет подключенных клиентов для комнаты ${roomId}`);
    }
}

// ==================== МАРШРУТЫ ====================

// Тестовый маршрут
app.get('/', (req, res) => {
    res.send('Сервер авторизации работает!');
});

// Проверка здоровья сервера
app.get('/api/health', async (req, res) => {
    try {
        await pool.execute('SELECT 1');
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

// Маршрут регистрации
app.post('/api/register', async (req, res) => {
    console.log('📝 Получен запрос на регистрацию:', req.body);

    const { name, username, mail, password, confirmPassword } = req.body;

    // Проверка обязательных полей
    if (!name || !username || !mail || !password || !confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'Все поля обязательны для заполнения'
        });
    }

    // Проверка совпадения паролей
    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'Пароли не совпадают'
        });
    }

    // Проверка длины пароля
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Пароль должен содержать минимум 6 символов'
        });
    }

    try {
        // Проверка существующего пользователя с таким же username или mail
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE username = ? OR mail = ?',
            [username, mail]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким логином или почтой уже существует'
            });
        }

        // Создание нового пользователя
        const [result] = await pool.execute(
            'INSERT INTO users (name, username, mail, password) VALUES (?, ?, ?, ?)',
            [name.trim(), username.trim(), mail.trim(), password]
        );

        const [newUserRows] = await pool.execute(
            'SELECT id, name, username, mail FROM users WHERE id = ?',
            [result.insertId]
        );

        console.log('✅ Новый пользователь создан:', newUserRows[0].username);
        res.json({
            success: true,
            user: newUserRows[0],
            message: 'Регистрация прошла успешно!'
        });

    } catch (err) {
        console.error('💥 Ошибка при регистрации:', err);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким логином или почтой уже существует'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при регистрации',
            error: err.message
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
            message: 'Логин/почта и пароль обязательны'
        });
    }

    try {
        // Ищем пользователя по username ИЛИ mail
        const [users] = await pool.execute(
            'SELECT id, name, username, mail FROM users WHERE (username = ? OR mail = ?) AND password = ?',
            [username, username, password]
        );

        if (users.length > 0) {
            console.log('✅ Успешная авторизация для пользователя:', username);
            res.json({
                success: true,
                user: users[0]
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

// Обновление имени пользователя в базе данных
app.post('/api/user/update-name', async (req, res) => {
    console.log('✏️ Получен запрос на обновление имени:', req.body);

    const { user_id, new_name } = req.body;

    if (!user_id || !new_name) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя и новое имя обязательны'
        });
    }

    if (new_name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Имя не может быть пустым'
        });
    }

    try {
        // Проверяем существование пользователя
        const [userCheck] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [user_id]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        // ОБНОВЛЯЕМ ИМЯ В БАЗЕ ДАННЫХ
        const [result] = await pool.execute(
            'UPDATE users SET name = ? WHERE id = ?',
            [new_name.trim(), user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        const [updatedUser] = await pool.execute(
            'SELECT id, name, username, mail FROM users WHERE id = ?',
            [user_id]
        );

        console.log('✅ Имя пользователя успешно обновлено в БД:', updatedUser[0].name);

        res.json({
            success: true,
            user: updatedUser[0],
            message: 'Имя успешно обновлено'
        });
    } catch (err) {
        console.error('💥 Ошибка при обновлении имени в БД:', err);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при обновлении имени',
            error: err.message
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
        const tableExists = await checkTableExists('letters');
        if (!tableExists) {
            console.error('❌ Таблица letters не существует');
            return res.status(500).json({
                success: false,
                message: 'Таблица писем не найдена в базе данных'
            });
        }

        const [letters] = await pool.execute(
            'SELECT id_letter, id, heading, message FROM letters WHERE id = ? AND `using` = false ORDER BY id_letter DESC',
            [user_id]
        );

        console.log(`✅ Найдено писем: ${letters.length} для пользователя ${user_id}`);
        res.json({
            success: true,
            letters: letters
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
        const [result] = await pool.execute(
            'INSERT INTO letters (id, heading, message, `using`) VALUES (?, ?, ?, false)',
            [user_id, heading, message]
        );

        const [newLetterRows] = await pool.execute(
            'SELECT id_letter, id, heading, message FROM letters WHERE id_letter = ?',
            [result.insertId]
        );

        console.log('✅ Письмо успешно создано с ID:', newLetterRows[0].id_letter);
        res.json({
            success: true,
            letter: newLetterRows[0]
        });
    } catch (err) {
        console.error('💥 Ошибка при создании письма:', err);

        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({
                success: false,
                message: 'Письмо с таким заголовком уже существует'
            });
        } else if (err.code === 'ER_NO_REFERENCED_ROW') {
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
        const [result] = await pool.execute(
            'UPDATE letters SET heading = ?, message = ? WHERE id_letter = ?',
            [heading, message, letterId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Письмо не найдено'
            });
        }

        const [updatedLetter] = await pool.execute(
            'SELECT id_letter, id, heading, message FROM letters WHERE id_letter = ?',
            [letterId]
        );

        console.log('✅ Письмо успешно обновлено:', letterId);
        res.json({
            success: true,
            letter: updatedLetter[0]
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

    // Проверяем, что letterId - валидное число
    if (!letterId || isNaN(parseInt(letterId))) {
        return res.status(400).json({
            success: false,
            message: 'Неверный идентификатор письма'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // Сначала проверяем, существует ли письмо и принадлежит ли оно пользователю
        const [letterCheck] = await connection.execute(
            'SELECT id, id_letter FROM letters WHERE id_letter = ?',
            [parseInt(letterId)]
        );

        if (letterCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Письмо не найдено'
            });
        }

        const letter = letterCheck[0];

        // Проверяем, используется ли письмо в активных комнатах
        const [usageCheck] = await connection.execute(
            `SELECT rp.room_id, r.name_room 
             FROM room_participants rp 
             JOIN rooms r ON rp.room_id = r.id_room 
             WHERE rp.selected_letter_id = ? AND rp.room_id IN (
                 SELECT id_room FROM rooms WHERE created_by != ?
             )`,
            [parseInt(letterId), letter.id]
        );

        if (usageCheck.length > 0) {
            const roomNames = usageCheck.map(room => room.name_room).join(', ');
            return res.status(400).json({
                success: false,
                message: `Нельзя удалить письмо, так как оно используется в комнатах: ${roomNames}`
            });
        }

        // Удаляем письмо
        const [result] = await connection.execute(
            'DELETE FROM letters WHERE id_letter = ?',
            [parseInt(letterId)]
        );

        if (result.affectedRows === 0) {
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

        // Обработка ошибок внешних ключей
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(400).json({
                success: false,
                message: 'Нельзя удалить письмо, так как оно используется в активной комнате'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при удалении письма',
            error: err.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// ==================== КОМНАТЫ ====================

// Получение ВСЕХ комнат - ДОЛЖЕН БЫТЬ ПЕРВЫМ
app.get('/api/rooms/all', async (req, res) => {
    const { user_id } = req.query;

    console.log('🏠 Получен запрос на получение ВСЕХ комнат для пользователя:', user_id);

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    try {
        console.log('🔍 Выполнение запроса для получения всех комнат...');

        // Простой запрос без сложных JOIN
        const [rooms] = await pool.execute(`
            SELECT
                id_room,
                name_room,
                created_by,
                pass_room
            FROM rooms
            ORDER BY id_room DESC
        `);

        console.log(`✅ Найдено комнат: ${rooms.length}`);

        // Добавим информацию о создателе и участниках отдельно
        const roomsWithDetails = await Promise.all(
            rooms.map(async (room) => {
                try {
                    // Получаем имя создателя
                    const [creator] = await pool.execute(
                        'SELECT name FROM users WHERE id = ?',
                        [room.created_by]
                    );

                    // Получаем количество участников
                    const [participants] = await pool.execute(
                        'SELECT COUNT(*) as count FROM room_participants WHERE room_id = ?',
                        [room.id_room]
                    );

                    // Проверяем, присоединен ли пользователь
                    const [isJoined] = await pool.execute(
                        'SELECT 1 FROM room_participants WHERE room_id = ? AND user_id = ?',
                        [room.id_room, user_id]
                    );

                    return {
                        id_room: room.id_room,
                        name_room: room.name_room,
                        created_by: room.created_by,
                        pass_room: room.pass_room,
                        creator_name: creator.length > 0 ? creator[0].name : 'Неизвестно',
                        participants_count: participants[0].count,
                        is_joined: isJoined.length > 0
                    };
                } catch (error) {
                    console.error(`❌ Ошибка при получении деталей комнаты ${room.id_room}:`, error);
                    return {
                        ...room,
                        creator_name: 'Ошибка загрузки',
                        participants_count: 0,
                        is_joined: false
                    };
                }
            })
        );

        console.log(`✅ Успешно загружено ${roomsWithDetails.length} комнат`);
        res.json({
            success: true,
            rooms: roomsWithDetails
        });
    } catch (error) {
        console.error('💥 Ошибка при получении всех комнат:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении комнат',
            error: error.message,
            code: error.code
        });
    }
});

// SSE эндпоинт для событий комнаты
app.get('/api/rooms/:room_id/events', (req, res) => {
    const roomId = req.params.room_id;
    const userId = req.query.user_id;

    if (!userId) {
        console.log('❌ SSE: Отсутствует user_id');
        return res.status(400).end();
    }

    console.log(`🔔 SSE: Пользователь ${userId} подключился к комнате ${roomId}`);

    // Устанавливаем заголовки для SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    // Создаем уникальный ID для соединения
    const clientId = `${userId}_${Date.now()}`;

    // Добавляем соединение в хранилище
    if (!roomConnections.has(roomId)) {
        roomConnections.set(roomId, new Map());
    }
    roomConnections.get(roomId).set(clientId, res);

    // Отправляем приветственное сообщение
    const welcomeEvent = {
        type: 'connected',
        message: 'Connected to room events',
        timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(welcomeEvent)}\n\n`);

    // Обработчик закрытия соединения
    req.on('close', () => {
        console.log(`🔔 SSE: Пользователь ${userId} отключился от комнаты ${roomId}`);
        if (roomConnections.has(roomId)) {
            roomConnections.get(roomId).delete(clientId);
            if (roomConnections.get(roomId).size === 0) {
                roomConnections.delete(roomId);
            }
        }
    });

    // Обработчик ошибок
    req.on('error', (error) => {
        console.error(`❌ SSE ошибка для пользователя ${userId}:`, error);
        if (roomConnections.has(roomId)) {
            roomConnections.get(roomId).delete(clientId);
        }
    });
});

// Получение информации о КОНКРЕТНОЙ комнате
app.get('/api/rooms/:room_id', async (req, res) => {
    const roomId = req.params.room_id;
    const userId = req.query.user_id;

    console.log('📋 Получен запрос на информацию о КОНКРЕТНОЙ комнате:', { roomId, userId });

    // Проверяем, что roomId - число, а не "all"
    if (roomId === 'all') {
        console.log('❌ Неверный запрос: roomId не может быть "all"');
        return res.status(400).json({
            success: false,
            message: 'Неверный идентификатор комнаты'
        });
    }

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    try {
        const roomInfo = await getRoomWithParticipants(roomId, userId);

        console.log(`✅ Участники комнаты ${roomId}: ${roomInfo.participants.length}`);
        res.json({
            success: true,
            room: roomInfo.room,
            participants: roomInfo.participants,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('💥 Ошибка при получении информации о комнате:', error);
        if (error.message === 'Комната не найдена') {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении информации о комнате',
            error: error.message
        });
    }
});

// Создание новой комнаты
app.post('/api/rooms', async (req, res) => {
    const { name_room, created_by, pass_room } = req.body;
    console.log('🏗️ Получен запрос на создание комнаты:', { name_room, created_by, pass_room });

    if (!name_room || !created_by || !pass_room) {
        return res.status(400).json({
            success: false,
            message: 'Название комнаты, ID создателя и пароль обязательны'
        });
    }

    try {
        // Проверяем существование пользователя
        const [userCheck] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [created_by]
        );

        if (userCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь не существует'
            });
        }

        // Генерируем уникальный пароль если нужно
        let finalPassRoom = pass_room.trim();
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            try {
                const [roomResult] = await pool.execute(
                    'INSERT INTO rooms (name_room, pass_room, created_by) VALUES (?, ?, ?)',
                    [name_room.trim(), finalPassRoom, created_by]
                );

                const [newRoomRows] = await pool.execute(
                    'SELECT * FROM rooms WHERE id_room = ?',
                    [roomResult.insertId]
                );

                const room = newRoomRows[0];

                await pool.execute(
                    'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)',
                    [room.id_room, created_by]
                );

                console.log(`✅ Комната создана с ID: ${room.id_room} и названием: ${name_room}`);
                return res.json({
                    success: true,
                    room: room,
                    message: 'Комната успешно создана'
                });

            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    // Если пароль уже существует, генерируем новый
                    attempts++;
                    finalPassRoom = pass_room.trim() + '_' + Math.random().toString(36).substring(2, 8);
                    console.log(`🔄 Попытка ${attempts}: новый пароль - ${finalPassRoom}`);
                    continue;
                } else {
                    throw error;
                }
            }
        }

        // Если не удалось создать комнату после нескольких попыток
        throw new Error('Не удалось создать комнату с уникальным паролем');

    } catch (error) {
        console.error('💥 Ошибка при создании комнаты:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при создании комнаты',
            error: error.message
        });
    }
});

// Присоединение к комнате
app.post('/api/rooms/join', async (req, res) => {
    const { room_id, pass_room, user_id } = req.body;
    console.log('🔑 Получен запрос на присоединение к комнате:', { room_id, pass_room, user_id });

    if (!room_id || !pass_room || !user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID комнаты, пароль комнаты и ID пользователя обязательны'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        const [roomRows] = await connection.execute(
            'SELECT * FROM rooms WHERE id_room = ? AND pass_room = ?',
            [room_id, pass_room]
        );

        if (roomRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Неверный пароль для выбранной комнаты'
            });
        }

        const room = roomRows[0];

        const [existingParticipants] = await connection.execute(
            'SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?',
            [room.id_room, user_id]
        );

        if (existingParticipants.length > 0) {
            console.log(`✅ Пользователь ${user_id} уже в комнате ${room.id_room}`);
            return res.json({
                success: true,
                room: room,
                message: 'Вы уже в этой комнате'
            });
        }

        await connection.execute(
            'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)',
            [room.id_room, user_id]
        );

        console.log(`✅ Пользователь ${user_id} присоединился к комнате ${room.id_room}`);

        // Отправляем событие о присоединении
        const roomInfo = await getRoomWithParticipants(room.id_room, user_id);
        broadcastToRoom(room.id_room, {
            type: 'participant_joined',
            room: roomInfo.room,
            participants: roomInfo.participants,
            ready_count: roomInfo.participants.filter(p => p.is_ready).length,
            total_participants: roomInfo.participants.length,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            room: room,
            message: 'Вы успешно присоединились к комнате'
        });
    } catch (error) {
        console.error('💥 Ошибка при присоединении к комнате:', error);

        if (error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({
                success: false,
                message: 'Пользователь не существует'
            });
        } else if (error.code === 'ER_DUP_ENTRY') {
            console.log(`✅ Пользователь ${user_id} уже в комнате (unique violation)`);
            const [roomRows] = await pool.execute(
                'SELECT * FROM rooms WHERE id_room = ? AND pass_room = ?',
                [room_id, pass_room]
            );
            if (roomRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Неверный пароль для выбранной комнаты'
                });
            }
            return res.json({
                success: true,
                room: roomRows[0],
                message: 'Вы уже в этой комнате'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при присоединении к комнате',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Выход из комнаты
app.post('/api/rooms/leave', async (req, res) => {
    const { room_id, user_id } = req.body;
    console.log('🚪 Получен запрос на выход из комнаты:', { room_id, user_id });

    if (!room_id || !user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID комнаты и ID пользователя обязательны'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Получаем информацию о комнате
        const [roomRows] = await connection.execute(
            'SELECT * FROM rooms WHERE id_room = ?',
            [room_id]
        );

        if (roomRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }

        const room = roomRows[0];

        // Если выходит создатель - удаляем всю комнату
        if (room.created_by == user_id) {
            console.log(`🎯 Создатель ${user_id} выходит из комнаты ${room_id} - удаляем комнату`);

            // Удаляем все связанные данные в правильном порядке
            await connection.execute('DELETE FROM room_participants WHERE room_id = ?', [room_id]);
            await connection.execute('DELETE FROM rooms WHERE id_room = ?', [room_id]);

            await connection.commit();

            console.log(`✅ Комната ${room_id} полностью удалена создателем`);

            // Отправляем событие об удалении комнаты всем участникам
            broadcastToRoom(room_id, {
                type: 'room_deleted',
                message: 'Комната удалена создателем',
                room_id: room_id,
                timestamp: new Date().toISOString()
            });

            // Закрываем все SSE соединения для этой комнаты
            if (roomConnections.has(room_id)) {
                const clients = roomConnections.get(room_id);
                clients.forEach((res, clientId) => {
                    try {
                        res.write(`data: ${JSON.stringify({
                            type: 'room_deleted',
                            message: 'Комната удалена создателем',
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                        res.end();
                    } catch (error) {
                        console.error('❌ Ошибка при закрытии SSE соединения:', error);
                    }
                });
                roomConnections.delete(room_id);
                console.log(`🔒 Закрыто ${clients.size} SSE соединений для комнаты ${room_id}`);
            }

            res.json({
                success: true,
                message: 'Комната успешно удалена',
                roomDeleted: true
            });
        } else {
            // Если выходит обычный участник
            await connection.execute(
                'DELETE FROM room_participants WHERE room_id = ? AND user_id = ?',
                [room_id, user_id]
            );

            await connection.commit();

            console.log(`✅ Пользователь ${user_id} вышел из комнаты ${room_id}`);

            // Отправляем событие о выходе участника
            const roomInfo = await getRoomWithParticipants(room_id, user_id);
            broadcastToRoom(room_id, {
                type: 'participant_left',
                user_id: user_id,
                room: roomInfo.room,
                participants: roomInfo.participants,
                ready_count: roomInfo.participants.filter(p => p.is_ready).length,
                total_participants: roomInfo.participants.length,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                message: 'Вы вышли из комнаты',
                roomDeleted: false
            });
        }
    } catch (error) {
        console.error('💥 Ошибка при выходе из комнаты:', error);
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при выходе из комнаты',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Принудительное удаление комнаты создателем
app.delete('/api/rooms/:room_id', async (req, res) => {
    const roomId = req.params.room_id;
    const { user_id } = req.body;

    console.log('🗑️ Получен запрос на принудительное удаление комнаты:', { roomId, user_id });

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Проверяем, существует ли комната и является ли пользователь создателем
        const [roomRows] = await connection.execute(
            'SELECT created_by FROM rooms WHERE id_room = ?',
            [roomId]
        );

        if (roomRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }

        const room = roomRows[0];

        if (room.created_by != user_id) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'Только создатель комнаты может её удалить'
            });
        }

        // Удаляем все связанные данные
        console.log(`🗑️ Начинаем удаление комнаты ${roomId} и всех связанных данных`);

        await connection.execute('DELETE FROM room_participants WHERE room_id = ?', [roomId]);
        console.log(`✅ Удалены участники комнаты ${roomId}`);

        await connection.execute('DELETE FROM rooms WHERE id_room = ?', [roomId]);
        console.log(`✅ Удалена комната ${roomId}`);

        await connection.commit();

        // Отправляем событие об удалении комнаты
        broadcastToRoom(roomId, {
            type: 'room_deleted',
            message: 'Комната удалена создателем',
            room_id: roomId,
            timestamp: new Date().toISOString()
        });

        // Закрываем все SSE соединения
        if (roomConnections.has(roomId)) {
            const clients = roomConnections.get(roomId);
            clients.forEach((res) => {
                try {
                    res.end();
                } catch (error) {
                    console.error('❌ Ошибка при закрытии SSE соединения:', error);
                }
            });
            roomConnections.delete(roomId);
            console.log(`🔒 Закрыто ${clients.size} SSE соединений для комнаты ${roomId}`);
        }

        res.json({
            success: true,
            message: 'Комната успешно удалена'
        });

    } catch (error) {
        console.error('💥 Ошибка при удалении комнаты:', error);
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при удалении комнаты',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Получение писем пользователя для комбобокса
app.get('/api/user/letters', async (req, res) => {
    const { user_id } = req.query;
    console.log('📨 Получен запрос на получение писем пользователя для комбобокса:', user_id);

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    try {
        const lettersTableExists = await checkTableExists('letters');
        if (!lettersTableExists) {
            return res.json({
                success: true,
                letters: []
            });
        }

        const [letters] = await pool.execute(
            'SELECT id_letter, heading, message FROM letters WHERE id = ? AND `using` = false ORDER BY id_letter DESC',
            [user_id]
        );

        res.json({
            success: true,
            letters: letters
        });
    } catch (error) {
        console.error('💥 Ошибка при получении писем пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении писем',
            error: error.message
        });
    }
});

// Сохранение выбранного письма пользователем
app.post('/api/rooms/:room_id/select-letter', async (req, res) => {
    const roomId = req.params.room_id;
    const { user_id, letter_id } = req.body;
    console.log('📝 Получен запрос на выбор письма:', { roomId, user_id, letter_id });

    if (!user_id || !letter_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя и письма обязательны'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Проверяем, что письмо принадлежит пользователю и не используется
        const [letterCheck] = await connection.execute(
            'SELECT id_letter FROM letters WHERE id_letter = ? AND id = ? AND `using` = false',
            [letter_id, user_id]
        );

        if (letterCheck.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Письмо не найдено или уже используется'
            });
        }

        const [participantCheck] = await connection.execute(
            'SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?',
            [roomId, user_id]
        );

        if (participantCheck.length === 0) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'Пользователь не является участником комнаты'
            });
        }

        await connection.execute(
            'UPDATE room_participants SET selected_letter_id = ? WHERE room_id = ? AND user_id = ?',
            [letter_id, roomId, user_id]
        );

        await connection.commit();

        console.log(`✅ Пользователь ${user_id} выбрал письмо ${letter_id} в комнате ${roomId}`);

        // Отправляем событие о выборе письма
        const roomInfo = await getRoomWithParticipants(roomId, user_id);
        broadcastToRoom(roomId, {
            type: 'letter_selected',
            user_id: user_id,
            room: roomInfo.room,
            participants: roomInfo.participants,
            ready_count: roomInfo.participants.filter(p => p.is_ready).length,
            total_participants: roomInfo.participants.length,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Письмо успешно выбрано'
        });
    } catch (error) {
        console.error('💥 Ошибка при выборе письма:', error);
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при выборе письма',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Изменение статуса готовности
app.post('/api/rooms/:room_id/toggle-ready', async (req, res) => {
    const roomId = req.params.room_id;
    const { user_id } = req.body;
    console.log('✅ Получен запрос на изменение готовности:', { roomId, user_id });

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [participants] = await connection.execute(
            'SELECT selected_letter_id FROM room_participants WHERE room_id = ? AND user_id = ?',
            [roomId, user_id]
        );

        if (participants.length === 0) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'Пользователь не является участником комнаты'
            });
        }

        if (!participants[0].selected_letter_id) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Сначала выберите письмо'
            });
        }

        await connection.execute(
            'UPDATE room_participants SET is_ready = NOT is_ready WHERE room_id = ? AND user_id = ?',
            [roomId, user_id]
        );

        const [updatedParticipant] = await connection.execute(
            'SELECT is_ready FROM room_participants WHERE room_id = ? AND user_id = ?',
            [roomId, user_id]
        );

        await connection.commit();

        const newReadyStatus = updatedParticipant[0].is_ready;
        console.log(`✅ Пользователь ${user_id} изменил статус готовности на: ${newReadyStatus}`);

        const roomInfo = await getRoomWithParticipants(roomId, user_id);

        // Отправляем событие об изменении готовности
        broadcastToRoom(roomId, {
            type: 'ready_status_changed',
            user_id: user_id,
            is_ready: newReadyStatus,
            room: roomInfo.room,
            participants: roomInfo.participants,
            ready_count: roomInfo.participants.filter(p => p.is_ready).length,
            total_participants: roomInfo.participants.length,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            is_ready: newReadyStatus,
            room: roomInfo.room,
            participants: roomInfo.participants,
            ready_count: roomInfo.participants.filter(p => p.is_ready).length,
            total_participants: roomInfo.participants.length
        });
    } catch (error) {
        console.error('💥 Ошибка при изменении готовности:', error);
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при изменении готовности',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Запуск розыгрыша
app.post('/api/rooms/:room_id/draw', async (req, res) => {
    const roomId = req.params.room_id;
    const { user_id } = req.body;
    console.log('🎲 Получен запрос на запуск розыгрыша:', { roomId, user_id });

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [roomRows] = await connection.execute(
            'SELECT created_by FROM rooms WHERE id_room = ?',
            [roomId]
        );

        if (roomRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }

        if (roomRows[0].created_by != user_id) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'Только создатель комнаты может запустить розыгрыш'
            });
        }

        const [participantsRows] = await connection.execute(`
            SELECT rp.user_id, rp.is_ready, rp.selected_letter_id, u.username
            FROM room_participants rp
                     JOIN users u ON rp.user_id = u.id
            WHERE rp.room_id = ?
        `, [roomId]);

        const participants = participantsRows;
        const notReadyParticipants = participants.filter(p => !p.is_ready);
        const participantsWithoutLetter = participants.filter(p => !p.selected_letter_id);

        if (notReadyParticipants.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Не все участники готовы: ${notReadyParticipants.map(p => p.username).join(', ')}`
            });
        }

        if (participantsWithoutLetter.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Не все участники выбрали письмо: ${participantsWithoutLetter.map(p => p.username).join(', ')}`
            });
        }

        if (participants.length < 2) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Для розыгрыша нужно как минимум 2 участника'
            });
        }

        let shuffled = [...participants];
        let valid = false;
        let attempts = 0;
        const maxAttempts = 100;

        while (!valid && attempts < maxAttempts) {
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            valid = true;
            for (let i = 0; i < participants.length; i++) {
                if (participants[i].user_id === shuffled[i].user_id) {
                    valid = false;
                    break;
                }
            }
            attempts++;
        }

        if (!valid) {
            await connection.rollback();
            return res.status(500).json({
                success: false,
                message: 'Не удалось провести корректный розыгрыш. Попробуйте еще раз.'
            });
        }

        // Очищаем предыдущие результаты для этой комнаты (если есть)
        await connection.execute('DELETE FROM room_draw_results WHERE room_id = ?', [roomId]);

        // Сохраняем результаты в room_draw_results (привязано к комнате)
        for (let i = 0; i < participants.length; i++) {
            await connection.execute(
                'INSERT INTO room_draw_results (room_id, santa_id, receiver_id, letter_id, drawn_at) VALUES (?, ?, ?, ?, NOW())',
                [roomId, participants[i].user_id, shuffled[i].user_id, shuffled[i].selected_letter_id]
            );
        }

        // Обновляем письма как использованные
        const [selectedLettersRows] = await connection.execute(`
            SELECT selected_letter_id
            FROM room_participants
            WHERE room_id = ? AND selected_letter_id IS NOT NULL
        `, [roomId]);

        if (selectedLettersRows.length > 0) {
            const letterIds = selectedLettersRows.map(row => row.selected_letter_id);
            const placeholders = letterIds.map(() => '?').join(',');
            await connection.execute(`
                UPDATE letters
                SET \`using\` = true
                WHERE id_letter IN (${placeholders})
            `, letterIds);
            console.log(`✅ Помечено как использованные письма: ${letterIds.join(', ')}`);
        }

        await connection.commit();

        console.log(`✅ Розыгрыш в комнате ${roomId} завершен успешно`);

        // Получаем результаты для отправки события
        const [drawResults] = await connection.execute(`
            SELECT
                rdr.santa_id,
                santa.name as santa_name,
                rdr.receiver_id,
                receiver.name as receiver_name,
                letter.heading as letter_heading,
                letter.message as letter_message
            FROM room_draw_results rdr
                     JOIN users santa ON rdr.santa_id = santa.id
                     JOIN users receiver ON rdr.receiver_id = receiver.id
                     JOIN letters letter ON rdr.letter_id = letter.id_letter
            WHERE rdr.room_id = ?
        `, [roomId]);

        // Отправляем событие о завершении розыгрыша
        broadcastToRoom(roomId, {
            type: 'draw_completed',
            results: drawResults,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Розыгрыш завершен успешно!',
            results: drawResults
        });
    } catch (error) {
        console.error('💥 Ошибка при розыгрыше:', error);
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при проведении розыгрыша',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Получение результата розыгрыша для конкретной комнаты
app.get('/api/rooms/:room_id/draw-result', async (req, res) => {
    const roomId = req.params.room_id;
    const { user_id } = req.query;
    console.log('📊 Получен запрос на получение результата розыгрыша для комнаты:', { roomId, user_id });

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    try {
        // Получаем информацию о розыгрыше и письме получателя
        const [results] = await pool.execute(`
            SELECT
                rdr.santa_id,
                rdr.receiver_id,
                receiver.name as receiver_name,
                rdr.letter_id,
                letter.heading as letter_heading,
                letter.message as letter_message,
                rdr.drawn_at
            FROM room_draw_results rdr
                     JOIN users receiver ON rdr.receiver_id = receiver.id
                     JOIN letters letter ON rdr.letter_id = letter.id_letter
            WHERE rdr.santa_id = ? AND rdr.room_id = ?
        `, [user_id, roomId]);

        if (results.length === 0) {
            return res.json({
                success: true,
                has_result: false,
                message: 'В этой комнате розыгрыш еще не проводился'
            });
        }

        const drawResult = results[0];

        console.log('📄 Результат розыгрыша:', {
            santa_id: drawResult.santa_id,
            receiver_id: drawResult.receiver_id,
            receiver_name: drawResult.receiver_name,
            letter_id: drawResult.letter_id,
            letter_heading: drawResult.letter_heading
        });

        res.json({
            success: true,
            has_result: true,
            result: {
                santa_id: drawResult.santa_id,
                receiver_name: drawResult.receiver_name,
                letter_heading: drawResult.letter_heading,
                letter_message: drawResult.letter_message,
                drawn_at: drawResult.drawn_at
            }
        });
    } catch (error) {
        console.error('💥 Ошибка при получении результата розыгрыша:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении результата',
            error: error.message
        });
    }
});

// Получение писем, которые пользователь получил как Тайный Санта (все, независимо от комнаты)
app.get('/api/my-santa-letters', async (req, res) => {
    const { user_id } = req.query;
    console.log('🎅 Получен запрос на получение писем Тайного Санты:', user_id);

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    try {
        const [letters] = await pool.execute(`
            SELECT
                rdr.id,
                rdr.drawn_at,
                receiver.name as receiver_name,
                letter.heading as letter_heading,
                letter.message as letter_message,
                COALESCE(room.name_room, 'Удаленная комната') as room_name
            FROM room_draw_results rdr
                     JOIN users receiver ON rdr.receiver_id = receiver.id
                     JOIN letters letter ON rdr.letter_id = letter.id_letter
                     LEFT JOIN rooms room ON rdr.room_id = room.id_room
            WHERE rdr.santa_id = ?
            ORDER BY rdr.drawn_at DESC
        `, [user_id]);

        console.log(`✅ Найдено писем для Санты: ${letters.length} для пользователя ${user_id}`);
        res.json({
            success: true,
            letters: letters
        });
    } catch (error) {
        console.error('💥 Ошибка при получении писем Тайного Санты:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении писем',
            error: error.message
        });
    }
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('💥 Необработанная ошибка:', err);
    res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера'
    });
});
