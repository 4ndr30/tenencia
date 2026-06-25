// ==========================================
// JS/ADOPTANTES.JS - Gestión integral de adoptantes
// ==========================================

const PAGE_SIZE = 25;
let listadoOffset = 0;
let listadoTotal = 0;
let listadoFiltro = '';

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();

    const perfil = await checkAuth();
    if (!perfil) return;

    initAppShell('dashboard', perfil);

    document.getElementById('btnSearch').addEventListener('click', ejecutarBusquedaDetallada);
    document.getElementById('txtSearchDni').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ejecutarBusquedaDetallada();
    });
    document.getElementById('txtSearchDni').addEventListener('input', debounce(filtrarListado, 350));

    document.getElementById('btnPrevPage').addEventListener('click', () => cambiarPagina(-1));
    document.getElementById('btnNextPage').addEventListener('click', () => cambiarPagina(1));
    document.getElementById('btnRefreshList').addEventListener('click', () => cargarListadoAdoptantes());

    document.querySelectorAll('input[name="tipoReporte"]').forEach(radio => {
        radio.addEventListener('change', actualizarSeccionReporte);
    });
    actualizarSeccionReporte();

    document.getElementById('formUnificado').addEventListener('submit', guardarRegistroCompleto);

    await cargarListadoAdoptantes();
});

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

