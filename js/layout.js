// Layout compartido: sidebar, navegación y enlace Cafecito

function escAttr(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const NAV_ITEMS = [
    { id: 'dashboard', href: 'dashboard.html', label: 'Auditoría y Altas', icon: 'home' },
    { id: 'comunidad', href: 'comunidad.html', label: 'Red de Contactos', icon: 'users' },
    { id: 'perfil', href: 'perfil.html', label: 'Mi Perfil', icon: 'user-circle' },
    { id: 'admin', href: 'admin.html', label: 'Panel Admin', icon: 'shield', roles: ['admin', 'moderador'] }
];

function iconSvg(name, size = 18) {
    const icons = {
        home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        'user-circle': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>',
        shield: '<path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z"/><path d="m9 12 2 2 4-4"/>',
        'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
        key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.828-.828A5 5 0 1 0 3.414 7.414l-.828.828z"/><circle cx="17" cy="7" r="1"/>',
        coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>'
    };
    const paths = icons[name] || icons.home;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function renderCafecitoCard(compact = false) {
    const cfg = window.APP_CONFIG || {};
    if (!cfg.CAFECITO_URL) return '';

    const subtitle = compact
        ? ''
        : `<p>${cfg.CAFECITO_SUBTITULO || 'Apoyá el proyecto'}</p>`;

    return `
        <div class="cafecito-card">
            ${subtitle}
            <a href="${cfg.CAFECITO_URL}" target="_blank" rel="noopener noreferrer" class="cafecito-btn">
                ${iconSvg('coffee', 16)}
                ${cfg.CAFECITO_TEXTO || 'Invitame un cafecito'}
            </a>
        </div>`;
}

function renderAuthCafecito() {
    const cfg = window.APP_CONFIG || {};
    if (!cfg.CAFECITO_URL) return '';

    return `
        <div class="cafecito-auth">
            <p>${cfg.CAFECITO_SUBTITULO || 'Si te sirve la red, podés apoyar el proyecto'}</p>
            <a href="${cfg.CAFECITO_URL}" target="_blank" rel="noopener noreferrer" class="cafecito-btn">
                ${iconSvg('coffee', 16)}
                ${cfg.CAFECITO_TEXTO || 'Invitame un cafecito'}
            </a>
        </div>`;
}

function initAppShell(activePage, perfil) {
    document.body.classList.add('app-shell');

    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar || !perfil) return;

    const avatarHtml = perfil.foto_url
        ? `<img src="${escAttr(perfil.foto_url)}" alt="Avatar" class="user-avatar">`
        : `<div class="user-avatar-placeholder">${iconSvg('user-circle', 22)}</div>`;

    const navHtml = NAV_ITEMS
        .filter(item => !item.roles || item.roles.includes(perfil.rol))
        .map(item => `
            <li>
                <a href="${item.href}" class="${activePage === item.id ? 'active' : ''}">
                    ${iconSvg(item.icon)}
                    ${item.label}
                </a>
            </li>`).join('');

    sidebar.innerHTML = `
        <div>
            <div class="brand">
                ${iconSvg('shield', 24)}
                <h2>Red Colaborativa</h2>
            </div>
            <div class="user-info">
                ${avatarHtml}
                <div class="user-info-text">
                    <p id="lblUsuario">${escAttr(perfil.nombre_completo || 'Usuario')}</p>
                    <span id="lblOrganizacion">${escAttr(perfil.organizacion || 'Rescatista independiente')}</span>
                </div>
            </div>
            <ul class="nav-links">${navHtml}</ul>
            ${renderCafecitoCard()}
        </div>
        <ul class="nav-links">
            <li><a href="#" id="btnModalClave">${iconSvg('key')} Cambiar contraseña</a></li>
            <li><a href="#" id="btnLogout" class="btn-logout">${iconSvg('log-out')} Cerrar sesión</a></li>
        </ul>`;

    document.getElementById('btnLogout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await logoutUser();
    });

    document.getElementById('btnModalClave')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const nuevaClave = prompt('Ingresá tu nueva contraseña (mínimo 6 caracteres):');
        if (nuevaClave === null) return;
        if (nuevaClave.trim().length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        await window.actualizarMiContrasena(nuevaClave.trim());
    });
}

window.initAppShell = initAppShell;
window.renderAuthCafecito = renderAuthCafecito;
