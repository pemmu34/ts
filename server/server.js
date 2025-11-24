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

// Функция для проверки существования таблицы
const checkTableExists = async (tableName) => {
    try {
        const result = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )
        `, [tableName]);
        return result.rows[0].exists;
    } catch (error) {
        console.error(`Ошибка при проверке таблицы ${tableName}:`, error);
        return false;
    }
};

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
        const tableExists = await checkTableExists('letters');
        if (!tableExists) {
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

    try {
        // Проверяем, что пользователь является участником комнаты
        const participantCheck = await pool.query(
            'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
            [roomId, user_id]
        );

        if (participantCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Пользователь не является участником комнаты'
            });
        }

        // Сохраняем выбранное письмо
        const result = await pool.query(
            'UPDATE room_participants SET selected_letter_id = $1 WHERE room_id = $2 AND user_id = $3 RETURNING *',
            [letter_id, roomId, user_id]
        );

        console.log(`✅ Пользователь ${user_id} выбрал письмо ${letter_id} в комнате ${roomId}`);
        res.json({
            success: true,
            message: 'Письмо успешно выбрано'
        });
    } catch (error) {
        console.error('💥 Ошибка при выборе письма:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при выборе письма',
            error: error.message
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

// Вспомогательная функция для получения комнаты с участниками
async function getRoomWithParticipants(roomId) {
    const roomResult = await pool.query(`
        SELECT r.id_room, r.name_room, r.pass_room, r.created_by,
               u.username as creator_name
        FROM rooms r
        JOIN users u ON r.created_by = u.id
        WHERE r.id_room = $1
    `, [roomId]);

    const participantsResult = await pool.query(`
        SELECT 
            u.id, 
            u.username,
            rp.is_ready,
            rp.selected_letter_id,
            l.heading as selected_letter_heading,
            (u.id = $2) as is_current_user,
            CASE 
                WHEN u.id = $2 THEN ' (Вы)'
                WHEN u.id = $3 THEN ' (создатель)'
                ELSE ''
            END as user_role
        FROM room_participants rp
        JOIN users u ON rp.user_id = u.id
        LEFT JOIN letters l ON rp.selected_letter_id = l.id_letter
        WHERE rp.room_id = $1
        ORDER BY 
            CASE WHEN u.id = $3 THEN 0 ELSE 1 END,
            rp.joined_at
    `, [roomId, roomResult.rows[0].created_by, roomResult.rows[0].created_by]);

    return {
        room: roomResult.rows[0],
        participants: participantsResult.rows
    };
}

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

    try {
        // Проверяем, что пользователь выбрал письмо
        const participant = await pool.query(
            'SELECT selected_letter_id FROM room_participants WHERE room_id = $1 AND user_id = $2',
            [roomId, user_id]
        );

        if (participant.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Пользователь не является участником комнаты'
            });
        }

        if (!participant.rows[0].selected_letter_id) {
            return res.status(400).json({
                success: false,
                message: 'Сначала выберите письмо'
            });
        }

        // Переключаем статус готовности
        const result = await pool.query(
            'UPDATE room_participants SET is_ready = NOT is_ready WHERE room_id = $1 AND user_id = $2 RETURNING is_ready',
            [roomId, user_id]
        );

        const newReadyStatus = result.rows[0].is_ready;
        console.log(`✅ Пользователь ${user_id} изменил статус готовности на: ${newReadyStatus}`);

        // Получаем обновленную информацию о комнате
        const roomInfo = await getRoomWithParticipants(roomId);

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
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при изменении готовности',
            error: error.message
        });
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

    try {
        // Проверяем, что пользователь - создатель комнаты
        const roomResult = await pool.query(
            'SELECT created_by FROM rooms WHERE id_room = $1',
            [roomId]
        );

        if (roomResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }

        if (roomResult.rows[0].created_by != user_id) {
            return res.status(403).json({
                success: false,
                message: 'Только создатель комнаты может запустить розыгрыш'
            });
        }

        // Проверяем, что все участники готовы
        const participantsResult = await pool.query(`
            SELECT rp.user_id, rp.is_ready, rp.selected_letter_id, u.username
            FROM room_participants rp
            JOIN users u ON rp.user_id = u.id
            WHERE rp.room_id = $1
        `, [roomId]);

        const participants = participantsResult.rows;
        const notReadyParticipants = participants.filter(p => !p.is_ready);
        const participantsWithoutLetter = participants.filter(p => !p.selected_letter_id);

        if (notReadyParticipants.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Не все участники готовы: ${notReadyParticipants.map(p => p.username).join(', ')}`
            });
        }

        if (participantsWithoutLetter.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Не все участники выбрали письмо: ${participantsWithoutLetter.map(p => p.username).join(', ')}`
            });
        }

        if (participants.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Для розыгрыша нужно как минимум 2 участника'
            });
        }

        // Алгоритм розыгрыша - гарантируем, что никто не получит свое письмо
        let shuffled = [...participants];
        let valid = false;
        let attempts = 0;
        const maxAttempts = 100;

        while (!valid && attempts < maxAttempts) {
            // Перемешиваем массив
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // Проверяем, что никто не получил свое письмо
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
            return res.status(500).json({
                success: false,
                message: 'Не удалось провести корректный розыгрыш. Попробуйте еще раз.'
            });
        }

        // Сохраняем результаты розыгрыша
        for (let i = 0; i < participants.length; i++) {
            await pool.query(
                'INSERT INTO room_draws (room_id, santa_id, receiver_id) VALUES ($1, $2, $3)',
                [roomId, participants[i].user_id, shuffled[i].user_id]
            );
        }

        console.log(`✅ Розыгрыш в комнате ${roomId} завершен успешно`);

        // Получаем результаты розыгрыша для ответа
        const drawResults = await pool.query(`
            SELECT 
                rd.santa_id,
                santa.username as santa_name,
                rd.receiver_id,
                receiver.username as receiver_name,
                letter.heading as letter_heading,
                letter.message as letter_message
            FROM room_draws rd
            JOIN users santa ON rd.santa_id = santa.id
            JOIN users receiver ON rd.receiver_id = receiver.id
            JOIN room_participants rp ON rd.receiver_id = rp.user_id AND rd.room_id = rp.room_id
            JOIN letters letter ON rp.selected_letter_id = letter.id_letter
            WHERE rd.room_id = $1
        `, [roomId]);

        res.json({
            success: true,
            message: 'Розыгрыш завершен успешно!',
            results: drawResults.rows
        });
    } catch (error) {
        console.error('💥 Ошибка при розыгрыше:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при проведении розыгрыша',
            error: error.message
        });
    }
});

// Получение результата розыгрыша для пользователя
app.get('/api/rooms/:room_id/draw-result', async (req, res) => {
    const roomId = req.params.room_id;
    const { user_id } = req.query;
    console.log('📊 Получен запрос на получение результата розыгрыша:', { roomId, user_id });

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID пользователя обязателен'
        });
    }

    try {
        const result = await pool.query(`
            SELECT 
                rd.santa_id,
                receiver.username as receiver_name,
                letter.heading as letter_heading,
                letter.message as letter_message,
                rd.drawn_at
            FROM room_draws rd
            JOIN users receiver ON rd.receiver_id = receiver.id
            JOIN room_participants rp ON rd.receiver_id = rp.user_id AND rd.room_id = rp.room_id
            JOIN letters letter ON rp.selected_letter_id = letter.id_letter
            WHERE rd.room_id = $1 AND rd.santa_id = $2
        `, [roomId, user_id]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                has_result: false,
                message: 'Результат розыгрыша еще не доступен'
            });
        }

        res.json({
            success: true,
            has_result: true,
            result: result.rows[0]
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


// Получение всех комнат (публичных) для отображения всем пользователям
app.get('/api/rooms/all', async (req, res) => {
    console.log('🏠 Получен запрос на получение всех комнат');

    try {
        const result = await pool.query(`
            SELECT r.id_room, r.name_room, r.created_by,
                   COUNT(rp.user_id) as participants_count,
                   u.username as creator_name
            FROM rooms r
            LEFT JOIN room_participants rp ON r.id_room = rp.room_id
            JOIN users u ON r.created_by = u.id
            GROUP BY r.id_room, r.name_room, r.created_by, u.username
            ORDER BY r.id_room DESC
        `);

        console.log(`✅ Найдено всех комнат: ${result.rows.length}`);
        res.json({
            success: true,
            rooms: result.rows
        });
    } catch (error) {
        console.error('💥 Ошибка при получении всех комнат:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении комнат',
            error: error.message
        });
    }
});

// Получение информации о конкретной комнате - ОБНОВЛЯЕМ ДЛЯ ДИНАМИКИ
app.get('/api/rooms/:room_id', async (req, res) => {
    const roomId = req.params.room_id;
    console.log('📋 Получен запрос на информацию о комнате:', roomId);

    try {
        const roomResult = await pool.query(`
            SELECT r.id_room, r.name_room, r.pass_room, r.created_by,
                   u.username as creator_name
            FROM rooms r
            JOIN users u ON r.created_by = u.id
            WHERE r.id_room = $1
        `, [roomId]);

        if (roomResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }

        const room = roomResult.rows[0];

        // Получаем участников комнаты
        const participantsResult = await pool.query(`
            SELECT 
                u.id, 
                u.username,
                rp.joined_at,
                (u.id = $2) as is_current_user,
                CASE 
                    WHEN u.id = $2 THEN ' (Вы)'
                    WHEN u.id = $3 THEN ' (создатель)'
                    ELSE ''
                END as user_role
            FROM room_participants rp
            JOIN users u ON rp.user_id = u.id
            WHERE rp.room_id = $1
            ORDER BY 
                CASE WHEN u.id = $3 THEN 0 ELSE 1 END,
                rp.joined_at
        `, [roomId, room.created_by, room.created_by]);

        console.log(`✅ Участники комнаты ${roomId}: ${participantsResult.rows.length}`);

        res.json({
            success: true,
            room: room,
            participants: participantsResult.rows,
            lastUpdated: new Date().toISOString() // Добавляем время обновления
        });
    } catch (error) {
        console.error('💥 Ошибка при получении информации о комнате:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении информации о комнате',
            error: error.message
        });
    }
});

// Присоединение к комнате по паролю - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.post('/api/rooms/join', async (req, res) => {
    const { room_id, pass_room, user_id } = req.body; // Добавляем room_id
    console.log('🔑 Получен запрос на присоединение к комнате:', { room_id, pass_room, user_id });

    if (!room_id || !pass_room || !user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID комнаты, пароль комнаты и ID пользователя обязательны'
        });
    }

    try {
        // Находим комнату по ID и проверяем пароль
        const roomResult = await pool.query(
            'SELECT * FROM rooms WHERE id_room = $1 AND pass_room = $2',
            [room_id, pass_room]
        );

        if (roomResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Неверный пароль для выбранной комнаты'
            });
        }

        const room = roomResult.rows[0];

        // Проверяем, не участник ли уже
        const existingParticipant = await pool.query(
            'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
            [room.id_room, user_id]
        );

        if (existingParticipant.rows.length > 0) {
            console.log(`✅ Пользователь ${user_id} уже в комнате ${room.id_room} - возвращаем данные комнаты`);
            return res.json({
                success: true,
                room: room,
                message: 'Вы уже в этой комнате'
            });
        }

        // Добавляем участника
        await pool.query(
            'INSERT INTO room_participants (room_id, user_id) VALUES ($1, $2)',
            [room.id_room, user_id]
        );

        console.log(`✅ Пользователь ${user_id} присоединился к комнате ${room.id_room}`);
        res.json({
            success: true,
            room: room,
            message: 'Вы успешно присоединились к комнате'
        });
    } catch (error) {
        console.error('💥 Ошибка при присоединении к комнате:', error);

        // Проверяем конкретные ошибки PostgreSQL
        if (error.code === '23503') { // foreign key violation
            return res.status(400).json({
                success: false,
                message: 'Пользователь не существует'
            });
        } else if (error.code === '23505') { // unique violation
            // Если уже участник - возвращаем успех
            console.log(`✅ Пользователь ${user_id} уже в комнате (unique violation)`);
            const roomResult = await pool.query(
                'SELECT * FROM rooms WHERE id_room = $1 AND pass_room = $2',
                [room_id, pass_room]
            );
            if (roomResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Неверный пароль для выбранной комнаты'
                });
            }
            return res.json({
                success: true,
                room: roomResult.rows[0],
                message: 'Вы уже в этой комнате'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при присоединении к комнате',
            error: error.message
        });
    }
});

// Создание новой комнаты БЕЗ проверки уникальности названия
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
        // УБИРАЕМ проверку на уникальность названия - комнаты могут иметь одинаковые названия
        // Создаем комнату с предоставленным паролем
        const roomResult = await pool.query(
            'INSERT INTO rooms (name_room, pass_room, created_by) VALUES ($1, $2, $3) RETURNING *',
            [name_room.trim(), pass_room.trim(), created_by]
        );

        const room = roomResult.rows[0];

        // Автоматически добавляем создателя в участники
        await pool.query(
            'INSERT INTO room_participants (room_id, user_id) VALUES ($1, $2)',
            [room.id_room, created_by]
        );

        console.log(`✅ Комната создана с ID: ${room.id_room} и названием: ${name_room}`);
        res.json({
            success: true,
            room: room,
            message: 'Комната успешно создана'
        });
    } catch (error) {
        console.error('💥 Ошибка при создании комнаты:', error);

        // Убираем проверку на уникальность названия
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при создании комнаты',
            error: error.message
        });
    }
});

// Выход из комнаты (с удалением комнаты если вышел создатель)
app.post('/api/rooms/leave', async (req, res) => {
    const { room_id, user_id } = req.body;
    console.log('🚪 Получен запрос на выход из комнаты:', { room_id, user_id });

    if (!room_id || !user_id) {
        return res.status(400).json({
            success: false,
            message: 'ID комнаты и ID пользователя обязательны'
        });
    }

    try {
        // Получаем информацию о комнате
        const roomResult = await pool.query(
            'SELECT * FROM rooms WHERE id_room = $1',
            [room_id]
        );

        if (roomResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }

        const room = roomResult.rows[0];

        // Проверяем, является ли пользователь создателем комнаты
        if (room.created_by == user_id) {
            // Если создатель выходит - удаляем комнату полностью
            await pool.query('DELETE FROM room_participants WHERE room_id = $1', [room_id]);
            await pool.query('DELETE FROM rooms WHERE id_room = $1', [room_id]);

            console.log(`✅ Комната ${room_id} удалена, так как вышел создатель`);
            res.json({
                success: true,
                message: 'Комната удалена',
                roomDeleted: true
            });
        } else {
            // Если обычный участник - просто удаляем его из участников
            await pool.query(
                'DELETE FROM room_participants WHERE room_id = $1 AND user_id = $2',
                [room_id, user_id]
            );

            console.log(`✅ Пользователь ${user_id} вышел из комнаты ${room_id}`);
            res.json({
                success: true,
                message: 'Вы вышли из комнаты',
                roomDeleted: false
            });
        }
    } catch (error) {
        console.error('💥 Ошибка при выходе из комнаты:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при выходе из комнаты',
            error: error.message
        });
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

        const result = await pool.query(
            'SELECT id_letter, heading, message FROM letters WHERE id = $1 ORDER BY id_letter DESC',
            [user_id]
        );

        res.json({
            success: true,
            letters: result.rows
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
    console.log(`🏠 API комнат доступно по: http://localhost:${port}/api/rooms`);
});