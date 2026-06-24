// ==========================================
// JS/ADMIN.JS
// Operaciones de moderación global
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    
    // Validar de forma estricta que quien entra tenga rango de 'admin'
    const perfil = await checkAuth('admin');
    if (!perfil) return;

    // Cargar la lista inicial de perfiles
    await cargarMiembros();

    document.getElementById('btnLogout').addEventListener('click', async (e) => {
        e.preventDefault();
        await logoutUser();
    });
});

// FUNCIÓN: Renderizar todos los miembros del sistema
async function cargarMiembros() {
    const tbody = document.getElementById('usersTableBody');
    
    // CAPTURAR EL ID DESTACADO DESDE LA URL (EmailJS link)
    const urlParams = new URLSearchParams(window.location.search);
    const usuarioDestacadoId = urlParams.get('usuario_id');
    
    const { data: perfiles, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .order('nombre_completo', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: var(--danger); text-align: center;">Error al procesar perfiles: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    if (!perfiles || perfiles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: var(--text-muted); text-align: center;">No hay usuarios registrados en el sistema.</td></tr>`;
        return;
    }

    perfiles.forEach(p => {
        const tr = document.createElement('tr');
        
        // Si este usuario es el que viene en el correo, lo resaltamos visualmente
        if (usuarioDestacadoId && p.id === usuarioDestacadoId) {
            tr.style.backgroundColor = '#fffbeb'; // Fondo amarillo muy suave
            tr.style.borderLeft = '4px solid var(--accent)'; // Línea indicadora terracota
        }
        
        // Selector dinámico para cambiar el rol del miembro
        const selectRol = `
            <select class="select-rol" onchange="cambiarRol('${p.id}', this.value)">
                <option value="usuario" ${p.rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                <option value="moderador" ${p.rol === 'moderador' ? 'selected' : ''}>Moderador</option>
                <option value="admin" ${p.rol === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
        `;

        // Botón conmutador para dar de baja o activar cuentas de la red
        const btnEstado = p.activo 
            ? `<button class="btn-status btn-active" onclick="toggleEstado('${p.id}', false)"><i data-lucide="unlock" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> Activo</button>`
            : `<button class="btn-status btn-suspended" onclick="toggleEstado('${p.id}', true)"><i data-lucide="lock" style="width:12px;height:12px;display:inline;vertical-align:middle;"></i> Suspendido</button>`;

        // CORRECCIÓN AQUÍ: Se envolvió el nombre correctamente dentro de un <td>
        tr.innerHTML = `
            <td><strong>${p.nombre_completo}</strong></td>
            <td>${p.organizacion || '<i>No declarada</i>'}</td>
            <td>${p.telefono || '<i>Sin registro</i>'}</td>
            <td>${selectRol}</td>
            <td>${btnEstado}</td>
        `;
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

// ACCIÓN: Modificar Rol en la DB
async function cambiarRol(userId, nuevoRol) {
    const { error } = await window.supabaseClient
        .from('profiles')
        .update({ rol: nuevoRol })
        .eq('id', userId);

    if (error) {
        alert("No se pudo actualizar el rango: " + error.message);
    } else {
        alert("Permisos modificados con éxito.");
    }
}

// ACCIÓN: Suspender / Habilitar cuenta (Modifica campo 'activo')
async function toggleEstado(userId, nuevoEstado) {
    const { error } = await window.supabaseClient
        .from('profiles')
        .update({ activo: nuevoEstado })
        .eq('id', userId);

    if (error) {
        alert("Error de red: " + error.message);
    } else {
        await cargarMiembros();
    }
}

// Exponer las funciones globalmente para los atributos onClick
window.cambiarRol = cambiarRol;
window.toggleEstado = toggleEstado;