function esc(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function actualizarSeccionReporte() {
    const tipo = document.querySelector('input[name="tipoReporte"]:checked')?.value || 'ninguno';
    const secInf = document.getElementById('seccionInfraccion');
    const secBuen = document.getElementById('seccionBuenAdoptante');
    if (secInf) secInf.style.display = tipo === 'infraccion' ? 'block' : 'none';
    if (secBuen) secBuen.style.display = tipo === 'buen_adoptante' ? 'block' : 'none';
}

function badgesAdoptante(a) {
    let html = '';
    if (a.buen_adoptante) {
        html += '<span class="badge badge-success"><i data-lucide="award"></i> Buen adoptante</span>';
    }
    if (a.terreno_cercado) {
        html += '<span class="badge badge-info"><i data-lucide="map-pin"></i> Terreno cercado</span>';
    }
    if (a.es_propietario) {
        html += '<span class="badge badge-info"><i data-lucide="home"></i> Propietario</span>';
    } else if (a.condicion_vivienda) {
        const labels = { inquilino: 'Inquilino', familiar: 'Vive con familiar', otro: 'Otra condición' };
        html += `<span class="badge badge-muted">${esc(labels[a.condicion_vivienda] || a.condicion_vivienda)}</span>`;
    }
    return html;
}

function infoVivienda(a) {
    const partes = [];
    if (a.email) partes.push(`Email: <strong>${esc(a.email)}</strong>`);
    if (a.terreno_cercado) partes.push('Terreno cercado: <strong>Sí</strong>');
    if (a.es_propietario) partes.push('Vivienda: <strong>Propietario</strong>');
    else if (a.condicion_vivienda) partes.push(`Vivienda: <strong>${esc(a.condicion_vivienda)}</strong>`);
    if (a.observaciones) partes.push(`Observaciones: <em>${esc(a.observaciones)}</em>`);
    return partes.length ? `<p class="profile-extra">${partes.join(' · ')}</p>` : '';
}

function renderHistorial(historial) {
    if (!historial || historial.length === 0 || historial[0]?.incidente_id === null) {
        return '<p class="text-muted">No tiene registros de comportamiento a la fecha.</p>';
    }

    return historial.map(inc => {
        let colorGravedad = 'var(--text-main)';
        let icono = 'alert-triangle';
        if (inc.gravedad === 'grave') { colorGravedad = 'var(--danger)'; }
        else if (inc.gravedad === 'moderado') { colorGravedad = 'var(--accent)'; }
        else if (inc.gravedad === 'positivo') { colorGravedad = 'var(--success)'; icono = 'award'; }

        let archivosHTML = '';
        if (inc.archivos?.length) {
            archivosHTML = inc.archivos.map(arc =>
                `<a href="${esc(arc.url)}" target="_blank" class="file-badge">
                    <i data-lucide="file-text"></i> ${esc(arc.nombre)}
                </a>`
            ).join('');
        }

        const etiqueta = inc.gravedad === 'positivo' ? 'RECONOCIMIENTO' : inc.gravedad.toUpperCase();

        return `
            <div class="timeline-item ${inc.gravedad === 'positivo' ? 'timeline-positive' : ''}">
                <div class="timeline-meta">${new Date(inc.fecha).toLocaleDateString('es-AR')} · Reportado por <b>${esc(inc.cargado_por || 'Sistema')}</b></div>
                <div class="timeline-title" style="color:${colorGravedad}">
                    <i data-lucide="${icono}"></i> ${esc(inc.titulo)} <small>(${etiqueta})</small>
                </div>
                <div class="timeline-desc">${esc(inc.descripcion)}</div>
                <div>${archivosHTML}</div>
            </div>`;
    }).join('');
}

function renderAdoptanteCard(adoptante) {
    const modificadoInfo = adoptante.modificado_por
        ? `<br>• Última edición por: <b>${esc(adoptante.modificado_por)}</b> el ${new Date(adoptante.ultima_modificacion).toLocaleString('es-AR')}`
        : '';

    const tarjeta = document.createElement('div');
    tarjeta.className = 'adoptante-profile-card';
    tarjeta.dataset.id = adoptante.id;

    tarjeta.innerHTML = `
        <div class="profile-header">
            <div>
                <h2>${esc(adoptante.apellido || '')}${adoptante.apellido && adoptante.nombre ? ', ' : ''}${esc(adoptante.nombre || 'Perfil sin nombre')}</h2>
                <div class="badge-row">${badgesAdoptante(adoptante)}</div>
                <p class="profile-meta">
                    DNI: <strong>${esc(adoptante.dni || 'No cargado')}</strong> ·
                    Tel: <strong>${esc(adoptante.telefono || 'No cargado')}</strong><br>
                    Dirección: <strong>${esc(adoptante.direccion || 'No cargada')}</strong>
                </p>
                ${infoVivienda(adoptante)}
            </div>
            <div class="profile-actions">
                <button class="btn btn-secondary btn-sm btn-edit-profile" data-id="${esc(adoptante.id)}">
                    <i data-lucide="edit"></i> Editar
                </button>
                <button class="btn btn-success btn-sm btn-add-positive" data-id="${esc(adoptante.id)}">
                    <i data-lucide="award"></i> Buen adoptante
                </button>
                <button class="btn btn-danger btn-sm btn-add-incident" data-id="${esc(adoptante.id)}">
                    <i data-lucide="alert-triangle"></i> Alerta
                </button>
            </div>
        </div>

        <div id="editBlock-${esc(adoptante.id)}" class="inline-block edit-block" style="display:none">
            <h5>Modificar ficha del adoptante</h5>
            <div class="edit-grid">
                <input type="text" id="editNom-${esc(adoptante.id)}" placeholder="Nombre">
                <input type="text" id="editApe-${esc(adoptante.id)}" placeholder="Apellido">
                <input type="text" id="editDni-${esc(adoptante.id)}" placeholder="DNI">
                <input type="text" id="editTel-${esc(adoptante.id)}" placeholder="Teléfono">
                <input type="email" id="editEmail-${esc(adoptante.id)}" placeholder="Email" style="grid-column: span 2;">
                <input type="text" id="editDir-${esc(adoptante.id)}" placeholder="Dirección" style="grid-column: span 2;">
                <label class="checkbox-label"><input type="checkbox" id="editTerreno-${esc(adoptante.id)}"> Terreno cercado</label>
                <label class="checkbox-label"><input type="checkbox" id="editPropietario-${esc(adoptante.id)}"> Es propietario</label>
                <select id="editCondicion-${esc(adoptante.id)}">
                    <option value="">Condición de vivienda</option>
                    <option value="propietario">Propietario</option>
                    <option value="inquilino">Inquilino</option>
                    <option value="familiar">Vive con familiar</option>
                    <option value="otro">Otro</option>
                </select>
                <label class="checkbox-label"><input type="checkbox" id="editBuenAdoptante-${esc(adoptante.id)}"> Marcar como buen adoptante</label>
                <textarea id="editObs-${esc(adoptante.id)}" rows="2" placeholder="Observaciones" style="grid-column: span 2;"></textarea>
            </div>
            <div class="inline-actions">
                <button class="btn btn-primary btn-sm btn-save-edit" data-id="${esc(adoptante.id)}">Confirmar cambios</button>
                <button class="btn btn-secondary btn-sm btn-cancel-edit" data-id="${esc(adoptante.id)}">Cancelar</button>
            </div>
        </div>

        <div id="incidenteBlock-${esc(adoptante.id)}" class="inline-block incident-block" style="display:none">
            <h5>Reportar infracción o alerta</h5>
            <div class="inline-form">
                <input type="text" id="newIncTitulo-${esc(adoptante.id)}" placeholder="Título del incidente">
                <select id="newIncGravedad-${esc(adoptante.id)}">
                    <option value="leve">Leve</option>
                    <option value="moderado">Moderado</option>
                    <option value="grave" selected>Grave</option>
                </select>
                <textarea id="newIncDesc-${esc(adoptante.id)}" rows="3" placeholder="Detalles..."></textarea>
                <input type="file" id="newIncFiles-${esc(adoptante.id)}" multiple>
            </div>
            <div class="inline-actions">
                <button class="btn btn-danger btn-sm btn-save-incident" data-id="${esc(adoptante.id)}">Cargar alerta</button>
                <button class="btn btn-secondary btn-sm btn-cancel-incident" data-id="${esc(adoptante.id)}">Cancelar</button>
            </div>
        </div>

        <div id="positivoBlock-${esc(adoptante.id)}" class="inline-block positive-block" style="display:none">
            <h5>Registrar reconocimiento de buen adoptante</h5>
            <div class="inline-form">
                <input type="text" id="newPosTitulo-${esc(adoptante.id)}" placeholder="Ej: Adopción responsable verificada">
                <textarea id="newPosDesc-${esc(adoptante.id)}" rows="3" placeholder="Detalle del reconocimiento..."></textarea>
                <input type="file" id="newPosFiles-${esc(adoptante.id)}" multiple>
            </div>
            <div class="inline-actions">
                <button class="btn btn-success btn-sm btn-save-positive" data-id="${esc(adoptante.id)}">Registrar reconocimiento</button>
                <button class="btn btn-secondary btn-sm btn-cancel-positive" data-id="${esc(adoptante.id)}">Cancelar</button>
            </div>
        </div>

        <hr class="divider">
        <h4 class="section-title"><i data-lucide="history"></i> Historial compartido</h4>
        <div class="timeline">${renderHistorial(adoptante.historial)}</div>
        <div class="audit-footer">
            • Registrado por: <b>${esc(adoptante.creado_por || 'Desconocido')}</b>${modificadoInfo}
        </div>`;

    bindCardEvents(tarjeta, adoptante);
    return tarjeta;
}

function bindCardEvents(tarjeta, adoptante) {
    const id = adoptante.id;

    tarjeta.querySelector('.btn-edit-profile')?.addEventListener('click', () => {
        document.getElementById(`editBlock-${id}`).style.display = 'block';
        document.getElementById(`incidenteBlock-${id}`).style.display = 'none';
        document.getElementById(`positivoBlock-${id}`).style.display = 'none';
        document.getElementById(`editNom-${id}`).value = adoptante.nombre || '';
        document.getElementById(`editApe-${id}`).value = adoptante.apellido || '';
        document.getElementById(`editDni-${id}`).value = adoptante.dni || '';
        document.getElementById(`editTel-${id}`).value = adoptante.telefono || '';
        document.getElementById(`editEmail-${id}`).value = adoptante.email || '';
        document.getElementById(`editDir-${id}`).value = adoptante.direccion || '';
        document.getElementById(`editTerreno-${id}`).checked = !!adoptante.terreno_cercado;
        document.getElementById(`editPropietario-${id}`).checked = !!adoptante.es_propietario;
        document.getElementById(`editCondicion-${id}`).value = adoptante.condicion_vivienda || '';
        document.getElementById(`editBuenAdoptante-${id}`).checked = !!adoptante.buen_adoptante;
        document.getElementById(`editObs-${id}`).value = adoptante.observaciones || '';
    });

    tarjeta.querySelector('.btn-add-incident')?.addEventListener('click', () => {
        document.getElementById(`incidenteBlock-${id}`).style.display = 'block';
        document.getElementById(`editBlock-${id}`).style.display = 'none';
        document.getElementById(`positivoBlock-${id}`).style.display = 'none';
    });

    tarjeta.querySelector('.btn-add-positive')?.addEventListener('click', () => {
        document.getElementById(`positivoBlock-${id}`).style.display = 'block';
        document.getElementById(`editBlock-${id}`).style.display = 'none';
        document.getElementById(`incidenteBlock-${id}`).style.display = 'none';
    });

    tarjeta.querySelector('.btn-save-edit')?.addEventListener('click', () => guardarEdicion(id));
    tarjeta.querySelector('.btn-cancel-edit')?.addEventListener('click', () => {
        document.getElementById(`editBlock-${id}`).style.display = 'none';
    });
    tarjeta.querySelector('.btn-save-incident')?.addEventListener('click', () => guardarNuevoIncidente(id));
    tarjeta.querySelector('.btn-cancel-incident')?.addEventListener('click', () => {
        document.getElementById(`incidenteBlock-${id}`).style.display = 'none';
    });
    tarjeta.querySelector('.btn-save-positive')?.addEventListener('click', () => guardarReconocimiento(id));
    tarjeta.querySelector('.btn-cancel-positive')?.addEventListener('click', () => {
        document.getElementById(`positivoBlock-${id}`).style.display = 'none';
    });
}

function mostrarResultados(data, mensajeVacio) {
    const resultArea = document.getElementById('resultArea');
    resultArea.style.display = 'block';

    if (!data || data.length === 0) {
        resultArea.innerHTML = `
            <div class="adoptante-profile-card card-empty">
                <h3><i data-lucide="search"></i> Sin coincidencias</h3>
                <p>${esc(mensajeVacio)}</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    resultArea.innerHTML = '';
    data.forEach(adoptante => resultArea.appendChild(renderAdoptanteCard(adoptante)));
    if (window.lucide) lucide.createIcons();
}

async function ejecutarBusquedaDetallada() {
    const termino = document.getElementById('txtSearchDni').value.trim();
    const resultArea = document.getElementById('resultArea');

    if (!termino) {
        resultArea.style.display = 'none';
        listadoFiltro = '';
        listadoOffset = 0;
        await cargarListadoAdoptantes();
        return;
    }

    resultArea.style.display = 'block';
    resultArea.innerHTML = '<p class="text-muted">Buscando coincidencias...</p>';

    const { data, error } = await window.redSupabase.rpc('buscar_adoptante_universal', { search_term: termino });

    if (error) {
        resultArea.innerHTML = `<div class="adoptante-profile-card card-error">Error: ${esc(error.message)}</div>`;
        return;
    }

    mostrarResultados(data, `No se encontraron antecedentes vinculados a "${termino}".`);
}

async function filtrarListado() {
    listadoFiltro = document.getElementById('txtSearchDni').value.trim();
    listadoOffset = 0;
    await cargarListadoAdoptantes();
}

async function cargarListadoAdoptantes() {
    const tbody = document.getElementById('listadoBody');
    const lblTotal = document.getElementById('lblTotalAdoptantes');
    const lblPagina = document.getElementById('lblPagina');

    tbody.innerHTML = '<tr><td colspan="7" class="text-muted">Cargando adoptantes...</td></tr>';

    let data = null;
    let error = null;

    const rpcResult = await window.redSupabase.rpc('listar_adoptantes', {
        p_limit: PAGE_SIZE,
        p_offset: listadoOffset,
        p_filtro: listadoFiltro || null
    });
    data = rpcResult.data;
    error = rpcResult.error;

    if (error) {
        const fallback = await cargarListadoFallback();
        if (fallback) {
            data = fallback;
            error = null;
        }
    }

    if (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-error">Error al cargar listado: ${esc(error.message)}. Ejecutá la migración en supabase/migration_adoptantes_v2.sql</td></tr>`;
        return;
    }

    listadoTotal = data?.total || 0;
    const adoptantes = data?.adoptantes || [];

    lblTotal.textContent = `${listadoTotal} adoptante${listadoTotal !== 1 ? 's' : ''} registrado${listadoTotal !== 1 ? 's' : ''}`;
    const paginaActual = Math.floor(listadoOffset / PAGE_SIZE) + 1;
    const totalPaginas = Math.max(1, Math.ceil(listadoTotal / PAGE_SIZE));
    lblPagina.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    document.getElementById('btnPrevPage').disabled = listadoOffset === 0;
    document.getElementById('btnNextPage').disabled = listadoOffset + PAGE_SIZE >= listadoTotal;

    if (adoptantes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-muted">No hay adoptantes registrados todavía.</td></tr>';
        return;
    }

    tbody.innerHTML = adoptantes.map(a => {
        const nombre = `${esc(a.apellido || '')}${a.apellido && a.nombre ? ', ' : ''}${esc(a.nombre || '—')}`;
        const badges = badgesAdoptante(a);
        const alertas = a.total_alertas > 0
            ? `<span class="badge badge-danger">${a.total_alertas} alerta${a.total_alertas > 1 ? 's' : ''}</span>`
            : '<span class="badge badge-muted">Sin alertas</span>';

        return `
            <tr>
                <td><strong>${nombre}</strong><div class="badge-row compact">${badges}</div></td>
                <td>${esc(a.dni || '—')}</td>
                <td>${esc(a.telefono || '—')}</td>
                <td class="td-direccion">${esc(a.direccion || '—')}</td>
                <td>${alertas}</td>
                <td>${a.total_reconocimientos > 0 ? `<span class="badge badge-success">${a.total_reconocimientos}</span>` : '—'}</td>
                <td>
                    <button class="btn btn-primary btn-sm btn-ver-ficha" data-id="${esc(a.id)}" data-term="${esc(a.dni || a.apellido || a.nombre || '')}">
                        Ver ficha
                    </button>
                </td>
            </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-ver-ficha').forEach(btn => {
        btn.addEventListener('click', async () => {
            const term = btn.dataset.term;
            if (term) {
                document.getElementById('txtSearchDni').value = term;
                await ejecutarBusquedaDetallada();
                document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    if (window.lucide) lucide.createIcons();
}

function cambiarPagina(delta) {
    listadoOffset = Math.max(0, listadoOffset + delta * PAGE_SIZE);
    cargarListadoAdoptantes();
}

async function cargarListadoFallback() {
    const camposCompletos = 'id, nombre, apellido, dni, telefono, direccion, email, terreno_cercado, es_propietario, condicion_vivienda, buen_adoptante, observaciones, created_at';
    const camposBasicos = 'id, nombre, apellido, dni, telefono, direccion, created_at';

    for (const campos of [camposCompletos, camposBasicos]) {
        let query = window.redSupabase
            .from('adoptantes')
            .select(campos, { count: 'exact' })
            .order('apellido', { ascending: true, nullsFirst: false })
            .range(listadoOffset, listadoOffset + PAGE_SIZE - 1);

        if (listadoFiltro) {
            const term = listadoFiltro.replace(/,/g, '').trim();
            query = query.or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,dni.ilike.%${term}%,telefono.ilike.%${term}%,direccion.ilike.%${term}%`);
        }

        const { data: rows, count, error } = await query;
        if (error) continue;

        const adoptantes = (rows || []).map(a => ({
            ...a,
            total_alertas: 0,
            total_reconocimientos: 0
        }));

        return { total: count || 0, adoptantes };
    }

    return null;
}

