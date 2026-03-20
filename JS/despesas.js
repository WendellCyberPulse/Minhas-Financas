// ========== DESPESAS ==========
console.log("📝 Página de despesas carregada");

document.addEventListener('DOMContentLoaded', async function() {
    const formFamilia = document.getElementById('formFamilia');
    const formIndividual = document.getElementById('formIndividual');
    
    if (!formFamilia && !formIndividual) return;
    
    console.log("✅ Inicializando despesas com Supabase...");
    
    // Verificar se o cliente Supabase está disponível
    if (!window.supabaseClient) {
        console.error("❌ Supabase client não disponível!");
        alert("Erro de conexão com o banco de dados.");
        return;
    }
    
    const listaDespesas = document.getElementById('listaDespesas');
    const totalDespesasElement = document.getElementById('totalDespesas');
    const totalFamiliaElement = document.getElementById('totalFamilia');
    const totalIndividualElement = document.getElementById('totalIndividual');
    const acertosContainer = document.getElementById('acertosContainer');

    // ===== FUNÇÕES DE APOIO =====
    async function carregarBancosNoSelect() {
        const selects = document.querySelectorAll('.select-banco');
        const { data: bancos, error } = await window.supabaseClient.from('bancos').select('*');
        
        if (error) return;
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Selecione um banco...</option>';
            
            if (bancos.length === 0) {
                select.innerHTML += '<option value="" disabled>❌ Nenhum banco cadastrado</option>';
            } else {
                bancos.forEach(banco => {
                    const option = document.createElement('option');
                    option.value = banco.nome;
                    option.textContent = `${banco.nome} (${formatarMoeda(banco.saldo)})`;
                    select.appendChild(option);
                });
            }
        });
    }

    async function carregarCartoesNoSelect() {
        const selects = document.querySelectorAll('.select-cartao');
        const { data: cartoes, error } = await window.supabaseClient.from('cartoes').select('*');
        
        if (error) return;
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Selecione um cartão...</option>';
            
            if (cartoes.length === 0) {
                select.innerHTML += '<option value="" disabled>❌ Nenhum cartão cadastrado</option>';
            } else {
                cartoes.forEach(cartao => {
                    const disponivel = (cartao.limite || 0) - (cartao.usado || 0);
                    const option = document.createElement('option');
                    option.value = cartao.nome;
                    option.textContent = `${cartao.nome} (disp: ${formatarMoeda(disponivel)})`;
                    select.appendChild(option);
                });
            }
        });
    }

    function carregarPessoasNoSelect() {
        const pessoas = ['João', 'Maria', 'Você'];
        const selects = document.querySelectorAll('.select-pagador');
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Quem pagou?</option>';
            pessoas.forEach(pessoa => {
                const option = document.createElement('option');
                option.value = pessoa;
                option.textContent = pessoa;
                select.appendChild(option);
            });
        });
    }

    // ===== FUNÇÕES DE ATUALIZAÇÃO DE SALDO =====
    async function atualizarSaldoBanco(nomeBanco, valor, operacao = 'remover') {
        const { data: bancos, error } = await window.supabaseClient.from('bancos').select('*');
        if (error) return;
        
        for (const banco of bancos) {
            if (banco.nome.toLowerCase().trim() === nomeBanco.toLowerCase().trim()) {
                const novoSaldo = operacao === 'adicionar' 
                    ? (banco.saldo || 0) + valor 
                    : (banco.saldo || 0) - valor;
                
                await window.supabaseClient
                    .from('bancos')
                    .update({ saldo: novoSaldo })
                    .eq('id', banco.id);
                break;
            }
        }
    }

    async function atualizarLimiteCartao(nomeCartao, valor, operacao = 'adicionar') {
        const { data: cartoes, error } = await window.supabaseClient.from('cartoes').select('*');
        if (error) return;
        
        for (const cartao of cartoes) {
            if (cartao.nome.toLowerCase().trim() === nomeCartao.toLowerCase().trim()) {
                const novoUsado = (cartao.usado || 0) + (operacao === 'adicionar' ? valor : -valor);
                await window.supabaseClient
                    .from('cartoes')
                    .update({ usado: novoUsado })
                    .eq('id', cartao.id);
                break;
            }
        }
    }

    // ===== FUNÇÕES DE ATUALIZAÇÃO DA TELA =====
    async function atualizarListaDespesas() {
        if (!listaDespesas) return;
        
        const { data: despesas, error } = await window.supabaseClient
            .from('despesas')
            .select('*')
            .order('data', { ascending: false });
        
        if (error) return;
        
        listaDespesas.innerHTML = '';
        
        if (despesas.length === 0) {
            listaDespesas.innerHTML = `
                <div class="lista-item">
                    <span colspan="6" style="text-align: center; color: #888;">
                        Nenhuma despesa cadastrada
                    </span>
                </div>
            `;
            return;
        }
        
        despesas.forEach(despesa => {
            const item = document.createElement('div');
            item.className = 'lista-item';
            
            const statusClass = despesa.paga ? 'status-pago' : 'status-pendente';
            const statusText = despesa.paga ? '✅ Pago' : '⏳ Pendente';
            const valorFormatado = formatarMoeda(despesa.valorTotal || despesa.valor);
            
            item.innerHTML = `
                <span>${formatarData(despesa.data)}</span>
                <span>${despesa.descricao}</span>
                <span>${despesa.tipo === 'familia' ? '👥 Família' : '👤 Individual'}</span>
                <span>${valorFormatado}</span>
                <span class="${statusClass}">${statusText}</span>
                <span>
                    <button class="btn-pagar" onclick="marcarComoPaga(${despesa.id})" ${despesa.paga ? 'disabled' : ''}>💰 Pagar</button>
                    <button class="btn-editar" onclick="editarDespesa(${despesa.id})">✏️</button>
                    <button class="btn-excluir" onclick="excluirDespesa(${despesa.id})">🗑️</button>
                </span>
            `;
            
            listaDespesas.appendChild(item);
        });
    }

    async function atualizarResumoDespesas() {
        const { data: despesas, error } = await window.supabaseClient.from('despesas').select('*');
        if (error) return;
        
        let totalGeral = 0, totalFamilia = 0, totalIndividual = 0;
        
        despesas.forEach(despesa => {
            const valor = despesa.valorTotal || despesa.valor || 0;
            totalGeral += valor;
            if (despesa.tipo === 'familia') totalFamilia += valor;
            else totalIndividual += valor;
        });
        
        if (totalDespesasElement) totalDespesasElement.textContent = formatarMoeda(totalGeral);
        if (totalFamiliaElement) totalFamiliaElement.textContent = formatarMoeda(totalFamilia);
        if (totalIndividualElement) totalIndividualElement.textContent = formatarMoeda(totalIndividual);
    }

    async function calcularAcertos() {
        if (!acertosContainer) return;
        
        const { data: despesas, error } = await window.supabaseClient.from('despesas').select('*');
        if (error) return;
        
        const pessoas = {};
        
        despesas.forEach(despesa => {
            if (despesa.tipo === 'familia' && despesa.paga) {
                const total = despesa.valorTotal;
                const divididoPor = despesa.divisao || 3;
                const valorPorPessoa = total / divididoPor;
                
                if (!pessoas[despesa.pagador]) {
                    pessoas[despesa.pagador] = { paga: 0, recebe: 0 };
                }
                
                for (let i = 0; i < divididoPor; i++) {
                    const pessoa = despesa.participantes?.[i];
                    if (pessoa && pessoa !== despesa.pagador) {
                        if (!pessoas[pessoa]) pessoas[pessoa] = { paga: 0, recebe: 0 };
                        pessoas[pessoa].paga += valorPorPessoa;
                    }
                }
                pessoas[despesa.pagador].recebe += valorPorPessoa * (divididoPor - 1);
            }
        });
        
        let html = '<div class="cards-container">';
        Object.keys(pessoas).forEach(pessoa => {
            const saldo = pessoas[pessoa].recebe - pessoas[pessoa].paga;
            const classe = saldo > 0 ? 'status-pago' : 'status-pendente';
            html += `
                <div class="card">
                    <h3>${pessoa}</h3>
                    <p class="${classe}">${formatarMoeda(Math.abs(saldo))}</p>
                    <small>${saldo > 0 ? '💰 A receber' : '💸 Deve pagar'}</small>
                </div>
            `;
        });
        html += '</div>';
        acertosContainer.innerHTML = html;
    }

    // ===== FUNÇÕES DE CRUD =====
    async function carregarDespesas() {
        await atualizarListaDespesas();
        await atualizarResumoDespesas();
        await calcularAcertos();
        await carregarBancosNoSelect();
        await carregarCartoesNoSelect();
        //carregarPessoasNoSelect();
    }

    // ===== CADASTRO DESPESA FAMÍLIA =====
    async function cadastrarDespesaFamilia(evento) {
        evento.preventDefault();
        
        const descricao = document.getElementById('descFamilia').value.trim();
        const valorTotal = parseFloat(document.getElementById('valorFamilia').value) || 0;
        const data = document.getElementById('dataFamilia').value;
        const divisao = parseInt(document.getElementById('divisaoFamilia').value) || 3;
        const pagador = document.getElementById('pagadorFamilia').value;
        const pagamento = document.getElementById('pagamentoFamilia').value;
        const banco = document.getElementById('bancoFamilia').value;
        const cartao = document.getElementById('cartaoFamilia').value;
        
        if (!descricao || valorTotal <= 0 || !data || !pagador || !pagamento) {
            alert('❌ Preencha todos os campos obrigatórios!');
            return;
        }
        
        if (pagamento === 'debito' && !banco) {
            alert('❌ Selecione o banco para débito!');
            return;
        }
        if (pagamento === 'credito' && !cartao) {
            alert('❌ Selecione o cartão de crédito!');
            return;
        }
        
        const editandoId = sessionStorage.getItem('editandoDespesaId');
        const despesaOriginal = JSON.parse(sessionStorage.getItem('despesaOriginal'));
        
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            alert('❌ Você precisa estar logado!');
            return;
        }
        
        const participantes = ['João', 'Maria', 'Você'].slice(0, divisao);
        
        if (editandoId) {
            // EDIÇÃO - Atualizar a despesa existente
            
            // Se a despesa original estava paga, precisamos reverter os efeitos
            if (despesaOriginal && despesaOriginal.paga) {
                // Reverter efeito anterior (remover do banco/cartão)
                if (despesaOriginal.pagamento === 'debito' && despesaOriginal.banco) {
                    await atualizarSaldoBanco(despesaOriginal.banco, despesaOriginal.valor, 'adicionar');
                }
                if (despesaOriginal.pagamento === 'credito' && despesaOriginal.cartao) {
                    await atualizarLimiteCartao(despesaOriginal.cartao, despesaOriginal.valor, 'remover');
                }
            }
            
            // Atualizar a despesa
            const { error } = await window.supabaseClient
                .from('despesas')
                .update({
                    descricao: descricao,
                    valorTotal: valorTotal,
                    data: data,
                    divisao: divisao,
                    participantes: participantes,
                    pagador: pagador,
                    pagamento: pagamento,
                    banco: pagamento === 'debito' ? banco : null,
                    cartao: pagamento === 'credito' ? cartao : null
                    // paga mantém o valor original
                })
                .eq('id', parseInt(editandoId));
            
            if (error) throw error;
            
            sessionStorage.removeItem('editandoDespesaId');
            sessionStorage.removeItem('editandoDespesaTipo');
            sessionStorage.removeItem('despesaOriginal');
            
            const btn = document.querySelector('#formFamilia button[type="submit"]');
            btn.textContent = '✅ Cadastrar despesa da família';
            
            console.log('Despesa familiar atualizada!');
            
        } else {
            // CADASTRO NOVO
            const { error } = await window.supabaseClient
                .from('despesas')
                .insert([{
                    id: Date.now(),
                    tipo: 'familia',
                    descricao: descricao,
                    valorTotal: valorTotal,
                    data: data,
                    divisao: divisao,
                    participantes: participantes,
                    pagador: pagador,
                    pagamento: pagamento,
                    banco: pagamento === 'debito' ? banco : null,
                    cartao: pagamento === 'credito' ? cartao : null,
                    paga: false,
                    user_id: user.id
                }]);
            
            if (error) throw error;
            
            console.log('Despesa familiar cadastrada!');
        }
        
        // Limpar formulário
        document.getElementById('descFamilia').value = '';
        document.getElementById('valorFamilia').value = '';
        document.getElementById('dataFamilia').value = '';
        document.getElementById('divisaoFamilia').value = '3';
        document.getElementById('pagadorFamilia').value = '';
        document.getElementById('pagamentoFamilia').value = 'dinheiro';
        document.getElementById('bancoFamilia').value = '';
        document.getElementById('cartaoFamilia').value = '';
        
        await carregarDespesas();
    }

    // ===== CADASTRO DESPESA INDIVIDUAL =====
    async function cadastrarDespesaIndividual(evento) {
        evento.preventDefault();
        
        const descricao = document.getElementById('descIndividual').value.trim();
        const valor = parseFloat(document.getElementById('valorIndividual').value) || 0;
        const data = document.getElementById('dataIndividual').value;
        const categoria = document.getElementById('categoriaIndividual').value;
        const pagamento = document.getElementById('pagamentoIndividual').value;
        const banco = document.getElementById('bancoIndividual').value;
        const cartao = document.getElementById('cartaoIndividual').value;
        
        if (!descricao || valor <= 0 || !data || !categoria || !pagamento) {
            alert('❌ Preencha todos os campos obrigatórios!');
            return;
        }
        
        if (pagamento === 'debito' && !banco) {
            alert('❌ Selecione o banco para débito!');
            return;
        }
        if (pagamento === 'credito' && !cartao) {
            alert('❌ Selecione o cartão de crédito!');
            return;
        }
        
        const editandoId = sessionStorage.getItem('editandoDespesaId');
        const despesaOriginal = JSON.parse(sessionStorage.getItem('despesaOriginal'));
        
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            alert('❌ Você precisa estar logado!');
            return;
        }
        
        if (editandoId) {
            // EDIÇÃO - Atualizar a despesa existente
            
            // Se a despesa original estava paga, precisamos reverter os efeitos
            if (despesaOriginal && despesaOriginal.paga) {
                if (despesaOriginal.pagamento === 'debito' && despesaOriginal.banco) {
                    await atualizarSaldoBanco(despesaOriginal.banco, despesaOriginal.valor, 'adicionar');
                }
                if (despesaOriginal.pagamento === 'credito' && despesaOriginal.cartao) {
                    await atualizarLimiteCartao(despesaOriginal.cartao, despesaOriginal.valor, 'remover');
                }
            }
            
            // Atualizar a despesa
            const { error } = await window.supabaseClient
                .from('despesas')
                .update({
                    descricao: descricao,
                    valor: valor,
                    data: data,
                    categoria: categoria,
                    pagamento: pagamento,
                    banco: pagamento === 'debito' ? banco : null,
                    cartao: pagamento === 'credito' ? cartao : null
                })
                .eq('id', parseInt(editandoId));
            
            if (error) throw error;
            
            sessionStorage.removeItem('editandoDespesaId');
            sessionStorage.removeItem('editandoDespesaTipo');
            sessionStorage.removeItem('despesaOriginal');
            
            const btn = document.querySelector('#formIndividual button[type="submit"]');
            btn.textContent = '✅ Cadastrar despesa individual';
            
            console.log('Despesa individual atualizada!');
            
        } else {
            // CADASTRO NOVO
            const { error } = await window.supabaseClient
                .from('despesas')
                .insert([{
                    id: Date.now(),
                    tipo: 'individual',
                    descricao: descricao,
                    valor: valor,
                    data: data,
                    categoria: categoria,
                    pagamento: pagamento,
                    banco: pagamento === 'debito' ? banco : null,
                    cartao: pagamento === 'credito' ? cartao : null,
                    paga: false,
                    user_id: user.id
                }]);
            
            if (error) throw error;
            
            console.log('Despesa individual cadastrada!');
        }
        
        // Limpar formulário
        document.getElementById('descIndividual').value = '';
        document.getElementById('valorIndividual').value = '';
        document.getElementById('dataIndividual').value = '';
        document.getElementById('categoriaIndividual').value = 'alimentacao';
        document.getElementById('pagamentoIndividual').value = 'dinheiro';
        document.getElementById('bancoIndividual').value = '';
        document.getElementById('cartaoIndividual').value = '';
        
        await carregarDespesas();
    }
    // ===== EVENTOS =====
    if (formFamilia) formFamilia.addEventListener('submit', cadastrarDespesaFamilia);
    if (formIndividual) formIndividual.addEventListener('submit', cadastrarDespesaIndividual);

    document.getElementById('pagamentoFamilia')?.addEventListener('change', function() {
        const divBanco = document.getElementById('containerBancoFamilia');
        const divCartao = document.getElementById('containerCartaoFamilia');
        divBanco.style.display = this.value === 'debito' ? 'block' : 'none';
        divCartao.style.display = this.value === 'credito' ? 'block' : 'none';
    });

    document.getElementById('pagamentoIndividual')?.addEventListener('change', function() {
        const divBanco = document.getElementById('containerBancoIndividual');
        const divCartao = document.getElementById('containerCartaoIndividual');
        divBanco.style.display = this.value === 'debito' ? 'block' : 'none';
        divCartao.style.display = this.value === 'credito' ? 'block' : 'none';
    });

    await carregarDespesas();
});

