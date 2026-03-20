// ========== RECEITAS ==========
console.log("📥 Página de receitas carregada");

document.addEventListener('DOMContentLoaded', function() {
    const formReceita = document.getElementById('formReceita');
    
    if (!formReceita) return; // Sai se não for página de receitas
    
    console.log("✅ Inicializando receitas...");
    
    let receitas = [];
    const listaReceitas = document.getElementById('listaReceitas');
    const totalReceitasElement = document.getElementById('totalReceitas');
    const receitasMesElement = document.getElementById('receitasMes');
    const mediaReceitasElement = document.getElementById('mediaReceitas');
    const receitasFixasContainer = document.getElementById('receitasFixas');
    const totalReceitasCount = document.getElementById('totalReceitasCount'); // NOVO

    // ===== FUNÇÕES DE APOIO =====
    function carregarBancosNoSelect() {
        const selectBanco = document.getElementById('bancoReceita');
        if (!selectBanco) return;
        
        const bancos = JSON.parse(localStorage.getItem('bancos')) || [];

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

    function atualizarSaldoBanco(nomeBanco, valor, operacao = 'adicionar') {
        let bancos = JSON.parse(localStorage.getItem('bancos')) || [];
        let bancoEncontrado = false;
        
        bancos = bancos.map(banco => {
            if (banco.nome.toLowerCase().trim() === nomeBanco.toLowerCase().trim()) {
                bancoEncontrado = true;
                if (operacao === 'adicionar') {
                    banco.saldo = (banco.saldo || 0) + valor;
                    console.log(`✅ +${formatarMoeda(valor)} em ${banco.nome}`);
                } else {
                    banco.saldo = (banco.saldo || 0) - valor;
                    console.log(`✅ -${formatarMoeda(valor)} em ${banco.nome}`);
                }
            }
            return banco;
        });
        
        if (!bancoEncontrado) {
            console.warn(`⚠️ Banco "${nomeBanco}" não encontrado`);
        }
        
        localStorage.setItem('bancos', JSON.stringify(bancos));
    }

    // ===== FUNÇÕES DE ATUALIZAÇÃO DA TELA =====
    function atualizarListaReceitas() {
        if (!listaReceitas) return;
        
        // Ordenar por data (mais recente primeiro)
        const receitasOrdenadas = [...receitas].sort((a, b) => new Date(b.data) - new Date(a.data));
        
        listaReceitas.innerHTML = '';
        
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
        
        // Calcular média dos últimos 3 meses
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
        
        // Atualizar elementos na tela
        if (totalReceitasElement) {
            totalReceitasElement.textContent = formatarMoeda(totalGeral);
        }
        if (receitasMesElement) {
            receitasMesElement.textContent = formatarMoeda(totalMes);
        }
        if (mediaReceitasElement) {
            mediaReceitasElement.textContent = formatarMoeda(media);
        }
        if (totalReceitasCount) {
            totalReceitasCount.textContent = receitas.length;
        }
    }

    function mostrarReceitasFixas() {
        if (!receitasFixasContainer) return;
        
        const fixas = receitas.filter(r => r.fixa === true);
        receitasFixasContainer.innerHTML = '';
        
        if (fixas.length === 0) {
            receitasFixasContainer.innerHTML = '<div class="card"><p>📭 Nenhuma receita fixa cadastrada</p></div>';
            return;
        }
        
        // Agrupar por descrição (para não repetir)
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
    function carregarReceitas() {
        const dadosSalvos = localStorage.getItem('receitas');
        if (dadosSalvos) {
            receitas = JSON.parse(dadosSalvos);
            atualizarListaReceitas();
            atualizarResumoReceitas();
            mostrarReceitasFixas();
        }
        carregarBancosNoSelect();
    }

    function salvarReceitas() {
        localStorage.setItem('receitas', JSON.stringify(receitas));
    }

    function cadastrarReceita(evento) {
        evento.preventDefault();
        
        const descricao = document.getElementById('descReceita').value.trim();
        const valor = parseFloat(document.getElementById('valorReceita').value) || 0;
        const data = document.getElementById('dataReceita').value;
        const categoria = document.getElementById('categoriaReceita').value;
        const banco = document.getElementById('bancoReceita').value;
        const fixa = document.getElementById('receitaFixa').checked;
        
        // Validações
        if (!descricao) {
            alert('❌ Digite uma descrição!');
            return;
        }
        if (valor <= 0) {
            alert('❌ Valor deve ser maior que zero!');
            return;
        }
        if (!data) {
            alert('❌ Selecione a data!');
            return;
        }
        if (!categoria) {
            alert('❌ Selecione uma categoria!');
            return;
        }
        if (!banco) {
            alert('❌ Selecione um banco!');
            return;
        }
        
        // Verifica se está editando
        const editandoId = sessionStorage.getItem('editandoReceitaId');
        
        // Pega receitas existentes
        let receitasExistentes = JSON.parse(localStorage.getItem('receitas')) || [];
        
        if (editandoId) {
            // É EDIÇÃO
            console.log("Finalizando edição da receita");
            
            const receitaAtualizada = {
                id: Date.now(),
                descricao: descricao,
                valor: valor,
                data: data,
                categoria: categoria,
                banco: banco,
                fixa: fixa
            };
            
            receitasExistentes.push(receitaAtualizada);
            localStorage.setItem('receitas', JSON.stringify(receitasExistentes));
            
            // Atualizar saldo do banco (já removemos a antiga na editarReceita)
            atualizarSaldoBanco(banco, valor, 'adicionar');
            
            // Limpa sessão
            sessionStorage.removeItem('editandoReceitaId');
            
            // Volta texto do botão
            const btn = document.querySelector('#formReceita button[type="submit"]');
            btn.textContent = '✅ Cadastrar receita';
            
            console.log('Receita atualizada:', receitaAtualizada);
            
        } else {
            // É CADASTRO NOVO
            const novaReceita = {
                id: Date.now(),
                descricao: descricao,
                valor: valor,
                data: data,
                categoria: categoria,
                banco: banco,
                fixa: fixa
            };
            
            receitasExistentes.push(novaReceita);
            localStorage.setItem('receitas', JSON.stringify(receitasExistentes));
            
            // Atualizar saldo do banco
            atualizarSaldoBanco(banco, valor, 'adicionar');
            
            console.log('Receita cadastrada:', novaReceita);
        }
        
        // Recarrega dados
        receitas = JSON.parse(localStorage.getItem('receitas')) || [];
        atualizarListaReceitas();
        atualizarResumoReceitas();
        mostrarReceitasFixas();
        carregarBancosNoSelect(); // Atualiza saldos no select
        
        // Limpa formulário
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
    
    // Evento para nova categoria
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

    // Carregar dados iniciais
    carregarReceitas();
});

// ===== FUNÇÕES GLOBAIS =====

// Excluir receita
window.excluirReceita = function(id) {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    
    let receitas = JSON.parse(localStorage.getItem('receitas')) || [];
    const receita = receitas.find(r => r.id === id);
    
    if (receita) {
        // Remover valor do banco
        let bancos = JSON.parse(localStorage.getItem('bancos')) || [];
        bancos = bancos.map(b => {
            if (b.nome === receita.banco) {
                b.saldo = (b.saldo || 0) - receita.valor;
            }
            return b;
        });
        localStorage.setItem('bancos', JSON.stringify(bancos));
    }
    
    receitas = receitas.filter(r => r.id !== id);
    localStorage.setItem('receitas', JSON.stringify(receitas));
    
    location.reload();
}

// Editar receita
window.editarReceita = function(id) {
    if (!confirm('Deseja editar esta receita?')) return;
    
    let receitas = JSON.parse(localStorage.getItem('receitas')) || [];
    const receita = receitas.find(r => r.id === id);
    
    if (receita) {
        // Preenche formulário
        document.getElementById('descReceita').value = receita.descricao;
        document.getElementById('valorReceita').value = receita.valor;
        document.getElementById('dataReceita').value = receita.data;
        document.getElementById('categoriaReceita').value = receita.categoria;
        document.getElementById('bancoReceita').value = receita.banco;
        document.getElementById('receitaFixa').checked = receita.fixa;
        
        // Remove valor antigo do banco
        let bancos = JSON.parse(localStorage.getItem('bancos')) || [];
        bancos = bancos.map(b => {
            if (b.nome === receita.banco) {
                b.saldo = (b.saldo || 0) - receita.valor;
            }
            return b;
        });
        localStorage.setItem('bancos', JSON.stringify(bancos));
        
        // Remove receita antiga
        const novasReceitas = receitas.filter(r => r.id !== id);
        localStorage.setItem('receitas', JSON.stringify(novasReceitas));
        
        // Muda texto do botão
        const btn = document.querySelector('#formReceita button[type="submit"]');
        btn.textContent = '✏️ Atualizar receita';
        
        sessionStorage.setItem('editandoReceitaId', id);
        document.getElementById('formReceita').scrollIntoView({ behavior: 'smooth' });
    }
}

// Aplicar filtros
window.aplicarFiltros = function() {
    const mes = document.getElementById('filtroMes').value;
    const ano = document.getElementById('filtroAno').value;
    const categoria = document.getElementById('filtroCategoria').value;
    
    const receitas = JSON.parse(localStorage.getItem('receitas')) || [];
    
    const receitasFiltradas = receitas.filter(receita => {
        const data = new Date(receita.data);
        const filtroMes = mes === 'todos' || (data.getMonth() + 1) == mes;
        const filtroAno = data.getFullYear() == ano;
        const filtroCategoria = categoria === 'todas' || receita.categoria === categoria;
        
        return filtroMes && filtroAno && filtroCategoria;
    });
    
    // Atualizar lista com resultados
    const listaReceitas = document.getElementById('listaReceitas');
    if (!listaReceitas) return;
    
    listaReceitas.innerHTML = '';
    
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

    // No final de aplicarFiltros, depois do forEach
    if (receitasFiltradas.length === 0) {
        listaReceitas.innerHTML = `
            <div class="lista-item">
                <span colspan="6" style="text-align: center; color: #888;">
                    Nenhuma receita encontrada com os filtros selecionados
                </span>
            </div>
        `;
    }
}

function atualizarAnosFiltro() {
    const selectAno = document.getElementById('filtroAno');
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