function leerDatosAdoptanteForm() {
    return {
        nombre: document.getElementById('adNombre').value.trim() || null,
        apellido: document.getElementById('adApellido').value.trim() || null,
        dni: document.getElementById('adDni').value.trim() || null,
        telefono: document.getElementById('adTel').value.trim() || null,
        direccion: document.getElementById('adDireccion').value.trim() || null,
        email: document.getElementById('adEmail').value.trim() || null,
        terreno_cercado: document.getElementById('adTerrenoCercado').checked,
        es_propietario: document.getElementById('adEsPropietario').checked,
        condicion_vivienda: document.getElementById('adCondicionVivienda').value || null,
        buen_adoptante: document.getElementById('adBuenAdoptante').checked,
        observaciones: document.getElementById('adObservaciones').value.trim() || null
    };
}

async function guardarRegistroCompleto(e) {
    e.preventDefault();

    const datos = leerDatosAdoptanteForm();
    const tipoReporte = document.querySelector('input[name="tipoReporte"]:checked')?.value || 'ninguno';

    if (!datos.nombre && !datos.apellido && !datos.dni && !datos.telefono && !datos.direccion) {
        alert('Ingresá al menos un dato de identificación para registrar.');
        return;
    }

    const { data: userAuth } = await window.redSupabase.auth.getUser();

    const { data: adoptante, error: errAd } = await window.redSupabase
        .from('adoptantes')
        .insert([{ ...datos, creado_por: userAuth.user.id }])
        .select().single();

    if (errAd) {
        alert('Error al registrar: ' + errAd.message);
        return;
    }

    if (tipoReporte === 'infraccion') {
        const incTitulo = document.getElementById('incTitulo').value.trim();
        const incGravedad = document.getElementById('incGravedad').value;
        const incDesc = document.getElementById('incDesc').value.trim();
        const archivosInput = document.getElementById('incArchivo').files;

        if (incTitulo) {
            const { data: incidente, error: errInc } = await window.redSupabase
                .from('historial_incidentes')
                .insert([{ adoptante_id: adoptante.id, creado_por: userAuth.user.id, titulo: incTitulo, descripcion: incDesc, gravedad: incGravedad }])
                .select().single();

            if (!errInc && archivosInput.length > 0) {
                await subirArchivosEvidencia(incidente.id, archivosInput);
            }
        }
    } else if (tipoReporte === 'buen_adoptante') {
        const posTitulo = document.getElementById('posTitulo').value.trim();
        const posDesc = document.getElementById('posDesc').value.trim();
        const archivosPos = document.getElementById('posArchivo').files;

        if (posTitulo) {
            const { data: incidente, error: errPos } = await window.redSupabase
                .from('historial_incidentes')
                .insert([{ adoptante_id: adoptante.id, creado_por: userAuth.user.id, titulo: posTitulo, descripcion: posDesc, gravedad: 'positivo' }])
                .select().single();

            if (!errPos && archivosPos.length > 0) {
                await subirArchivosEvidencia(incidente.id, archivosPos);
            }
        }
    }

    alert('Ficha guardada con éxito.');
    document.getElementById('formUnificado').reset();
    actualizarSeccionReporte();
    listadoOffset = 0;
    await cargarListadoAdoptantes();

    if (datos.dni) {
        document.getElementById('txtSearchDni').value = datos.dni;
        await ejecutarBusquedaDetallada();
    }
}

