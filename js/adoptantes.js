// ==========================================
// JS/ADOPTANTES.JS - VERSIÓN ULTRA INTEGRAL
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    
    // 1. Verificar sesión
    const perfil = await checkAuth();
    if (!perfil) return;

    document.getElementById('lblUsuario').textContent = perfil.nombre_completo;
    document.getElementById('lblOrganizacion').textContent = perfil.organizacion || "Rescatista Independiente";

    if (perfil.rol === 'admin' || perfil.rol === 'moderador') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'block';
    }

    // 2. Eventos básicos
    document.getElementById('btnLogout').addEventListener('click', async (e) => {
        e.preventDefault();
        await logoutUser();
    });

    // 3. Evento del Buscador Inteligente
    document.getElementById('btnSearch').addEventListener('click', ejecutarBusqueda);
    document.getElementById('txtSearchDni').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ejecutarBusqueda();
    });

    // 4. Formulario de Guardado Unificado (Alta Inicial)
    document.getElementById('formUnificado').addEventListener('submit', guardarRegistroCompleto);
});

// FUNCIÓN: Buscar de forma inteligente (Universal)
async function ejecutarBusqueda() {
    const termino = document.getElementById('txtSearchDni').value.trim();
    const resultArea = document.getElementById('resultArea');
    
    if (!termino) return;

    resultArea.style.display = 'block';
    resultArea.innerHTML = `<p style="color: var(--text-muted);">Buscando coincidencias de perfiles e incidentes...</p>`;

    const { data, error } = await window.redSupabase.rpc('buscar_adoptante_universal', { search_term: termino });

    if (error) {
        resultArea.innerHTML = `<div class="adoptante-profile-card" style="border: 1px solid var(--danger); color: var(--danger);">Error: ${error.message}</div>`;
        return;
    }

    if (!data || data.length === 0) {
        resultArea.innerHTML = `
            <div class="adoptante-profile-card" style="border-left: 5px solid var(--success); background:#fff; padding:25px; border-radius:12px;">
                <h3 style="color: var(--success); display:flex; align-items:center; gap:8px;"><i data-lucide="check-circle"></i> Limpio / Sin Alertas</h3>
                <p style="margin-top:10px; font-size:14px; color:var(--text-muted);">No se encontraron antecedentes vinculados a "${termino}".</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    resultArea.innerHTML = '';

    data.forEach(adoptante => {
        let historialHTML = '';

        if (adoptante.historial && adoptante.historial.length > 0 && adoptante.historial[0].incidente_id !== null) {
            adoptante.historial.forEach(inc => {
                let colorGravedad = 'var(--text-main)';
                if (inc.gravedad === 'grave') colorGravedad = 'var(--danger)';
                if (inc.gravedad === 'moderado') colorGravedad = 'var(--accent)';

                let archivosHTML = '';
                if (inc.archivos && inc.archivos.length > 0) {
                    inc.archivos.forEach(arc => {
                        archivosHTML += `
                            <a href="${arc.url}" target="_blank" class="file-badge" style="display:inline-flex; align-items:center; gap:5px; background:#f0f4f1; padding:4px 8px; border-radius:6px; font-size:12px; text-decoration:none; color:var(--text-main); margin-top:8px; margin-right:8px; border:1px solid #d1dbd2;">
                                <i data-lucide="file-text" style="width:14px; height:14px;"></i> ${arc.nombre}
                            </a>`;
                    });
                }

                historialHTML += `
                    <div class="timeline-item" style="border-left: 2px solid #e2e8f0; padding-left: 15px; margin-bottom: 15px;">
                        <div style="font-size:12px; color:var(--text-muted);">${new Date(inc.fecha).toLocaleDateString('es-AR')} - Reportado por: <b>${inc.cargado_por || 'Sistema'}</b></div>
                        <div style="color: ${colorGravedad}; font-weight:600; font-size:15px;">${inc.titulo} <small>(${inc.gravedad.toUpperCase()})</small></div>
                        <div style="color:var(--text-muted); font-size:13px; margin-top:3px;">${inc.descripcion}</div>
                        <div>${archivosHTML}</div>
                    </div>
                `;
            });
        } else {
            historialHTML = `<p style="color: var(--text-muted); font-size: 13px;">No tiene incidentes reportados a la fecha.</p>`;
        }

        const modificadoInfo = adoptante.modificado_por 
            ? `<br>• Última edición por: <b>${adoptante.modificado_por}</b> el ${new Date(adoptante.ultima_modificacion).toLocaleString('es-AR')}` 
            : '';

        const tarjeta = document.createElement('div');
        tarjeta.className = 'adoptante-profile-card';
        tarjeta.style.background = '#ffffff';
        tarjeta.style.border = '1px solid var(--border)';
        tarjeta.style.borderRadius = '12px';
        tarjeta.style.padding = '25px';
        tarjeta.style.marginBottom = '20px';

        tarjeta.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h2 style="color: var(--primary);">${adoptante.apellido || ''}, ${adoptante.nombre || 'Perfil sin Nombre'}</h2>
                    <p style="font-size:14px; color:var(--text-muted); margin-top:5px;">
                        DNI: <strong>${adoptante.dni || 'No cargado'}</strong> | 
                        Tel: <strong>${adoptante.telefono || 'No cargado'}</strong><br>
                        Dirección: <strong>${adoptante.direccion || 'No cargada'}</strong>
                    </p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" style="background:#edf2f7; color:var(--text-main); font-size:12px;" onclick="habilitarEdicion('${adoptante.id}', '${adoptante.nombre || ''}', '${adoptante.apellido || ''}', '${adoptante.dni || ''}', '${adoptante.telefono || ''}', '${adoptante.direccion || ''}')"><i data-lucide="edit"></i> Editar Perfil</button>
                    <button class="btn" style="background:var(--danger); color:#fff; font-size:12px;" onclick="habilitarNuevoIncidente('${adoptante.id}')"><i data-lucide="alert-triangle"></i> Sumar Incidente / Alerta</button>
                </div>
            </div>
            
            <div id="editBlock-${adoptante.id}" style="display:none; background:#fdfbf7; padding:15px; border-radius:8px; margin-top:15px; border:1px solid #e1dbcf;">
                <h5 style="color:var(--primary); margin-bottom:10px; font-weight:600;">Modificar Ficha del Adoptante</h5>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <input type="text" id="editNom-${adoptante.id}" placeholder="Nombre">
                    <input type="text" id="editApe-${adoptante.id}" placeholder="Apellido">
                    <input type="text" id="editDni-${adoptante.id}" placeholder="DNI">
                    <input type="text" id="editTel-${adoptante.id}" placeholder="Teléfono">
                    <input type="text" id="editDir-${adoptante.id}" placeholder="Dirección" style="grid-column: span 2;">
                </div>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="btn btn-primary" style="font-size:12px;" onclick="guardarEdicion('${adoptante.id}')">Confirmar Cambios</button>
                    <button class="btn" style="background:#e2e8f0; font-size:12px;" onclick="document.getElementById('editBlock-${adoptante.id}').style.display='none'">Cancelar</button>
                </div>
            </div>

            <div id="incidenteBlock-${adoptante.id}" style="display:none; background:#fff5f5; padding:15px; border-radius:8px; margin-top:15px; border:1px solid #fed7d7;">
                <h5 style="color:var(--danger); margin-bottom:10px; font-weight:600;">Reportar Nueva Infracción sobre este Perfil</h5>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <input type="text" id="newIncTitulo-${adoptante.id}" placeholder="Título del nuevo incidente (ej: Maltrató a un comunitario)">
                    <select id="newIncGravedad-${adoptante.id}">
                        <option value="leve">Leve</option>
                        <option value="moderado">Moderado</option>
                        <option value="grave" selected>Grave</option>
                    </select>
                    <textarea id="newIncDesc-${adoptante.id}" rows="3" placeholder="Detalles de la nueva situación..."></textarea>
                    <input type="file" id="newIncFiles-${adoptante.id}" multiple>
                </div>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="btn" style="background:var(--danger); color:white; font-size:12px;" onclick="guardarNuevoIncidente('${adoptante.id}')">Cargar Alerta a la Línea de Tiempo</button>
                    <button class="btn" style="background:#e2e8f0; font-size:12px;" onclick="document.getElementById('incidenteBlock-${adoptante.id}').style.display='none'">Cancelar</button>
                </div>
            </div>

            <hr style="border:0; border-top:1px solid var(--border); margin:20px 0;">
            <h4 style="margin-bottom:12px; color: var(--text-main); font-size:14px;"><i data-lucide="history"></i> Historial de Alertas Compartidas:</h4>
            <div class="timeline">${historialHTML}</div>
            
            <div style="background:#f7fafc; padding:10px; border-radius:6px; font-size:11px; color:var(--text-muted); margin-top:20px; line-height:1.4;">
                • Registrado originalmente por: <b>${adoptante.creado_por || 'Desconocido'}</b>
                ${modificadoInfo}
            </div>
        `;
        resultArea.appendChild(tarjeta);
    });

    if (window.lucide) lucide.createIcons();
}

