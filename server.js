const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Serve o painel web (HTML, CSS e JavaScript)
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Inicialização do Banco de Dados SQLite
const db = new sqlite3.Database('./senai_manutencao.db', (err) => {
    if (!err) {
        db.run(`CREATE TABLE IF NOT EXISTS chamados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sala TEXT NOT NULL,
            equipamento TEXT NOT NULL,
            descricao TEXT,
            status TEXT DEFAULT 'PENDENTE',
            data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Endpoint para o Telegram inserir chamados
app.post('/api/chamados', (req, res) => {
    const { sala, equipamento, descricao } = req.body;
    db.run(`INSERT INTO chamados (sala, equipamento, descricao) VALUES (?, ?, ?)`,
        [sala, equipamento, descricao],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, status: 'Criado' });
        }
    );
});

// Endpoint para o Painel Web listar todos os chamados
app.get('/api/chamados', (req, res) => {
    db.all(`SELECT * FROM chamados ORDER BY data DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Endpoint para alterar status (Dashboard -> Resolvido)
app.patch('/api/chamados/:id', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE chamados SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

// Endpoint leve para o ESP32 checar se a sala tem problemas pendentes
app.get('/api/status-sala/:sala', (req, res) => {
    const sala = req.params.sala;
    db.get(`SELECT COUNT(*) as pendentes FROM chamados WHERE sala = ? AND status = 'PENDENTE'`, [sala], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ sala, tem_defeito: row.pendentes > 0, quantidade: row.pendentes });
    });
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));