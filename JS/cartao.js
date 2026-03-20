// ========== CARTÕES ==========
console.log("💳 Página de cartões carregada");

document.addEventListener('DOMContentLoaded', function() {
    const formCartao = document.getElementById('formCartao');
    
    if (!formCartao) return; // Sai se não for página de cartões
    
    console.log("✅ Inicializando cartões...");
    
    let cartoes = [];
    const listaCartoes = document.getElementById('listaCartoes');
    const limiteTotalElement = document.getElementById('limiteTotalGeral');
    const totalUsadoElement = document.getElementById('totalUsado');
    const disponivelElement = document.getElementById('disponivel');
    const totalCartoesElement = document.getElementById('totalCartoes'); // NOVO

    // ===== FUNÇÕES LOCAIS =====
    function atualizarListaCartoes() {
        if (!listaCartoes) return;
        
        // Ordenar por nome (opcional)
        cartoes.sort((a, b) => a.nome.localeCompare(b.nome));
        
        listaCartoes.innerHTML = '';
        
        let limiteTotal = 0;
        let totalUsado = 0;
        
        cartoes.forEach(cartao => {
            const item = document.createElement('div');
            item.className = 'lista-item';
            
            const usado = cartao.usado || 0;
            const disponivel = cartao.limite - usado;
            
            item.innerHTML = `
                <span>${cartao.nome}</span>
                <span>${cartao.bandeira}</span>
                <span>${formatarMoeda(cartao.limite)}</span>
                <span>${formatarMoeda(usado)}</span>
                <span>${formatarMoeda(disponivel)}</span>
                <span>Dia ${cartao.vencimento}</span>
               <span>
                    <button class="btn-pagar-fatura" onclick="pagarFatura(${cartao.id})" data-tooltip="Pagar fatura">💰 Pagar Fatura</button>
                    <button class="btn-editar" onclick="editarCartao(${cartao.id})">✏️</button>
                    <button class="btn-excluir" onclick="excluirCartao(${cartao.id})">🗑️</button>
                </span>
            `;
            
            listaCartoes.appendChild(item);
            limiteTotal += cartao.limite;
            totalUsado += usado;
        });
        
        const disponivelTotal = limiteTotal - totalUsado;
        
        if (limiteTotalElement) {
            limiteTotalElement.textContent = formatarMoeda(limiteTotal);
        }
        if (totalUsadoElement) {
            totalUsadoElement.textContent = formatarMoeda(totalUsado);
        }
        if (disponivelElement) {
           disponivelElement.textContent = formatarMoeda(disponivelTotal);
        }
        
        // Mostrar total de cartões
        if (totalCartoesElement) {
            totalCartoesElement.textContent = cartoes.length;
        }
    }

    function carregarCartoes() {
        const dadosSalvos = localStorage.getItem('cartoes');
        if (dadosSalvos) {
            cartoes = JSON.parse(dadosSalvos);
            atualizarListaCartoes();
        }
    }

    function salvarCartoes() {
        localStorage.setItem('cartoes', JSON.stringify(cartoes));
    }

    function cadastrarCartao(evento) {
        evento.preventDefault();
        
        const nome = document.getElementById('nomeCartao').value.trim();
        const bandeira = document.getElementById('bandeira').value;
        const limite = parseFloat(document.getElementById('limiteTotal').value) || 0;
        const vencimento = document.getElementById('vencimento').value;
        
        // Validação
        if (!nome || !bandeira || limite === 0 || !vencimento) {
            alert('Preencha todos os campos corretamente!');
            return;
        }
        
        // Verifica se está editando (tem ID guardado)
        const editandoId = sessionStorage.getItem('editandoCartaoId');
        
        // Pega cartões existentes
        let cartoesExistentes = JSON.parse(localStorage.getItem('cartoes')) || [];
        
        if (editandoId) {
            // É EDIÇÃO
            console.log("Finalizando edição do cartão");
            
            const cartaoAtualizado = {
                id: Date.now(), // Novo ID
                nome: nome,
                bandeira: bandeira,
                limite: limite,
                vencimento: vencimento,
                usado: 0 // Começa com 0 usado
            };
            
            cartoesExistentes.push(cartaoAtualizado);
            localStorage.setItem('cartoes', JSON.stringify(cartoesExistentes));
            
            // Limpa o ID de edição
            sessionStorage.removeItem('editandoCartaoId');
            
            // Volta o texto do botão
            const btn = document.querySelector('#formCartao button[type="submit"]');
            btn.textContent = '💾 Salvar cartão';
            
            console.log('Cartão atualizado:', cartaoAtualizado);
            
        } else {
            // É CADASTRO NOVO
            const novoCartao = {
                id: Date.now(),
                nome: nome,
                bandeira: bandeira,
                limite: limite,
                vencimento: vencimento,
                usado: 0
            };
            
            cartoesExistentes.push(novoCartao);
            localStorage.setItem('cartoes', JSON.stringify(cartoesExistentes));
            
            console.log('Cartão cadastrado:', novoCartao);
        }
        
        // Recarrega a lista
        cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
        atualizarListaCartoes();
        
        // Limpa o formulário
        document.getElementById('nomeCartao').value = '';
        document.getElementById('bandeira').value = 'visa';
        document.getElementById('limiteTotal').value = '';
        document.getElementById('vencimento').value = '5';
    }

    // NOVO: Cancelar edição
    window.cancelarEdicaoCartao = function() {
        if (confirm('Cancelar edição?')) {
            sessionStorage.removeItem('editandoCartaoId');
            document.getElementById('formCartao').reset();
            document.getElementById('bandeira').value = 'visa';
            document.getElementById('vencimento').value = '5';
            const btn = document.querySelector('#formCartao button[type="submit"]');
            btn.textContent = '💾 Salvar cartão';
        }
    }

    // ===== EVENTOS =====
    formCartao.addEventListener('submit', cadastrarCartao);
    carregarCartoes();
});

