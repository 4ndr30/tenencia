// Gestión del perfil del usuario registrado

document.addEventListener('DOMContentLoaded', async () => {
    const perfil = await checkAuth();
    if (!perfil) return;

    initAppShell('perfil', perfil);
    await cargarPerfilEnFormulario(perfil);

    document.getElementById('formPerfil').addEventListener('submit', guardarPerfil);
    document.getElementById('fotoInput').addEventListener('change', previsualizarFoto);
    document.getElementById('btnQuitarFoto').addEventListener('click', quitarFoto);
});

function esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

async function cargarPerfilEnFormulario(perfil) {
    document.getElementById('pfNombre').value = perfil.nombre_completo || '';
    document.getElementById('pfOrganizacion').value = perfil.organizacion || '';
    document.getElementById('pfTelefono').value = perfil.telefono || '';
    document.getElementById('pfEmailContacto').value = perfil.email_contacto || '';
    document.getElementById('pfWhatsapp').value = perfil.whatsapp || '';
    document.getElementById('pfInstagram').value = perfil.instagram || '';
    document.getElementById('pfFacebook').value = perfil.facebook || '';
    document.getElementById('pfSitioWeb').value = perfil.sitio_web || '';
    document.getElementById('pfBio').value = perfil.bio || '';
    document.getElementById('pfPublico').checked = perfil.perfil_publico !== false;

    const { data: { user } } = await window.redSupabase.auth.getUser();
    document.getElementById('pfEmailAuth').value = user?.email || '';

    actualizarPreviewFoto(perfil.foto_url);
}

function actualizarPreviewFoto(url) {
    const img = document.getElementById('avatarPreview');
    const placeholder = document.getElementById('avatarPlaceholder');

    if (url) {
        img.src = url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        document.getElementById('btnQuitarFoto').style.display = 'inline-flex';
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
        document.getElementById('btnQuitarFoto').style.display = 'none';
    }
}

function previsualizarFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no puede superar 2 MB.');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        document.getElementById('avatarPreview').src = ev.target.result;
        document.getElementById('avatarPreview').style.display = 'block';
        document.getElementById('avatarPlaceholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

async function quitarFoto() {
    if (!confirm('¿Querés quitar tu foto de perfil?')) return;

    const { data: { user } } = await window.redSupabase.auth.getUser();
    if (!user) return;

    await window.redSupabase.from('profiles').update({ foto_url: null }).eq('id', user.id);

    document.getElementById('fotoInput').value = '';
    actualizarPreviewFoto(null);
    alert('Foto eliminada.');
}

async function subirFoto(userId) {
    const input = document.getElementById('fotoInput');
    const file = input.files?.[0];
    if (!file) return null;

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await window.redSupabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw new Error('No se pudo subir la foto: ' + uploadError.message);

    const { data: urlData } = window.redSupabase.storage.from('avatars').getPublicUrl(path);
    return urlData.publicUrl + '?t=' + Date.now();
}

async function guardarPerfil(e) {
    e.preventDefault();

    const btn = document.getElementById('btnGuardarPerfil');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const { data: { user } } = await window.redSupabase.auth.getUser();
        if (!user) throw new Error('Sesión no válida');

        let fotoUrl = undefined;
        if (document.getElementById('fotoInput').files?.[0]) {
            fotoUrl = await subirFoto(user.id);
        }

        const payload = {
            nombre_completo: document.getElementById('pfNombre').value.trim() || null,
            organizacion: document.getElementById('pfOrganizacion').value.trim() || null,
            telefono: document.getElementById('pfTelefono').value.trim() || null,
            email_contacto: document.getElementById('pfEmailContacto').value.trim() || null,
            whatsapp: document.getElementById('pfWhatsapp').value.trim() || null,
            instagram: normalizarRed(document.getElementById('pfInstagram').value.trim(), 'instagram'),
            facebook: normalizarRed(document.getElementById('pfFacebook').value.trim(), 'facebook'),
            sitio_web: normalizarUrl(document.getElementById('pfSitioWeb').value.trim()),
            bio: document.getElementById('pfBio').value.trim() || null,
            perfil_publico: document.getElementById('pfPublico').checked
        };

        if (fotoUrl) payload.foto_url = fotoUrl;

        const { error } = await window.redSupabase
            .from('profiles')
            .update(payload)
            .eq('id', user.id);

        if (error) throw error;

        alert('Perfil actualizado correctamente.');
        const { data: perfilActualizado } = await window.redSupabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (perfilActualizado) {
            initAppShell('perfil', perfilActualizado);
            actualizarPreviewFoto(perfilActualizado.foto_url);
        }
    } catch (err) {
        alert(err.message || 'Error al guardar el perfil.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar cambios';
    }
}

function normalizarUrl(val) {
    if (!val) return null;
    if (!/^https?:\/\//i.test(val)) return 'https://' + val;
    return val;
}

function normalizarRed(val, red) {
    if (!val) return null;
    if (/^https?:\/\//i.test(val)) return val;
    if (val.startsWith('@')) val = val.slice(1);
    if (red === 'instagram') return `https://instagram.com/${val}`;
    if (red === 'facebook') return `https://facebook.com/${val}`;
    return val;
}
