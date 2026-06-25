// Directorio de contactos entre miembros de la red

document.addEventListener('DOMContentLoaded', async () => {
    const perfil = await checkAuth();
    if (!perfil) return;

    initAppShell('comunidad', perfil);

    document.getElementById('txtFiltroMiembros').addEventListener('input', debounce(cargarMiembros, 300));
    document.getElementById('btnRefreshMiembros').addEventListener('click', cargarMiembros);

    await cargarMiembros();
});

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

async function cargarMiembros() {
    const grid = document.getElementById('membersGrid');
    const filtro = document.getElementById('txtFiltroMiembros').value.trim().toLowerCase();

    grid.innerHTML = '<div class="empty-state"><p>Cargando miembros...</p></div>';

    const campos = 'id, nombre_completo, organizacion, telefono, email_contacto, whatsapp, instagram, facebook, sitio_web, bio, foto_url, perfil_publico';
    let { data: miembros, error } = await window.redSupabase
        .from('profiles')
        .select(campos)
        .eq('activo', true)
        .eq('perfil_publico', true)
        .order('nombre_completo', { ascending: true });

    if (error) {
        const fallback = await window.redSupabase
            .from('profiles')
            .select('id, nombre_completo, organizacion, telefono')
            .eq('activo', true)
            .order('nombre_completo', { ascending: true });
        if (fallback.error) {
            grid.innerHTML = `<div class="empty-state text-error"><p>Error: ${esc(fallback.error.message)}</p></div>`;
            return;
        }
        miembros = fallback.data;
        error = null;
    }

    let lista = miembros || [];

    if (filtro) {
        lista = lista.filter(m =>
            (m.nombre_completo || '').toLowerCase().includes(filtro) ||
            (m.organizacion || '').toLowerCase().includes(filtro) ||
            (m.bio || '').toLowerCase().includes(filtro)
        );
    }

    document.getElementById('lblTotalMiembros').textContent =
        `${lista.length} miembro${lista.length !== 1 ? 's' : ''} visible${lista.length !== 1 ? 's' : ''} en la red`;

    if (lista.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>No hay miembros que coincidan con tu búsqueda.</p>
                <p class="form-hint">Los contactos son opcionales: cada usuario elige qué compartir en Mi Perfil.</p>
            </div>`;
        return;
    }

    grid.innerHTML = lista.map(renderMemberCard).join('');
}

function renderMemberCard(m) {
    const avatar = m.foto_url
        ? `<img src="${esc(m.foto_url)}" alt="" class="member-card-avatar">`
        : `<div class="member-card-avatar" style="display:flex;align-items:center;justify-content:center;color:var(--primary);font-weight:700;font-size:18px;">${iniciales(m.nombre_completo)}</div>`;

    const links = [];

    if (m.telefono) {
        links.push(`<a href="tel:${esc(m.telefono)}" class="contact-link">📞 ${esc(m.telefono)}</a>`);
    }
    if (m.email_contacto) {
        links.push(`<a href="mailto:${esc(m.email_contacto)}" class="contact-link">✉️ ${esc(m.email_contacto)}</a>`);
    }
    if (m.whatsapp) {
        const wa = m.whatsapp.replace(/\D/g, '');
        links.push(`<a href="https://wa.me/${wa}" target="_blank" rel="noopener" class="contact-link">WhatsApp</a>`);
    }
    if (m.instagram) {
        links.push(`<a href="${esc(m.instagram)}" target="_blank" rel="noopener" class="contact-link">Instagram</a>`);
    }
    if (m.facebook) {
        links.push(`<a href="${esc(m.facebook)}" target="_blank" rel="noopener" class="contact-link">Facebook</a>`);
    }
    if (m.sitio_web) {
        links.push(`<a href="${esc(m.sitio_web)}" target="_blank" rel="noopener" class="contact-link">Sitio web</a>`);
    }

    const bio = m.bio ? `<p class="member-bio">${esc(m.bio)}</p>` : '';
    const contactos = links.length
        ? `<div class="contact-links">${links.join('')}</div>`
        : `<p class="form-hint">Sin datos de contacto públicos cargados.</p>`;

    return `
        <article class="member-card">
            <div class="member-card-header">
                ${avatar}
                <div>
                    <h4>${esc(m.nombre_completo || 'Sin nombre')}</h4>
                    <span>${esc(m.organizacion || 'Organización no indicada')}</span>
                </div>
            </div>
            ${bio}
            ${contactos}
        </article>`;
}

function iniciales(nombre) {
    if (!nombre) return '?';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}
