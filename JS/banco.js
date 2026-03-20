// ========== BANCOS ==========
console.log("🏦 Página de bancos carregada");

document.addEventListener('DOMContentLoaded', async function() {
    const formBanco = document.getElementById('formBanco');
    
    if (!formBanco) return;
    
    console.log("✅ Inicializando bancos com Supabase...");
    
    const listaBanco = document.getElementById('listaBanco');
    const saldoTotalElement = document.getElementById('saldoTotalBancos');
    const totalBancosElement = document.getElementById('totalBancos');

    // Verificar se o cliente Supabase está disponível
    if (!window.supabaseClient) {
        console.error("❌ Supabase client não disponível!");
        alert("Erro de conexão com o banco de dados. Tente recarregar a página.");
        return;
    }

    // ===== FUNÇÃO PARA ATUALIZAR A LISTA =====
   async function atualizarListaBancos() {
        if (!listaBanco) return;
        
        try {
            // Buscar bancos do Supabase
            const { data: bancos, error } = await window.supabaseClient
                .from('bancos')
                .select('*')
                .order('nome');
            
            if (error) throw error;
            
            listaBanco.innerHTML = '';
            let saldoTotal = 0;
            
            if (bancos.length === 0) {
                listaBanco.innerHTML = `
                    <div class="lista-item">
                        <span colspan="4" style="text-align: center; color: #888;">
                            Nenhum banco cadastrado
                        </span>
                    </div>
                `;
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
                saldoTotalElement.textContent = formatarMoeda(saldoTotal);
            }
            
            if (totalBancosElement) {
                totalBancosElement.textContent = bancos.length;
            }
            
        } catch (error) {
            console.error("Erro ao carregar bancos:", error);
        }
    }

    // ===== FUNÇÃO PARA CADASTRAR/EDITAR BANCO =====
    async function cadastrarBanco(evento) {
        evento.preventDefault();
        
        const nome = document.getElementById('nomeBanco').value.trim();
        const tipo = document.getElementById('tipoConta').value;
        const saldo = parseFloat(document.getElementById('saldoAtual').value) || 0;
        
        if (!nome || !tipo) {
            alert('Preencha nome e tipo da conta!');
            return;
        }
        
        if (saldo < 0) {
            if (!confirm('Saldo negativo? Deseja continuar?')) return;
        }
        
        const editandoId = sessionStorage.getItem('editandoBancoId');
        
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            
            if (!user && !editandoId) {
                alert('❌ Você precisa estar logado!');
                return;
            }
            
            if (editandoId) {
                // EDIÇÃO - Atualizar o banco existente
                const { error } = await window.supabaseClient
                    .from('bancos')
                    .update({
                        nome: nome,
                        tipo: tipo,
                        saldo: saldo
                    })
                    .eq('id', parseInt(editandoId))
                    .eq('user_id', user.id); // Garantir que só atualiza se for do usuário
                
                if (error) throw error;
                
                sessionStorage.removeItem('editandoBancoId');
                
                const btn = document.querySelector('#formBanco button[type="submit"]');
                btn.textContent = '💾 Salvar banco';
                
                console.log('Banco atualizado com sucesso!');
                
            } else {
                // CADASTRO NOVO
                const { error } = await window.supabaseClient
                    .from('bancos')
                    .insert([{
                        id: Date.now(),
                        nome: nome,
                        tipo: tipo,
                        saldo: saldo,
                        user_id: user.id
                    }]);
                
                if (error) throw error;
                
                console.log('Banco cadastrado com sucesso!');
            }
            
            // Limpa formulário
            document.getElementById('nomeBanco').value = '';
            document.getElementById('tipoConta').value = 'corrente';
            document.getElementById('saldoAtual').value = '';
            
            // Recarrega a lista
            await atualizarListaBancos();
            
        } catch (error) {
            console.error("Erro ao salvar banco:", error);
            alert("Erro ao salvar banco: " + error.message);
        }
    }

    // ===== CANCELAR EDIÇÃO =====
    window.cancelarEdicao = function() {
        if (confirm('Cancelar edição?')) {
            sessionStorage.removeItem('editandoBancoId');
            document.getElementById('formBanco').reset();
            document.getElementById('tipoConta').value = 'corrente';
            const btn = document.querySelector('#formBanco button[type="submit"]');
            btn.textContent = '💾 Salvar banco';
        }
    }

    // ===== EVENTOS =====
    formBanco.addEventListener('submit', cadastrarBanco);
    await atualizarListaBancos();
});

// ===== FUNÇÕES GLOBAIS =====

// Excluir banco
window.excluirBanco = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este banco?')) return;
    
    try {
        const { error } = await window.supabaseClient
            .from('bancos')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        alert('✅ Banco excluído com sucesso!');
        location.reload();
    } catch (error) {
        console.error("Erro ao excluir banco:", error);
        alert("Erro ao excluir banco: " + error.message);
    }
}

// Editar banco
// Editar banco (CORRIGIDA)
window.editarBanco = async function(id) {
    if (!confirm('Deseja editar este banco?')) return;
    
    try {
        // Buscar dados atuais do banco
        const { data: bancos, error } = await window.supabaseClient
            .from('bancos')
            .select('*')
            .eq('id', id);
        
        if (error) throw error;
        if (!bancos || bancos.length === 0) {
            alert('❌ Banco não encontrado!');
            return;
        }
        
        const banco = bancos[0];
        
        // Preencher formulário
        document.getElementById('nomeBanco').value = banco.nome;
        document.getElementById('tipoConta').value = banco.tipo;
        document.getElementById('saldoAtual').value = banco.saldo;
        
        // NÃO REMOVER O BANCO ANTIGO! Vamos atualizar diretamente
        // Apenas guardar o ID para saber que é edição
        sessionStorage.setItem('editandoBancoId', id);
        
        // Mudar texto do botão
        const btn = document.querySelector('#formBanco button[type="submit"]');
        btn.textContent = '✏️ Atualizar banco';
        
        // Rolar até o formulário
        document.getElementById('formBanco').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error("Erro ao editar banco:", error);
        alert("Erro ao editar banco: " + error.message);
    }
}