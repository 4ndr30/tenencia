/* ==========================================================================
   ADMIN.JS - REFACTURADO Y CORREGIDO
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            const perfil = await checkAuth();
            if (!perfil) return;
            if (perfil.rol !== 'admin' && perfil.rol !== 'moderador') {
                window.location.href = 'dashboard.html';
                return;
            }

            initAppShell('admin', perfil);
            await cargarMiembros();
        } catch (err) {
            console.error('Error al inicializar el panel:', err);
        }
    }, 300);
});

async function cargarMiembros() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

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
        
        const selectRol = `
            <select class="select-rol" onchange="window.cambiarRol('${p.id}', this.value)">
                <option value="usuario" ${p.rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                <option value="moderador" ${p.rol === 'moderador' ? 'selected' : ''}>Moderador</option>
                <option value="admin" ${p.rol === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
        `;

        // Botón con llamada explícita a window.toggleEstado para asegurar ejecución
        const btnEstado = p.activo 
            ? `<button class="btn-status btn-active" onclick="window.toggleEstado('${p.id}', false)">Activo</button>`
            : `<button class="btn-status btn-suspended" onclick="window.toggleEstado('${p.id}', true)">Suspendido</button>`;

        // Estructura de celdas con data-label para el responsive
        tr.innerHTML = `
            <td data-label="Nombre"><strong>${p.nombre_completo || 'Sin nombre'}</strong></td>
            <td data-label="Organización">${p.organizacion || '<i>N/A</i>'}</td>
            <td data-label="Teléfono">${p.telefono || '<i>N/A</i>'}</td>
            <td data-label="Rol">${selectRol}</td>
            <td data-label="Estado">${btnEstado}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function cambiarRol(userId, nuevoRol) {
    const { error } = await window.redSupabase
        .from('profiles')
        .update({ rol: nuevoRol })
        .eq('id', userId);

    if (error) {
        alert("No se pudo actualizar el rango: " + error.message);
    } else {
        alert("Permisos modificados.");
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
            alert("Error: " + error.message);
        } else {
            alert(nuevoEstado ? "Cuenta Activada." : "Cuenta Suspendida.");
            await cargarMiembros();
        }
    } catch (e) {
        console.error("Error en toggleEstado:", e);
    }
}

// Exposición global para que el HTML los encuentre
window.cambiarRol = cambiarRol;
window.toggleEstado = toggleEstado;