// ===== FUNÇÕES GLOBAIS (fora do DOMContentLoaded) =====

// Excluir cartão
window.excluirCartao = function(id) {
    if (confirm('Tem certeza que deseja excluir este cartão?')) {
        let cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
        cartoes = cartoes.filter(cartao => cartao.id !== id);
        localStorage.setItem('cartoes', JSON.stringify(cartoes));
        location.reload();
    }
}

// Editar cartão
window.editarCartao = function(id) {
    if (!confirm('Deseja editar este cartão?')) return;
    
    console.log("Editando cartão ID:", id);
    
    let cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
    const cartao = cartoes.find(c => c.id === id);
    
    if (cartao) {
        console.log("Cartão encontrado:", cartao);
        
        // Preenche o formulário com os dados do cartão
        document.getElementById('nomeCartao').value = cartao.nome;
        document.getElementById('bandeira').value = cartao.bandeira;
        document.getElementById('limiteTotal').value = cartao.limite;
        document.getElementById('vencimento').value = cartao.vencimento;
        
        // Remove o cartão antigo do array
        const novosCartoes = cartoes.filter(c => c.id !== id);
        localStorage.setItem('cartoes', JSON.stringify(novosCartoes));
        
        // Muda o texto do botão para indicar que é atualização
        const btn = document.querySelector('#formCartao button[type="submit"]');
        btn.textContent = '✏️ Atualizar cartão';
        
        // Guarda o ID original para referência
        sessionStorage.setItem('editandoCartaoId', id);
        
        // Rola suavemente até o formulário
        document.getElementById('formCartao').scrollIntoView({ behavior: 'smooth' });
    } else {
        console.error("Cartão não encontrado:", id);
    }
}

// ===== FUNÇÃO PARA PAGAR FATURA DO CARTÃO =====
window.pagarFatura = function(id) {
    let cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
    const cartao = cartoes.find(c => c.id === id);
    
    if (!cartao || cartao.usado === 0) {
        alert('❌ Este cartão não tem fatura pendente!');
        return;
    }
    
    const valorFatura = cartao.usado;
    
    if (!confirm(`💰 Pagar fatura de ${formatarMoeda(valorFatura)} do cartão ${cartao.nome}?`)) return;
    
    // Buscar bancos disponíveis
    let bancos = JSON.parse(localStorage.getItem('bancos')) || [];
    
    if (bancos.length === 0) {
        alert('❌ Nenhum banco cadastrado para pagar a fatura!');
        return;
    }
    
    // Criar select para escolher o banco
    const nomesBancos = bancos.map(b => b.nome).join(', ');
    const bancoEscolhido = prompt(`Escolha o banco para pagar a fatura:\nBancos disponíveis: ${nomesBancos}\n\nDigite o nome do banco:`);
    
    if (!bancoEscolhido) return;
    
    const bancoSelecionado = bancos.find(b => b.nome.toLowerCase().trim() === bancoEscolhido.toLowerCase().trim());
    
    if (!bancoSelecionado) {
        alert('❌ Banco não encontrado!');
        return;
    }
    
    if (bancoSelecionado.saldo < valorFatura) {
        if (!confirm(`⚠️ Saldo insuficiente! Banco ${bancoSelecionado.nome} tem apenas ${formatarMoeda(bancoSelecionado.saldo)}. Deseja pagar mesmo assim (ficará negativo)?`)) {
            return;
        }
    }
    
    // 1. REMOVER valor do banco
    bancos = bancos.map(b => {
        if (b.id === bancoSelecionado.id) {
            b.saldo = (b.saldo || 0) - valorFatura;
        }
        return b;
    });
    localStorage.setItem('bancos', JSON.stringify(bancos));
    
    // 2. ZERAR usado do cartão
    cartoes = cartoes.map(c => {
        if (c.id === id) {
            c.usado = 0;
        }
        return c;
    });
    localStorage.setItem('cartoes', JSON.stringify(cartoes));
    
    // 3. REGISTRAR como despesa (opcional)
    let despesas = JSON.parse(localStorage.getItem('despesas')) || [];
    const novaDespesa = {
        id: Date.now(),
        tipo: 'individual',
        descricao: `Pagamento fatura ${cartao.nome}`,
        valor: valorFatura,
        data: new Date().toISOString().split('T')[0],
        categoria: 'fatura_cartao',
        pagamento: 'debito',
        banco: bancoSelecionado.nome,
        paga: true
    };
    despesas.push(novaDespesa);
    localStorage.setItem('despesas', JSON.stringify(despesas));
    
    alert(`✅ Fatura de ${formatarMoeda(valorFatura)} paga com sucesso!`);
    location.reload();
}
