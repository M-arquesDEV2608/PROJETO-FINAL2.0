const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule;
const axios = require('axios');

// Cole o token gerado pelo BotFather aqui
const TOKEN = '8879513651:AAFMrrgvn5bPzOqHN1xQ6E9SOdNxGGajBEY';

const bot = new TelegramBot(TOKEN, { polling: false });

bot.on('polling_error', (error) => {
    console.log('ERRO DO TELEGRAM:', error.message);
});

bot.on('message', (msg) => {
    console.log('MENSAGEM RECEBIDA:', msg.text);
});

bot.getMe()
    .then((me) => {
        console.log('BOT CONECTADO:', me.username);
        return bot.deleteWebHook();
    })
    .then(() => {
        bot.startPolling();
        console.log('POLLING INICIADO - aguardando mensagens...');
    })
    .catch((error) => {
        console.log('ERRO AO CONECTAR BOT:', error.message);
    });

// Armazena temporariamente o estado da conversa por usuário
const usuarioEstado = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    // Envia mensagem com os Inline Keyboards (botões interativos)
    bot.sendMessage(chatId, "🛠️ **Sistema de Manutenção SENAI**\nSelecione o local onde ocorreu o problema:", {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "💻 Lab de Informática 01", callback_data: "sala_LAB-01" }],
                [{ text: "💻 Lab de Informática 02", callback_data: "sala_LAB-02" }],
                [{ text: "⚙️ Oficina Mecânica", callback_data: "sala_OFICINA-01" }],
            ]
        }
    });
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Etapa 1: Seleção da Sala
    if (data.startsWith('sala_')) {
        const sala = data.replace('sala_', '');
        usuarioEstado[chatId] = { sala };

        bot.sendMessage(chatId, `Você selecionou a sala *${sala}*. Qual equipamento está inoperante?`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🖥️ Computador / PC", callback_data: "eq_Computador" }],
                    [{ text: "❄️ Ar Condicionado", callback_data: "eq_Ar-Condicionado" }],
                    [{ text: "📹 Projetor", callback_data: "eq_Projetor" }]
                ]
            }
        });
    } 
    // Etapa 2: Seleção do Equipamento e Envio ao Banco
    else if (data.startsWith('eq_')) {
        const equipamento = data.replace('eq_', '');
        const chamado = usuarioEstado[chatId];

        if (!chamado) {
            return bot.sendMessage(chatId, "Sessão expirada. Envie /start para reiniciar.");
        }

        try {
            // Envia para a API Backend (server.js)
            await axios.post('http://localhost:3000/api/chamados', {
                sala: chamado.sala,
                equipamento: equipamento,
                descricao: "Aviso registrado via Bot do Telegram"
            });

            bot.sendMessage(chatId, `✅ **Ocorrência Registrada!**\n\n**Local:** ${chamado.sala}\n**Item:** ${equipamento}\n\nA equipe de manutenção foi notificada.`, { parse_mode: 'Markdown' });
            delete usuarioEstado[chatId];
        } catch (error) {
            bot.sendMessage(chatId, "❌ Erro ao conectar com o banco de dados. Verifique se o servidor está rodando.");
        }
    }
});