async function guardarEdicion(id) {
    const payload = {
        nombre: document.getElementById(`editNom-${id}`).value.trim() || null,
        apellido: document.getElementById(`editApe-${id}`).value.trim() || null,
        dni: document.getElementById(`editDni-${id}`).value.trim() || null,
        telefono: document.getElementById(`editTel-${id}`).value.trim() || null,
        email: document.getElementById(`editEmail-${id}`).value.trim() || null,
        direccion: document.getElementById(`editDir-${id}`).value.trim() || null,
        terreno_cercado: document.getElementById(`editTerreno-${id}`).checked,
        es_propietario: document.getElementById(`editPropietario-${id}`).checked,
        condicion_vivienda: document.getElementById(`editCondicion-${id}`).value || null,
        buen_adoptante: document.getElementById(`editBuenAdoptante-${id}`).checked,
        observaciones: document.getElementById(`editObs-${id}`).value.trim() || null
    };

    const { data: userAuth } = await window.redSupabase.auth.getUser();

    const { error } = await window.redSupabase
        .from('adoptantes')
        .update({ ...payload, modificado_por: userAuth.user.id, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) alert('Error: ' + error.message);
    else {
        alert('Perfil actualizado.');
        await cargarListadoAdoptantes();
        await ejecutarBusquedaDetallada();
    }
}

async function guardarNuevoIncidente(adoptanteId) {
    const titulo = document.getElementById(`newIncTitulo-${adoptanteId}`).value.trim();
    const gravedad = document.getElementById(`newIncGravedad-${adoptanteId}`).value;
    const descripcion = document.getElementById(`newIncDesc-${adoptanteId}`).value.trim();
    const archivosInput = document.getElementById(`newIncFiles-${adoptanteId}`).files;

    if (!titulo) {
        alert('El incidente necesita al menos un título.');
        return;
    }

    const { data: userAuth } = await window.redSupabase.auth.getUser();

    const { data: incidente, error: errInc } = await window.redSupabase
        .from('historial_incidentes')
        .insert([{ adoptante_id: adoptanteId, creado_por: userAuth.user.id, titulo, descripcion, gravedad }])
        .select().single();

    if (errInc) {
        alert('Error al añadir incidente: ' + errInc.message);
        return;
    }

    if (archivosInput.length > 0) {
        await subirArchivosEvidencia(incidente.id, archivosInput);
    }

    alert('Alerta registrada en el historial.');
    await cargarListadoAdoptantes();
    await ejecutarBusquedaDetallada();
}

async function guardarReconocimiento(adoptanteId) {
    const titulo = document.getElementById(`newPosTitulo-${adoptanteId}`).value.trim();
    const descripcion = document.getElementById(`newPosDesc-${adoptanteId}`).value.trim();
    const archivosInput = document.getElementById(`newPosFiles-${adoptanteId}`).files;

    if (!titulo) {
        alert('El reconocimiento necesita al menos un título.');
        return;
    }

    const { data: userAuth } = await window.redSupabase.auth.getUser();

    const { data: incidente, error: errPos } = await window.redSupabase
        .from('historial_incidentes')
        .insert([{ adoptante_id: adoptanteId, creado_por: userAuth.user.id, titulo, descripcion, gravedad: 'positivo' }])
        .select().single();

    if (errPos) {
        alert('Error al registrar reconocimiento: ' + errPos.message);
        return;
    }

    await window.redSupabase
        .from('adoptantes')
        .update({ buen_adoptante: true, modificado_por: userAuth.user.id, updated_at: new Date().toISOString() })
        .eq('id', adoptanteId);

    if (archivosInput.length > 0) {
        await subirArchivosEvidencia(incidente.id, archivosInput);
    }

    alert('Reconocimiento de buen adoptante registrado.');
    await cargarListadoAdoptantes();
    await ejecutarBusquedaDetallada();
}

async function subirArchivosEvidencia(incidenteId, archivos) {
    for (let i = 0; i < archivos.length; i++) {
        const file = archivos[i];
        const fileExt = file.name.split('.').pop();
        const filePath = `${incidenteId}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await window.redSupabase.storage
            .from('adjuntos_incidentes').upload(filePath, file);

        if (!uploadError) {
            const { data: urlData } = window.redSupabase.storage
                .from('adjuntos_incidentes').getPublicUrl(filePath);

            await window.redSupabase.from('archivos').insert([{
                incidente_id: incidenteId,
                nombre_archivo: file.name,
                url_storage: urlData.publicUrl,
                tipo_archivo: file.type
            }]);
        }
    }
}
