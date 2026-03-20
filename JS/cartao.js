// ========== CARTÕES ==========
console.log("💳 Página de cartões carregada");

document.addEventListener('DOMContentLoaded', async function() {
    const formCartao = document.getElementById('formCartao');
    
    if (!formCartao) return;
    
    console.log("✅ Inicializando cartões com Supabase...");
    
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

    async function atualizarListaCartoes() {
        if (!listaCartoes) return;
        
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
        
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            alert('❌ Você precisa estar logado!');
            return;
        }
        
        const editandoId = sessionStorage.getItem('editandoCartaoId');
        
        if (editandoId) {
            const { error } = await window.supabaseClient
                .from('cartoes')
                .update({ nome, bandeira, limite, vencimento })
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
            const { error } = await window.supabaseClient
                .from('cartoes')
                .insert([{
                    id: Date.now(),
                    nome, bandeira, limite, vencimento,
                    usado: 0,
                    user_id: user.id
                }]);
            
            if (error) {
                alert('❌ Erro ao cadastrar cartão: ' + error.message);
                return;
            }
            console.log('Cartão cadastrado!');
        }
        
        document.getElementById('nomeCartao').value = '';
        document.getElementById('bandeira').value = 'visa';
        document.getElementById('limiteTotal').value = '';
        document.getElementById('vencimento').value = '5';
        
        await atualizarListaCartoes();
    }

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

window.editarCartao = async function(id) {
    if (!confirm('Deseja editar este cartão?')) return;
    
    try {
        const { data: cartoes, error } = await window.supabaseClient
            .from('cartoes')
            .select('*')
            .eq('id', id);
        
        if (error) throw error;
        if (!cartoes || cartoes.length === 0) {
            alert('❌ Cartão não encontrado!');
            return;
        }
        
        const cartao = cartoes[0];
        
        document.getElementById('nomeCartao').value = cartao.nome;
        document.getElementById('bandeira').value = cartao.bandeira;
        document.getElementById('limiteTotal').value = cartao.limite;
        document.getElementById('vencimento').value = cartao.vencimento;
        
        // GUARDAR O ID - NÃO REMOVER O CARTÃO!
        sessionStorage.setItem('editandoCartaoId', id);
        
        const btn = document.querySelector('#formCartao button[type="submit"]');
        btn.textContent = '✏️ Atualizar cartão';
        
        document.getElementById('formCartao').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error("Erro ao editar cartão:", error);
        alert("Erro ao editar cartão: " + error.message);
    }
}

// ===== FUNÇÃO DE PAGAMENTO DE FATURA COM OPÇÕES =====
window.pagarFatura = async function(id) {
    // Buscar cartão
    const { data: cartao, error: errCartao } = await window.supabaseClient
        .from('cartoes')
        .select('*')
        .eq('id', id)
        .single();
    
    if (errCartao || !cartao || cartao.usado === 0) {
        alert('❌ Este cartão não tem fatura pendente!');
        return;
    }
    
    const valorTotalFatura = cartao.usado;
    
    // Buscar bancos
    const { data: bancos } = await window.supabaseClient.from('bancos').select('*');
    
    if (!bancos || bancos.length === 0) {
        alert('❌ Nenhum banco cadastrado!');
        return;
    }
    
    // Criar modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    modal.innerHTML = `
        <div style="background: #2d2d2d; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
            <h3 style="color: #fff; margin-top: 0;">💳 Pagar Fatura</h3>
            <p><strong>Cartão:</strong> ${cartao.nome}</p>
            <p><strong>Valor total da fatura:</strong> ${formatarMoeda(valorTotalFatura)}</p>
            
            <div style="margin: 20px 0;">
                <label style="color: #fff;">Opção de pagamento:</label><br>
                <select id="opcaoPagamento" style="width: 100%; padding: 10px; margin: 10px 0; background: #3d3d3d; color: #fff; border: 1px solid #4a4a4a; border-radius: 5px;">
                    <option value="total">💰 Pagar valor total (${formatarMoeda(valorTotalFatura)})</option>
                    <option value="parcial">📊 Pagar valor parcial</option>
                    <option value="especifico">✏️ Digitar valor específico</option>
                </select>
            </div>
            
            <div id="campoValorParcial" style="display: none; margin: 20px 0;">
                <label style="color: #fff;">Selecione o valor:</label><br>
                <select id="valorParcial" style="width: 100%; padding: 10px; background: #3d3d3d; color: #fff; border: 1px solid #4a4a4a; border-radius: 5px;">
                    <option value="50">R$ 50,00</option>
                    <option value="100">R$ 100,00</option>
                    <option value="200">R$ 200,00</option>
                    <option value="300">R$ 300,00</option>
                    <option value="400">R$ 400,00</option>
                    <option value="500">R$ 500,00</option>
                    <option value="1000">R$ 1.000,00</option>
                </select>
            </div>
            
            <div id="campoValorEspecifico" style="display: none; margin: 20px 0;">
                <label style="color: #fff;">Digite o valor (R$):</label><br>
                <input type="number" id="valorEspecifico" step="0.01" placeholder="0,00" style="width: 100%; padding: 10px; background: #3d3d3d; color: #fff; border: 1px solid #4a4a4a; border-radius: 5px;">
            </div>
            
            <div style="margin: 20px 0;">
                <label style="color: #fff;">Selecionar banco para débito:</label><br>
                <select id="bancoPagamento" style="width: 100%; padding: 10px; margin-top: 10px; background: #3d3d3d; color: #fff; border: 1px solid #4a4a4a; border-radius: 5px;">
                    ${bancos.map(b => `<option value="${b.nome}">${b.nome} (${formatarMoeda(b.saldo)})</option>`).join('')}
                </select>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="btnConfirmarPagamento" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">✅ Confirmar</button>
                <button id="btnCancelarPagamento" style="flex: 1; padding: 10px; background: #af4c4c; color: white; border: none; border-radius: 5px; cursor: pointer;">❌ Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const opcaoSelect = modal.querySelector('#opcaoPagamento');
    const campoParcial = modal.querySelector('#campoValorParcial');
    const campoEspecifico = modal.querySelector('#campoValorEspecifico');
    const selectBanco = modal.querySelector('#bancoPagamento');
    
    opcaoSelect.addEventListener('change', function() {
        campoParcial.style.display = this.value === 'parcial' ? 'block' : 'none';
        campoEspecifico.style.display = this.value === 'especifico' ? 'block' : 'none';
    });
    
    modal.querySelector('#btnConfirmarPagamento').onclick = async () => {
        const opcao = opcaoSelect.value;
        let valorPagar = 0;
        
        if (opcao === 'total') {
            valorPagar = valorTotalFatura;
        } else if (opcao === 'parcial') {
            valorPagar = parseFloat(modal.querySelector('#valorParcial').value);
        } else {
            valorPagar = parseFloat(modal.querySelector('#valorEspecifico').value) || 0;
        }
        
        if (valorPagar <= 0) {
            alert('❌ Valor inválido!');
            return;
        }
        
        if (valorPagar > valorTotalFatura) {
            alert(`⚠️ Valor excede a fatura! Máximo: ${formatarMoeda(valorTotalFatura)}`);
            return;
        }
        
        const bancoEscolhido = selectBanco.value;
        if (!bancoEscolhido) return;
        
        const bancoSelecionado = bancos.find(b => b.nome === bancoEscolhido);
        
        if (bancoSelecionado.saldo < valorPagar) {
            if (!confirm(`⚠️ Saldo insuficiente! Banco tem ${formatarMoeda(bancoSelecionado.saldo)}. Continuar?`)) {
                return;
            }
        }
        
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        
        // 1. Atualizar saldo do banco
        await window.supabaseClient
            .from('bancos')
            .update({ saldo: bancoSelecionado.saldo - valorPagar })
            .eq('id', bancoSelecionado.id);
        
        // 2. Atualizar usado do cartão
        const novoUsado = cartao.usado - valorPagar;
        await window.supabaseClient
            .from('cartoes')
            .update({ usado: novoUsado })
            .eq('id', id);
        
        // 3. Registrar despesa do pagamento
        await window.supabaseClient
            .from('despesas')
            .insert([{
                id: Date.now(),
                tipo: 'individual',
                descricao: `Pagamento fatura ${cartao.nome}${opcao !== 'total' ? ` (parcial R$ ${valorPagar.toFixed(2)})` : ''}`,
                valor: valorPagar,
                data: new Date().toISOString().split('T')[0],
                categoria: 'fatura_cartao',
                pagamento: 'debito',
                banco: bancoSelecionado.nome,
                paga: true,
                user_id: user ? user.id : null
            }]);
        
        modal.remove();
        
        if (novoUsado > 0) {
            alert(`✅ Pagamento de ${formatarMoeda(valorPagar)} realizado!\n💰 Fatura restante: ${formatarMoeda(novoUsado)}`);
        } else {
            alert(`✅ Fatura de ${formatarMoeda(valorPagar)} paga com sucesso!`);
        }
        
        location.reload();
    };
    
    modal.querySelector('#btnCancelarPagamento').onclick = () => {
        modal.remove();
    };
}