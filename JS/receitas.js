// ========== RECEITAS ==========
console.log("📥 Página de receitas carregada");

document.addEventListener('DOMContentLoaded', async function() {
    const formReceita = document.getElementById('formReceita');
    
    if (!formReceita) return;
    
    console.log("✅ Inicializando receitas com Supabase...");
    
    // Verificar se o cliente Supabase está disponível
    if (!window.supabaseClient) {
        console.error("❌ Supabase client não disponível!");
        alert("Erro de conexão com o banco de dados.");
        return;
    }
    
    const listaReceitas = document.getElementById('listaReceitas');
    const totalReceitasElement = document.getElementById('totalReceitas');
    const receitasMesElement = document.getElementById('receitasMes');
    const mediaReceitasElement = document.getElementById('mediaReceitas');
    const receitasFixasContainer = document.getElementById('receitasFixas');
    const totalReceitasCount = document.getElementById('totalReceitasCount');

    let receitas = [];

    // ===== FUNÇÕES DE APOIO =====
    async function carregarBancosNoSelect() {
        const selectBanco = document.getElementById('bancoReceita');
        if (!selectBanco) return;
        
        const { data: bancos, error } = await window.supabaseClient.from('bancos').select('*');
        if (error) return;
        
        bancos.sort((a, b) => a.nome.localeCompare(b.nome));
        
        selectBanco.innerHTML = '<option value="">Selecione um banco...</option>';
        
        if (bancos.length === 0) {
            selectBanco.innerHTML += '<option value="" disabled>❌ Nenhum banco cadastrado</option>';
        } else {
            bancos.forEach(banco => {
                const option = document.createElement('option');
                option.value = banco.nome;
                option.textContent = `${banco.nome} (${formatarMoeda(banco.saldo)})`;
                selectBanco.appendChild(option);
            });
        }
    }

    async function atualizarSaldoBanco(nomeBanco, valor, operacao = 'adicionar') {
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
                console.log(`${operacao === 'adicionar' ? '✅ +' : '❌ -'}${formatarMoeda(valor)} em ${banco.nome}`);
                break;
            }
        }
    }

    // ===== FUNÇÕES DE ATUALIZAÇÃO DA TELA =====
    async function atualizarListaReceitas() {
        if (!listaReceitas) return;
        
        const receitasOrdenadas = [...receitas].sort((a, b) => new Date(b.data) - new Date(a.data));
        
        listaReceitas.innerHTML = '';
        
        if (receitasOrdenadas.length === 0) {
            listaReceitas.innerHTML = `
                <div class="lista-item">
                    <span colspan="6" style="text-align: center; color: #888;">
                        Nenhuma receita cadastrada
                    </span>
                </div>
            `;
            return;
        }
        
        receitasOrdenadas.forEach(receita => {
            const item = document.createElement('div');
            item.className = 'lista-item';
            
            item.innerHTML = `
                <span>${formatarData(receita.data)}</span>
                <span>${receita.descricao} ${receita.fixa ? '📌' : ''}</span>
                <span>${receita.categoria}</span>
                <span>${formatarMoeda(receita.valor)}</span>
                <span>${receita.banco}</span>
                <span>
                    <button class="btn-editar" onclick="editarReceita(${receita.id})">✏️</button>
                    <button class="btn-excluir" onclick="excluirReceita(${receita.id})">🗑️</button>
                </span>
            `;
            
            listaReceitas.appendChild(item);
        });
    }

    function atualizarResumoReceitas() {
        let totalGeral = 0;
        let totalMes = 0;
        
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        receitas.forEach(receita => {
            totalGeral += receita.valor;
            
            const dataReceita = new Date(receita.data);
            if (dataReceita.getMonth() === mesAtual && dataReceita.getFullYear() === anoAtual) {
                totalMes += receita.valor;
            }
        });
        
        const tresMesesAtras = new Date();
        tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
        
        let somaUltimos3 = 0;
        let contador = 0;
        
        receitas.forEach(receita => {
            const dataReceita = new Date(receita.data);
            if (dataReceita >= tresMesesAtras) {
                somaUltimos3 += receita.valor;
                contador++;
            }
        });
        
        const media = contador > 0 ? somaUltimos3 / contador : 0;
        
        if (totalReceitasElement) totalReceitasElement.textContent = formatarMoeda(totalGeral);
        if (receitasMesElement) receitasMesElement.textContent = formatarMoeda(totalMes);
        if (mediaReceitasElement) mediaReceitasElement.textContent = formatarMoeda(media);
        if (totalReceitasCount) totalReceitasCount.textContent = receitas.length;
    }

    function mostrarReceitasFixas() {
        if (!receitasFixasContainer) return;
        
        const fixas = receitas.filter(r => r.fixa === true);
        receitasFixasContainer.innerHTML = '';
        
        if (fixas.length === 0) {
            receitasFixasContainer.innerHTML = '<div class="card"><p>📭 Nenhuma receita fixa cadastrada</p></div>';
            return;
        }
        
        const fixasAgrupadas = {};
        fixas.forEach(fixa => {
            if (!fixasAgrupadas[fixa.descricao]) {
                fixasAgrupadas[fixa.descricao] = {
                    descricao: fixa.descricao,
                    valor: fixa.valor,
                    categoria: fixa.categoria,
                    banco: fixa.banco,
                    count: 1
                };
            } else {
                fixasAgrupadas[fixa.descricao].count++;
            }
        });
        
        Object.values(fixasAgrupadas).forEach(fixa => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h4>${fixa.descricao} ${fixa.count > 1 ? `(x${fixa.count})` : ''}</h4>
                <p>${formatarMoeda(fixa.valor)}</p>
                <small>${fixa.categoria} • ${fixa.banco}</small><br>
                <small>📅 Todo mês</small>
            `;
            receitasFixasContainer.appendChild(card);
        });
    }

    // ===== FUNÇÕES DE CRUD =====
    async function carregarReceitas() {
        const { data, error } = await window.supabaseClient
            .from('receitas')
            .select('*')
            .order('data', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar receitas:', error);
            return;
        }
        
        receitas = data || [];
        await atualizarListaReceitas();
        atualizarResumoReceitas();
        mostrarReceitasFixas();
        await carregarBancosNoSelect();
        
        // Atualizar anos do filtro
        atualizarAnosFiltro();
    }

    async function cadastrarReceita(evento) {
        evento.preventDefault();
        
        const descricao = document.getElementById('descReceita').value.trim();
        const valor = parseFloat(document.getElementById('valorReceita').value) || 0;
        const data = document.getElementById('dataReceita').value;
        const categoria = document.getElementById('categoriaReceita').value;
        const banco = document.getElementById('bancoReceita').value;
        const fixa = document.getElementById('receitaFixa').checked;
        
        if (!descricao) { alert('❌ Digite uma descrição!'); return; }
        if (valor <= 0) { alert('❌ Valor deve ser maior que zero!'); return; }
        if (!data) { alert('❌ Selecione a data!'); return; }
        if (!categoria) { alert('❌ Selecione uma categoria!'); return; }
        if (!banco) { alert('❌ Selecione um banco!'); return; }
        
        // Pegar usuário logado
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            alert('❌ Você precisa estar logado!');
            return;
        }
        
        const editandoId = sessionStorage.getItem('editandoReceitaId');
        
        if (editandoId) {
            // EDIÇÃO
            const { error } = await window.supabaseClient
                .from('receitas')
                .update({
                    descricao: descricao,
                    valor: valor,
                    data: data,
                    categoria: categoria,
                    banco: banco,
                    fixa: fixa
                })
                .eq('id', parseInt(editandoId));
            
            if (error) {
                alert('❌ Erro ao atualizar receita: ' + error.message);
                return;
            }
            
            await atualizarSaldoBanco(banco, valor, 'adicionar');
            sessionStorage.removeItem('editandoReceitaId');
            
            const btn = document.querySelector('#formReceita button[type="submit"]');
            btn.textContent = '✅ Cadastrar receita';
            
        } else {
            // CADASTRO NOVO
            const { error } = await window.supabaseClient
                .from('receitas')
                .insert([{
                    id: Date.now(),
                    descricao: descricao,
                    valor: valor,
                    data: data,
                    categoria: categoria,
                    banco: banco,
                    fixa: fixa,
                    user_id: user.id
                }]);
            
            if (error) {
                alert('❌ Erro ao cadastrar receita: ' + error.message);
                return;
            }
            
            await atualizarSaldoBanco(banco, valor, 'adicionar');
        }
        
        await carregarReceitas();
        
        document.getElementById('descReceita').value = '';
        document.getElementById('valorReceita').value = '';
        document.getElementById('dataReceita').value = '';
        document.getElementById('categoriaReceita').value = 'salario';
        document.getElementById('bancoReceita').value = '';
        document.getElementById('receitaFixa').checked = false;
    }

    // ===== CANCELAR EDIÇÃO =====
    window.cancelarEdicaoReceita = function() {
        if (confirm('Cancelar edição?')) {
            sessionStorage.removeItem('editandoReceitaId');
            document.getElementById('formReceita').reset();
            document.getElementById('categoriaReceita').value = 'salario';
            document.getElementById('bancoReceita').value = '';
            const btn = document.querySelector('#formReceita button[type="submit"]');
            btn.textContent = '✅ Cadastrar receita';
        }
    }

    // ===== EVENTOS =====
    formReceita.addEventListener('submit', cadastrarReceita);
    
    document.getElementById('categoriaReceita').addEventListener('change', function() {
        if (this.value === 'nova') {
            const novaCategoria = prompt('Digite o nome da nova categoria:');
            if (novaCategoria) {
                const option = document.createElement('option');
                option.value = novaCategoria.toLowerCase().replace(/\s+/g, '_');
                option.textContent = `✨ ${novaCategoria}`;
                this.insertBefore(option, this.lastElementChild);
                this.value = option.value;
            }
        }
    });

    await carregarReceitas();
});

// ===== FUNÇÕES GLOBAIS =====

// Excluir receita
window.excluirReceita = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    
    const { data: receita, error: findError } = await window.supabaseClient
        .from('receitas')
        .select('*')
        .eq('id', id)
        .single();
    
    if (receita) {
        await atualizarSaldoBancoSupabase(receita.banco, receita.valor, 'remover');
    }
    
    const { error } = await window.supabaseClient
        .from('receitas')
        .delete()
        .eq('id', id);
    
    if (error) {
        alert('❌ Erro ao excluir receita: ' + error.message);
        return;
    }
    
    location.reload();
}

// Função auxiliar para atualizar saldo (usada por exclusão)
async function atualizarSaldoBancoSupabase(nomeBanco, valor, operacao) {
    const { data: bancos } = await window.supabaseClient.from('bancos').select('*');
    for (const banco of bancos) {
        if (banco.nome.toLowerCase().trim() === nomeBanco.toLowerCase().trim()) {
            const novoSaldo = operacao === 'adicionar' 
                ? (banco.saldo || 0) + valor 
                : (banco.saldo || 0) - valor;
            await window.supabaseClient.from('bancos').update({ saldo: novoSaldo }).eq('id', banco.id);
            break;
        }
    }
}

// Editar receita
window.editarReceita = async function(id) {
    if (!confirm('Deseja editar esta receita?')) return;
    
    try {
        const { data: receitas, error } = await window.supabaseClient
            .from('receitas')
            .select('*')
            .eq('id', id);
        
        if (error) throw error;
        if (!receitas || receitas.length === 0) {
            alert('❌ Receita não encontrada!');
            return;
        }
        
        const receita = receitas[0];
        
        document.getElementById('descReceita').value = receita.descricao;
        document.getElementById('valorReceita').value = receita.valor;
        document.getElementById('dataReceita').value = receita.data;
        document.getElementById('categoriaReceita').value = receita.categoria;
        document.getElementById('bancoReceita').value = receita.banco;
        document.getElementById('receitaFixa').checked = receita.fixa;
        
        // GUARDAR O ID - NÃO REMOVER A RECEITA!
        sessionStorage.setItem('editandoReceitaId', id);
        
        const btn = document.querySelector('#formReceita button[type="submit"]');
        btn.textContent = '✏️ Atualizar receita';
        
        document.getElementById('formReceita').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error("Erro ao editar receita:", error);
        alert("Erro ao editar receita: " + error.message);
    }
}

// Aplicar filtros
window.aplicarFiltros = async function() {
    const mes = document.getElementById('filtroMes').value;
    const ano = document.getElementById('filtroAno').value;
    const categoria = document.getElementById('filtroCategoria').value;
    
    const { data: receitas, error } = await window.supabaseClient
        .from('receitas')
        .select('*');
    
    if (error) return;
    
    const receitasFiltradas = receitas.filter(receita => {
        const data = new Date(receita.data);
        const filtroMes = mes === 'todos' || (data.getMonth() + 1) == mes;
        const filtroAno = data.getFullYear() == ano;
        const filtroCategoria = categoria === 'todas' || receita.categoria === categoria;
        return filtroMes && filtroAno && filtroCategoria;
    });
    
    const listaReceitas = document.getElementById('listaReceitas');
    if (!listaReceitas) return;
    
    listaReceitas.innerHTML = '';
    
    if (receitasFiltradas.length === 0) {
        listaReceitas.innerHTML = `
            <div class="lista-item">
                <span colspan="6" style="text-align: center; color: #888;">
                    Nenhuma receita encontrada com os filtros selecionados
                </span>
            </div>
        `;
        return;
    }
    
    receitasFiltradas.forEach(receita => {
        const item = document.createElement('div');
        item.className = 'lista-item';
        item.innerHTML = `
            <span>${formatarData(receita.data)}</span>
            <span>${receita.descricao}</span>
            <span>${receita.categoria}</span>
            <span>${formatarMoeda(receita.valor)}</span>
            <span>${receita.banco}</span>
            <span>
                <button class="btn-editar" onclick="editarReceita(${receita.id})">✏️</button>
                <button class="btn-excluir" onclick="excluirReceita(${receita.id})">🗑️</button>
            </span>
        `;
        listaReceitas.appendChild(item);
    });
}

// Atualizar anos do filtro
function atualizarAnosFiltro() {
    const selectAno = document.getElementById('filtroAno');
    if (!selectAno) return;
    
    const anos = new Set();
    receitas.forEach(r => {
        const ano = new Date(r.data).getFullYear();
        anos.add(ano);
    });
    
    if (anos.size > 0) {
        selectAno.innerHTML = '';
        [...anos].sort().forEach(ano => {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = `📆 ${ano}`;
            selectAno.appendChild(option);
        });
    }
}