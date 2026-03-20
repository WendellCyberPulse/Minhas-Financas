// ========== BANCOS ==========
console.log("🏦 Página de bancos carregada");

document.addEventListener('DOMContentLoaded', function() {
    const formBanco = document.getElementById('formBanco');
    
    if (!formBanco) return;
    
    console.log("✅ Inicializando bancos...");
    
    let bancos = [];
    const listaBanco = document.getElementById('listaBanco');
    const saldoTotalElement = document.getElementById('saldoTotalBancos');
    const totalBancosElement = document.getElementById('totalBancos'); // NOVO

    function atualizarListaBancos() {
        if (!listaBanco) return;
        
        // Ordenar por nome (opcional)
        bancos.sort((a, b) => a.nome.localeCompare(b.nome));
        
        listaBanco.innerHTML = '';
        let saldoTotal = 0;

        // Dentro de atualizarListaBancos, antes do forEach
        if (bancos.length === 0) {
            listaBanco.innerHTML = `
                <div class="lista-item">
                    <span colspan="4" style="text-align: center; color: #888;">
                        Nenhum banco cadastrado
                    </span>
                </div>
            `;
            return;
        }
        
        bancos.forEach(banco => {
            const item = document.createElement('div');
            item.className = 'lista-item';
            item.innerHTML = `
                <span>${banco.nome}</span>
                <span>${banco.tipo}</span>
                <span>${formatarMoeda(banco.saldo)}</span>
                <span>
                    <button class="btn-editar" onclick="editarBanco(${banco.id})" data-tooltip="Editar banco">✏️</button>
                    <button class="btn-excluir" onclick="excluirBanco(${banco.id})" data-tooltip="Excluir banco">🗑️</button>
                </span>
            `;
            listaBanco.appendChild(item);
            saldoTotal += banco.saldo;
        });
        
        if (saldoTotalElement) {
            saldoTotalElement.textContent = formatarMoeda(saldoTotal);;
        }
        
        // NOVO: Mostrar total de bancos
        if (totalBancosElement) {
            totalBancosElement.textContent = bancos.length;
        }
    }

    function carregarBancos() {
        const dadosSalvos = localStorage.getItem('bancos');
        if (dadosSalvos) {
            bancos = JSON.parse(dadosSalvos);
            atualizarListaBancos();
        }
    }

    function cadastrarBanco(evento) {
        evento.preventDefault();
        
        const nome = document.getElementById('nomeBanco').value.trim();
        const tipo = document.getElementById('tipoConta').value;
        const saldo = parseFloat(document.getElementById('saldoAtual').value) || 0;
        
        // Validação mais flexível (permite saldo 0)
        if (!nome || !tipo) {
            alert('Preencha nome e tipo da conta!');
            return;
        }
        
        const editandoId = sessionStorage.getItem('editandoBancoId');
        let bancosExistentes = JSON.parse(localStorage.getItem('bancos')) || [];
        
        if (editandoId) {
            const bancoAtualizado = {
                id: Date.now(),
                nome: nome,
                tipo: tipo,
                saldo: saldo
            };

            if (saldo < 0) {
                if (!confirm('Saldo negativo? Deseja continuar?')) {
                    return;
                }
            }       
            
            bancosExistentes.push(bancoAtualizado);
            localStorage.setItem('bancos', JSON.stringify(bancosExistentes));
            
            sessionStorage.removeItem('editandoBancoId');
            
            const btn = document.querySelector('#formBanco button[type="submit"]');
            btn.textContent = '💾 Salvar banco';
            
            console.log('Banco atualizado:', bancoAtualizado);
            
        } else {
            const novoBanco = {
                id: Date.now(),
                nome: nome,
                tipo: tipo,
                saldo: saldo
            };
            
            bancosExistentes.push(novoBanco);
            localStorage.setItem('bancos', JSON.stringify(bancosExistentes));
            console.log('Banco cadastrado:', novoBanco);
        }
        
        bancos = JSON.parse(localStorage.getItem('bancos')) || [];
        atualizarListaBancos();
        
        document.getElementById('nomeBanco').value = '';
        document.getElementById('tipoConta').value = 'corrente';
        document.getElementById('saldoAtual').value = '';
    }

    // NOVO: Botão cancelar edição
    window.cancelarEdicao = function() {
        if (confirm('Cancelar edição?')) {
            sessionStorage.removeItem('editandoBancoId');
            document.getElementById('formBanco').reset();
            document.getElementById('tipoConta').value = 'corrente';
            const btn = document.querySelector('#formBanco button[type="submit"]');
            btn.textContent = '💾 Salvar banco';
        }
    }

    formBanco.addEventListener('submit', cadastrarBanco);
    carregarBancos();
});

// ===== FUNÇÕES GLOBAIS =====

window.excluirBanco = function(id) {
    if (confirm('Tem certeza que deseja excluir este banco?')) {
        let bancos = JSON.parse(localStorage.getItem('bancos')) || [];
        bancos = bancos.filter(banco => banco.id !== id);
        localStorage.setItem('bancos', JSON.stringify(bancos));
        location.reload();
    }
}

window.editarBanco = function(id) {
    // NOVO: Confirmação antes de editar
    if (!confirm('Deseja editar este banco?')) return;
    
    console.log("Editando banco ID:", id);
    
    let bancos = JSON.parse(localStorage.getItem('bancos')) || [];
    const banco = bancos.find(b => b.id === id);
    
    if (banco) {
        document.getElementById('nomeBanco').value = banco.nome;
        document.getElementById('tipoConta').value = banco.tipo;
        document.getElementById('saldoAtual').value = banco.saldo;
        
        const novosBancos = bancos.filter(b => b.id !== id);
        localStorage.setItem('bancos', JSON.stringify(novosBancos));
        
        const btn = document.querySelector('#formBanco button[type="submit"]');
        btn.textContent = '✏️ Atualizar banco';
        
        sessionStorage.setItem('editandoBancoId', id);
        document.getElementById('formBanco').scrollIntoView({ behavior: 'smooth' });
    }
}