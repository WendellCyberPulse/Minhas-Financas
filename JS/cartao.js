// ========== CARTÕES ==========
console.log("💳 Página de cartões carregada");

document.addEventListener('DOMContentLoaded', async function() {
    const formCartao = document.getElementById('formCartao');
    
    if (!formCartao) return;
    
    console.log("✅ Inicializando cartões com Supabase...");
    
    // Verificar se o cliente Supabase está disponível
    if (!window.supabaseClient) {
        console.error("❌ Supabase client não disponível!");
        alert("Erro de conexão com o banco de dados.");
        return;
    }
    
    const listaCartoes = document.getElementById('listaCartoes');
    const limiteTotalElement = document.getElementById('limiteTotalGeral');
    const totalUsadoElement = document.getElementById('totalUsado');
    const disponivelElement = document.getElementById('disponivel');
    const totalCartoesElement = document.getElementById('totalCartoes');

    // ===== FUNÇÃO PARA ATUALIZAR LISTA =====
    async function atualizarListaCartoes() {
        if (!listaCartoes) return;
        
        // Buscar cartões do Supabase
        const { data: cartoes, error } = await window.supabaseClient
            .from('cartoes')
            .select('*')
            .order('nome');
        
        if (error) {
            console.error('Erro ao carregar cartões:', error);
            return;
        }
        
        listaCartoes.innerHTML = '';
        
        let limiteTotal = 0;
        let totalUsado = 0;
        
        if (cartoes.length === 0) {
            listaCartoes.innerHTML = `
                <div class="lista-item">
                    <span colspan="7" style="text-align: center; color: #888;">
                        Nenhum cartão cadastrado
                    </span>
                </div>
            `;
        }
        
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
                    ${usado > 0 ? `<button class="btn-pagar-fatura" onclick="pagarFatura(${cartao.id})" data-tooltip="Pagar fatura">💰 Pagar Fatura</button>` : ''}
                    <button class="btn-editar" onclick="editarCartao(${cartao.id})">✏️</button>
                    <button class="btn-excluir" onclick="excluirCartao(${cartao.id})">🗑️</button>
                </span>
            `;
            
            listaCartoes.appendChild(item);
            limiteTotal += cartao.limite;
            totalUsado += usado;
        });
        
        const disponivelTotal = limiteTotal - totalUsado;
        
        if (limiteTotalElement) limiteTotalElement.textContent = formatarMoeda(limiteTotal);
        if (totalUsadoElement) totalUsadoElement.textContent = formatarMoeda(totalUsado);
        if (disponivelElement) disponivelElement.textContent = formatarMoeda(disponivelTotal);
        if (totalCartoesElement) totalCartoesElement.textContent = cartoes.length;
    }

    // ===== FUNÇÃO PARA CADASTRAR CARTÃO =====
    async function cadastrarCartao(evento) {
        evento.preventDefault();
        
        const nome = document.getElementById('nomeCartao').value.trim();
        const bandeira = document.getElementById('bandeira').value;
        const limite = parseFloat(document.getElementById('limiteTotal').value) || 0;
        const vencimento = document.getElementById('vencimento').value;
        
        if (!nome || !bandeira || limite === 0 || !vencimento) {
            alert('Preencha todos os campos corretamente!');
            return;
        }
        
        // Pegar usuário logado
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            alert('❌ Você precisa estar logado!');
            return;
        }
        
        const editandoId = sessionStorage.getItem('editandoCartaoId');
        
        if (editandoId) {
            // EDIÇÃO
            const { error } = await window.supabaseClient
                .from('cartoes')
                .update({
                    nome: nome,
                    bandeira: bandeira,
                    limite: limite,
                    vencimento: vencimento
                })
                .eq('id', parseInt(editandoId));
            
            if (error) {
                alert('❌ Erro ao atualizar cartão: ' + error.message);
                return;
            }
            
            sessionStorage.removeItem('editandoCartaoId');
            
            const btn = document.querySelector('#formCartao button[type="submit"]');
            btn.textContent = '💾 Salvar cartão';
            
            console.log('Cartão atualizado!');
            
        } else {
            // CADASTRO NOVO
            const { error } = await window.supabaseClient
                .from('cartoes')
                .insert([{
                    id: Date.now(),
                    nome: nome,
                    bandeira: bandeira,
                    limite: limite,
                    vencimento: vencimento,
                    usado: 0,
                    user_id: user.id
                }]);
            
            if (error) {
                alert('❌ Erro ao cadastrar cartão: ' + error.message);
                return;
            }
            
            console.log('Cartão cadastrado!');
        }
        
        // Limpa formulário e atualiza lista
        document.getElementById('nomeCartao').value = '';
        document.getElementById('bandeira').value = 'visa';
        document.getElementById('limiteTotal').value = '';
        document.getElementById('vencimento').value = '5';
        
        await atualizarListaCartoes();
    }

    // Cancelar edição
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

    formCartao.addEventListener('submit', cadastrarCartao);
    await atualizarListaCartoes();
});

// ===== FUNÇÕES GLOBAIS =====

// Excluir cartão
window.excluirCartao = async function(id) {
    if (confirm('Tem certeza que deseja excluir este cartão?')) {
        const { error } = await window.supabaseClient
            .from('cartoes')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('❌ Erro ao excluir cartão: ' + error.message);
            return;
        }
        
        location.reload();
    }
}

// Editar cartão
window.editarCartao = async function(id) {
    if (!confirm('Deseja editar este cartão?')) return;
    
    const { data: cartao, error } = await window.supabaseClient
        .from('cartoes')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error || !cartao) {
        alert('❌ Cartão não encontrado!');
        return;
    }
    
    document.getElementById('nomeCartao').value = cartao.nome;
    document.getElementById('bandeira').value = cartao.bandeira;
    document.getElementById('limiteTotal').value = cartao.limite;
    document.getElementById('vencimento').value = cartao.vencimento;
    
    // Remover o cartão antigo (será recriado ao salvar)
    await window.supabaseClient.from('cartoes').delete().eq('id', id);
    
    const btn = document.querySelector('#formCartao button[type="submit"]');
    btn.textContent = '✏️ Atualizar cartão';
    
    sessionStorage.setItem('editandoCartaoId', id);
    document.getElementById('formCartao').scrollIntoView({ behavior: 'smooth' });
}

// Pagar fatura
window.pagarFatura = async function(id) {
    // Buscar cartão
    const { data: cartao, error: errCartao } = await window.supabaseClient
        .from('cartoes')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error || !cartao || cartao.usado === 0) {
        alert('❌ Este cartão não tem fatura pendente!');
        return;
    }
    
    const valorFatura = cartao.usado;
    
    if (!confirm(`💰 Pagar fatura de ${formatarMoeda(valorFatura)} do cartão ${cartao.nome}?`)) return;
    
    // Buscar bancos
    const { data: bancos, error: errBancos } = await window.supabaseClient
        .from('bancos')
        .select('*');
    
    if (errBancos || bancos.length === 0) {
        alert('❌ Nenhum banco cadastrado!');
        return;
    }
    
    const nomesBancos = bancos.map(b => b.nome).join(', ');
    const bancoEscolhido = prompt(`Escolha o banco:\n${nomesBancos}\n\nDigite o nome:`);
    
    if (!bancoEscolhido) return;
    
    const bancoSelecionado = bancos.find(b => b.nome.toLowerCase().trim() === bancoEscolhido.toLowerCase().trim());
    
    if (!bancoSelecionado) {
        alert('❌ Banco não encontrado!');
        return;
    }
    
    if (bancoSelecionado.saldo < valorFatura) {
        if (!confirm(`⚠️ Saldo insuficiente! Continuar?`)) return;
    }
    
    // Pegar usuário logado
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    
    // 1. Atualizar saldo do banco
    await window.supabaseClient
        .from('bancos')
        .update({ saldo: bancoSelecionado.saldo - valorFatura })
        .eq('id', bancoSelecionado.id);
    
    // 2. Zerar usado do cartão
    await window.supabaseClient
        .from('cartoes')
        .update({ usado: 0 })
        .eq('id', id);
    
    // 3. Registrar despesa
    await window.supabaseClient
        .from('despesas')
        .insert([{
            id: Date.now(),
            tipo: 'individual',
            descricao: `Pagamento fatura ${cartao.nome}`,
            valor: valorFatura,
            data: new Date().toISOString().split('T')[0],
            categoria: 'fatura_cartao',
            pagamento: 'debito',
            banco: bancoSelecionado.nome,
            paga: true,
            user_id: user ? user.id : null
        }]);
    
    alert(`✅ Fatura de ${formatarMoeda(valorFatura)} paga!`);
    location.reload();
}