// ===== FUNÇÕES GLOBAIS =====

window.marcarComoPaga = async function(id) {
    if (!confirm('Confirmar pagamento desta despesa?')) return;
    
    const { data: despesa, error } = await window.supabaseClient
        .from('despesas')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error || !despesa || despesa.paga) return;
    
    const valor = despesa.valorTotal || despesa.valor || 0;
    
    if (despesa.pagamento === 'debito' && despesa.banco) {
        const { data: bancos } = await window.supabaseClient.from('bancos').select('*');
        const banco = bancos.find(b => b.nome.toLowerCase().trim() === despesa.banco.toLowerCase().trim());
        if (banco) {
            await window.supabaseClient.from('bancos').update({ saldo: banco.saldo - valor }).eq('id', banco.id);
        }
    }
    
    if (despesa.pagamento === 'credito' && despesa.cartao) {
        const { data: cartoes } = await window.supabaseClient.from('cartoes').select('*');
        const cartao = cartoes.find(c => c.nome.toLowerCase().trim() === despesa.cartao.toLowerCase().trim());
        if (cartao) {
            await window.supabaseClient.from('cartoes').update({ usado: (cartao.usado || 0) + valor }).eq('id', cartao.id);
        }
    }
    
    await window.supabaseClient.from('despesas').update({ paga: true }).eq('id', id);
    location.reload();
}

