// ==========================================
// JS/AUTH.JS - CON CREDENCIALES EMAILJS (CORREGIDO)
// ==========================================

// 1. Iniciar sesión (Usa la variable global única window.redSupabase)
async function loginUser(email, password) {
    const { data, error } = await window.redSupabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    return { data, error };
}

// 2. Registrar usuario + Alerta automática al Administrador por EmailJS
async function registerUser(userData) {
    try {
        // A. Registramos al usuario en la autenticación de Supabase pasándole los metadatos exactos
        const { data, error } = await window.redSupabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    nombre_completo: userData.nombre, // Mapea 'nombre' a 'nombre_completo' para el Trigger
                    organizacion: userData.organizacion,
                    telefono: userData.telefono
                }
            }
        });

        // Si hubo un error en Supabase (ej: contraseña corta, mail ya registrado), lo cortamos acá
        if (error) {
            return { data, error };
        }

        // B. Si el registro en Supabase fue exitoso, disparamos la alerta al Admin vía EmailJS
        if (data && data.user) {
            try {
                // Construimos la URL inteligente hacia tu panel de administración localizándolo con el ID del usuario
                const urlGestionAdmin = `${window.location.origin}/admin.html?usuario_id=${data.user.id}`;

                // Mapeamos las variables exactamente como las configuraste en tu plantilla de EmailJS
                const templateParams = {
                    nuevo_nombre: userData.nombre,
                    nuevo_email: userData.email,
                    nueva_organizacion: userData.organizacion || "No especificada",
                    nuevo_telefono: userData.telefono || "No especificado",
                    enlace_aprobacion: urlGestionAdmin
                };

                // Credenciales asignadas de tu cuenta EmailJS
                const SERVICE_ID = 'service_podqhnk'; 
                const TEMPLATE_ID = 'template_djsa7nr';
                const PUBLIC_KEY = '4lUPQo1047qOFaEAC'; 

                // Ejecutamos el envío asincrónico
                if (window.emailjs) {
                    // Pasamos explícitamente la PUBLIC_KEY en el send para blindar el envío de fallos de inicialización
                    await window.emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
                    console.log("Alerta de auditoría enviada al administrador exitosamente.");
                } else {
                    console.warn("Librería EmailJS no detectada en el HTML. Revisar imports.");
                }

            } catch (emailError) {
                console.error("Error crítico al intentar despachar el email de notificación:", emailError);
            }
        }

        return { data, error: null };

    } catch (error) {
        console.error("Error general en registerUser:", error.message);
        return { data: null, error };
    }
}

// 3. Cerrar sesión
async function logoutUser() {
    await window.redSupabase.auth.signOut();
    window.location.href = 'index.html';
}

// 4. Proteger vistas y obtener perfil actual
async function checkAuth(requiredRole = null) {
    const { data: { session } } = await window.redSupabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: profile, error } = await window.redSupabase.from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !profile || !profile.activo) {
        await window.redSupabase.auth.signOut();
        window.location.href = 'index.html';
        return null;
    }

    if (requiredRole && profile.rol !== requiredRole) {
        window.location.href = 'dashboard.html';
        return null;
    }

    return profile;
}