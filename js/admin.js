// ==========================================
// JS/ADMIN.JS - COMPLETO Y CORREGIDO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(async () => {
        try {
            const perfil = await checkAuth('admin');
            if (!perfil) return;

            await cargarMiembros();

            document.getElementById('btnLogout').addEventListener('click', async (e) => {
                e.preventDefault();
                await logoutUser();
            });
        } catch (err) {
            console.error("Error al inicializar el panel:", err);
            const tbody = document.getElementById('usersTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="color: red; text-align: center;">Error: ${err.message}</td></tr>`;
            }
        }
    }, 500);
});

async function cargarMiembros() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const urlParams = new URLSearchParams(window.location.search);
    const usuarioDestacadoId = urlParams.get('usuario_id');
    
    const { data: perfiles, error } = await window.redSupabase
        .from('profiles')
        .select('*')
        .order('nombre_completo', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: red; text-align: center;">Error: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    if (!perfiles || perfiles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: gray; text-align: center;">No hay usuarios registrados.</td></tr>`;
        return;
    }

    perfiles.forEach(p => {
        const tr = document.createElement('tr');
        
        if (usuarioDestacadoId && p.id === usuarioDestacadoId) {
            tr.style.backgroundColor = '#fffbeb'; 
            tr.style.borderLeft = '4px solid gold'; 
        }
        
        const selectRol = `
            <select class="select-rol" onchange="cambiarRol('${p.id}', this.value)">
                <option value="usuario" ${p.rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                <option value="moderador" ${p.rol === 'moderador' ? 'selected' : ''}>Moderador</option>
                <option value="admin" ${p.rol === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
        `;

        const btnEstado = p.activo 
            ? `<button class="btn-status btn-active" onclick="toggleEstado('${p.id}', false)">Activo</button>`
            : `<button class="btn-status btn-suspended" onclick="toggleEstado('${p.id}', true)">Suspendido</button>`;

        // CORREGIDO: data-label para responsive y etiquetas td limpias
        tr.innerHTML = `
            <td data-label="Nombre"><strong>${p.nombre_completo}</strong></td>
            <td data-label="Organización">${p.organizacion || '<i>No declarada</i>'}</td>
            <td data-label="Teléfono">${p.telefono || '<i>Sin registro</i>'}</td>
            <td data-label="Rol">${selectRol}</td>
            <td data-label="Estado">${btnEstado}</td>
        `;
        tbody.appendChild(tr);
    });
    
    if (window.lucide) window.lucide.createIcons();
}

async function cambiarRol(userId, nuevoRol) {
    const { error } = await window.redSupabase
        .from('profiles')
        .update({ rol: nuevoRol })
        .eq('id', userId);

    if (error) {
        alert("No se pudo actualizar el rango: " + error.message);
    } else {
        alert("Permisos modificados con éxito.");
        await cargarMiembros();
    }
}

async function toggleEstado(userId, nuevoEstado) {
    try {
        const { error } = await window.redSupabase
            .from('profiles')
            .update({ activo: nuevoEstado })
            .eq('id', userId);

        if (error) {
            alert("Supabase rechazó el cambio: " + error.message);
        } else {
            alert(nuevoEstado ? "Cuenta Activada con éxito." : "Cuenta Suspendida.");
            // Forzamos la recarga manual de la lista para actualizar los botones
            await cargarMiembros(); 
        }
    } catch (e) {
        console.error("Error en toggleEstado:", e);
    }
}

window.cambiarRol = cambiarRol;
window.toggleEstado = toggleEstado;