window.excluirDespesa = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    await window.supabaseClient.from('despesas').delete().eq('id', id);
    location.reload();
}

window.editarDespesa = async function(id) {
    if (!confirm('Deseja editar esta despesa?')) return;
    
    try {
        const { data: despesas, error } = await window.supabaseClient
            .from('despesas')
            .select('*')
            .eq('id', id);
        
        if (error) throw error;
        if (!despesas || despesas.length === 0) {
            alert('❌ Despesa não encontrada!');
            return;
        }
        
        const despesa = despesas[0];
        
        // GUARDAR OS DADOS ORIGINAIS PARA AJUSTAR SALDO/CARTÃO DEPOIS
        sessionStorage.setItem('editandoDespesaId', id);
        sessionStorage.setItem('editandoDespesaTipo', despesa.tipo);
        sessionStorage.setItem('despesaOriginal', JSON.stringify({
            valor: despesa.valorTotal || despesa.valor,
            banco: despesa.banco,
            cartao: despesa.cartao,
            pagamento: despesa.pagamento,
            paga: despesa.paga
        }));
        
        if (despesa.tipo === 'familia') {
            document.getElementById('descFamilia').value = despesa.descricao;
            document.getElementById('valorFamilia').value = despesa.valorTotal;
            document.getElementById('dataFamilia').value = despesa.data;
            document.getElementById('divisaoFamilia').value = despesa.divisao;
            document.getElementById('pagadorFamilia').value = despesa.pagador;
            document.getElementById('pagamentoFamilia').value = despesa.pagamento;
            
            if (despesa.pagamento === 'debito' && despesa.banco) {
                document.getElementById('containerBancoFamilia').style.display = 'block';
                document.getElementById('bancoFamilia').value = despesa.banco;
            } else if (despesa.pagamento === 'credito' && despesa.cartao) {
                document.getElementById('containerCartaoFamilia').style.display = 'block';
                document.getElementById('cartaoFamilia').value = despesa.cartao;
            }
            
            document.getElementById('formFamilia').scrollIntoView({ behavior: 'smooth' });
            
        } else {
            document.getElementById('descIndividual').value = despesa.descricao;
            document.getElementById('valorIndividual').value = despesa.valor;
            document.getElementById('dataIndividual').value = despesa.data;
            document.getElementById('categoriaIndividual').value = despesa.categoria;
            document.getElementById('pagamentoIndividual').value = despesa.pagamento;
            
            if (despesa.pagamento === 'debito' && despesa.banco) {
                document.getElementById('containerBancoIndividual').style.display = 'block';
                document.getElementById('bancoIndividual').value = despesa.banco;
            } else if (despesa.pagamento === 'credito' && despesa.cartao) {
                document.getElementById('containerCartaoIndividual').style.display = 'block';
                document.getElementById('cartaoIndividual').value = despesa.cartao;
            }
            
            document.getElementById('formIndividual').scrollIntoView({ behavior: 'smooth' });
        }
        
        // Mudar texto dos botões
        if (despesa.tipo === 'familia') {
            document.querySelector('#formFamilia button[type="submit"]').textContent = '✏️ Atualizar despesa familiar';
        } else {
            document.querySelector('#formIndividual button[type="submit"]').textContent = '✏️ Atualizar despesa individual';
        }
        
    } catch (error) {
        console.error("Erro ao editar despesa:", error);
        alert("Erro ao editar despesa: " + error.message);
    }
}

window.cancelarEdicaoDespesa = function(tipo) {
    if (confirm('Cancelar edição?')) {
        sessionStorage.removeItem('editandoDespesaId');
        sessionStorage.removeItem('editandoDespesaTipo');
        
        if (tipo === 'familia') {
            document.getElementById('formFamilia').reset();
            document.getElementById('containerBancoFamilia').style.display = 'none';
            document.getElementById('containerCartaoFamilia').style.display = 'none';
            document.querySelector('#formFamilia button[type="submit"]').textContent = '✅ Cadastrar despesa da família';
        } else {
            document.getElementById('formIndividual').reset();
            document.getElementById('containerBancoIndividual').style.display = 'none';
            document.getElementById('containerCartaoIndividual').style.display = 'none';
            document.querySelector('#formIndividual button[type="submit"]').textContent = '✅ Cadastrar despesa individual';
        }
    }
}
