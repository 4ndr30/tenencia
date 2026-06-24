// ==========================================
// JS/SUPABASE.JS
// ==========================================
const PROYECTO_URL = "https://cttdheloasvlpwmxosgv.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dGRoZWxvYXN2bHB3bXhvc2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDMxOTcsImV4cCI6MjA5Nzc3OTE5N30.oC7JU3mC148Ua63dQhqDx_7mAUYywq0AB_zHK9fojuI"; 

// Inicializamos el cliente usando la librería global de la CDN
const clienteCreado = supabase.createClient(PROYECTO_URL, ANON_KEY);

// Guardamos la conexión en una variable global única que NO choque con nada
window.redSupabase = clienteCreado;