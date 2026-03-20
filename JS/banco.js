// ========== BANCOS ==========
console.log("🏦 Página de bancos carregada");

document.addEventListener('DOMContentLoaded', async function() {
    const formBanco = document.getElementById('formBanco');
    
    if (!formBanco) return;
    
    console.log("✅ Inicializando bancos com Supabase...");
    
    const listaBanco = document.getElementById('listaBanco');
    const saldoTotalElement = document.getElementById('saldoTotalBancos');
    const totalBancosElement = document.getElementById('totalBancos');

    // Função para atualizar a lista
    async function atualizarListaBancos() {
        if (!listaBanco) return;
        
        // Buscar bancos do Supabase
        const { data: bancos, error } = await supabase
            .from('bancos')
            .select('*')
            .order('nome');
        
        if (error) {
            console.error('Erro ao carregar bancos:', error);
            return;
        }
        
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
    }

    // Função para cadastrar banco
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
            if (!confirm('Saldo negativo? Deseja continuar?')) {
                return;
            }
        }
        
        const editandoId = sessionStorage.getItem('editandoBancoId');
        
        if (editandoId) {
            // EDIÇÃO
            const { error } = await supabase
                .from('bancos')
                .update({
                    nome: nome,
                    tipo: tipo,
                    saldo: saldo
                })
                .eq('id', parseInt(editandoId));
            
            if (error) {
                alert('❌ Erro ao atualizar banco: ' + error.message);
                return;
            }
            
            sessionStorage.removeItem('editandoBancoId');
            
            const btn = document.querySelector('#formBanco button[type="submit"]');
            btn.textContent = '💾 Salvar banco';
            
            console.log('Banco atualizado com sucesso!');
            
        } else {
            // CADASTRO NOVO
            const { error } = await supabase
                .from('bancos')
                .insert([{
                    id: Date.now(),
                    nome: nome,
                    tipo: tipo,
                    saldo: saldo
                }]);
            
            if (error) {
                alert('❌ Erro ao cadastrar banco: ' + error.message);
                return;
            }
            
            console.log('Banco cadastrado com sucesso!');
        }
        
        // Limpa formulário e atualiza lista
        document.getElementById('nomeBanco').value = '';
        document.getElementById('tipoConta').value = 'corrente';
        document.getElementById('saldoAtual').value = '';
        
        await atualizarListaBancos();
    }

    // Botão cancelar edição
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
    await atualizarListaBancos();
});

// ===== FUNÇÕES GLOBAIS =====

window.excluirBanco = async function(id) {
    if (confirm('Tem certeza que deseja excluir este banco?')) {
        const { error } = await supabase
            .from('bancos')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('❌ Erro ao excluir banco: ' + error.message);
            return;
        }
        
        location.reload();
    }
}

window.editarBanco = async function(id) {
    if (!confirm('Deseja editar este banco?')) return;
    
    console.log("Editando banco ID:", id);
    
    // Buscar dados atuais do banco
    const { data, error } = await supabase
        .from('bancos')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error || !data) {
        alert('❌ Banco não encontrado!');
        return;
    }
    
    const banco = data;
    
    // Preencher formulário
    document.getElementById('nomeBanco').value = banco.nome;
    document.getElementById('tipoConta').value = banco.tipo;
    document.getElementById('saldoAtual').value = banco.saldo;
    
    // Mudar texto do botão
    const btn = document.querySelector('#formBanco button[type="submit"]');
    btn.textContent = '✏️ Atualizar banco';
    
    // Guardar ID da edição
    sessionStorage.setItem('editandoBancoId', id);
    
    // Rolar até o formulário
    document.getElementById('formBanco').scrollIntoView({ behavior: 'smooth' });
}