// FUNCIÓN: Guardado Unificado Inicial
async function guardarRegistroCompleto(e) {
    e.preventDefault();

    const nombre = document.getElementById('adNombre').value.trim() || null;
    const apellido = document.getElementById('adApellido').value.trim() || null;
    const dni = document.getElementById('adDni').value.trim() || null;
    const telefono = document.getElementById('adTel').value.trim() || null;
    const direccion = document.getElementById('adDireccion').value.trim() || null;

    const incTitulo = document.getElementById('incTitulo').value.trim();
    const incGravedad = document.getElementById('incGravedad').value;
    const incDesc = document.getElementById('incDesc').value.trim();
    const archivosInput = document.getElementById('incArchivo').files;

    if (!nombre && !apellido && !dni && !telefono && !direccion) {
        alert("Por favor, ingresá al menos un parámetro para registrar.");
        return;
    }

    const { data: userAuth } = await window.redSupabase.auth.getUser();

    const { data: adoptante, error: errAd } = await window.redSupabase
        .from('adoptantes')
        .insert([{ dni, nombre, apellido, telefono, direccion, creado_por: userAuth.user.id }])
        .select().single();

    if (errAd) {
        alert("Error al registrar: " + errAd.message);
        return;
    }

    if (incTitulo) {
        const { data: incidente, error: errInc } = await window.redSupabase
            .from('historial_incidentes')
            .insert([{ adoptante_id: adoptante.id, creado_por: userAuth.user.id, titulo: incTitulo, descripcion: incDesc, gravedad: incGravedad }])
            .select().single();

        if (!errInc && archivosInput.length > 0) {
            await subirArchivosEvidencia(incidente.id, archivosInput);
        }
    }

    alert("Ficha guardada con éxito.");
    document.getElementById('formUnificado').reset();
    ejecutarBusqueda();
}

// FUNCIONES DE DESPLIEGUE INTERFAZ
function habilitarEdicion(id, nombre, apellido, dni, tel, dir) {
    document.getElementById(`editBlock-${id}`).style.display = 'block';
    document.getElementById(`incidenteBlock-${id}`).style.display = 'none';
    document.getElementById(`editNom-${id}`).value = nombre;
    document.getElementById(`editApe-${id}`).value = apellido;
    document.getElementById(`editDni-${id}`).value = dni;
    document.getElementById(`editTel-${id}`).value = tel;
    document.getElementById(`editDir-${id}`).value = dir;
}

function habilitarNuevoIncidente(id) {
    document.getElementById(`incidenteBlock-${id}`).style.display = 'block';
    document.getElementById(`editBlock-${id}`).style.display = 'none';
}

// FUNCIÓN: Guardar cambios personales
async function guardarEdicion(id) {
    const nombre = document.getElementById(`editNom-${id}`).value.trim() || null;
    const apellido = document.getElementById(`editApe-${id}`).value.trim() || null;
    const dni = document.getElementById(`editDni-${id}`).value.trim() || null;
    const telefono = document.getElementById(`editTel-${id}`).value.trim() || null;
    const direccion = document.getElementById(`editDir-${id}`).value.trim() || null;

    const { data: userAuth } = await window.redSupabase.auth.getUser();

    const { error } = await window.redSupabase
        .from('adoptantes')
        .update({ nombre, apellido, dni, telefono, direccion, modificado_por: userAuth.user.id, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else { alert("Perfil actualizado."); ejecutarBusqueda(); }
}

// FUNCIÓN CLAVE: Agregar otra incidencia más a la misma persona
async function guardarNuevoIncidente(adoptanteId) {
    const titulo = document.getElementById(`newIncTitulo-${adoptanteId}`).value.trim();
    const gravedad = document.getElementById(`newIncGravedad-${adoptanteId}`).value;
    const descripcion = document.getElementById(`newIncDesc-${adoptanteId}`).value.trim();
    const archivosInput = document.getElementById(`newIncFiles-${adoptanteId}`).files;

    if (!titulo) {
        alert("El incidente necesita al menos un título descriptivo.");
        return;
    }

    const { data: userAuth } = await window.redSupabase.auth.getUser();

    // Guardamos el nuevo incidente asociado a la ID de este adoptante
    const { data: incidente, error: errInc } = await window.redSupabase
        .from('historial_incidentes')
        .insert([{ adoptante_id: adoptanteId, creado_por: userAuth.user.id, titulo, descripcion, gravedad }])
        .select().single();

    if (errInc) {
        alert("Error al añadir incidente: " + errInc.message);
        return;
    }

    if (archivosInput.length > 0) {
        await subirArchivosEvidencia(incidente.id, archivosInput);
    }

    alert("¡Nueva alerta añadida cronológicamente al adoptante!");
    ejecutarBusqueda();
}

// FUNCIÓN AUXILIAR: Subir archivos multimedia
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

// Exponer funciones globales
window.habilitarEdicion = habilitarEdicion;
window.guardarEdicion = guardarEdicion;
window.habilitarNuevoIncidente = habilitarNuevoIncidente;
window.guardarNuevoIncidente = guardarNuevoIncidente;